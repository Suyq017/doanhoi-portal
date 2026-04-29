import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainConfig } from '../config/langchain.config';
import { CTXH_AGENT_PROMPT } from '../prompts/ctxh-agent.prompt';
import {
  AGENT_TOOLS,
  AGENT_TOOL_NAMES,
  SearchCtxhActivitiesArgs,
  RegisterActivityArgs,
} from '../tools/agent-tools';
import { MetadataFilters } from '../dto/filter-extraction.dto';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SearchMode = 'filtered' | 'semantic' | 'diverse' | 'list_all';

export interface AgentSearchParams {
  /** Standalone rewritten question for vector search */
  rewrittenQuestion: string;
  status?: ('ongoing' | 'upcoming' | 'ended')[];
  /** ISO YYYY-MM-DD */
  dateFrom?: string;
  /** ISO YYYY-MM-DD */
  dateTo?: string;
  organizationName?: string;
  location?: string;
  mode: SearchMode;
}

export interface AgentRegisterParams {
  /** Context describing the activity the student wants to join */
  activityContext: string;
  activityId?: number;
}

export type AgentDecision =
  | { action: 'search'; params: AgentSearchParams }
  | { action: 'register'; params: AgentRegisterParams }
  | { action: 'greeting' }
  | { action: 'out_of_scope' };

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Unified CTXH agent service.
 *
 * Replaces three separate LLM calls (router + filter extraction + tool selection)
 * with a SINGLE tool-calling invocation. The LLM decides:
 *   - What to do (which tool to call) — intent is implicit in the tool choice
 *   - How to search (mode parameter)
 *   - What filters to apply (parameters it fills by semantic reasoning)
 *
 * Reduces per-message LLM calls from 3 → 1 (plus the final generation call).
 */
@Injectable()
export class CtxhAgentService implements OnModuleInit {
  private readonly logger = new Logger(CtxhAgentService.name);
  private llm: BaseChatModel;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.llm = LangChainConfig.getLLM(this.configService);
      this.initialized = true;

      const modelType = LangChainConfig.isUsingLocalLLM(this.configService)
        ? 'Ollama'
        : 'Gemini';
      this.logger.log(`✅ CTXH Agent service initialized (${modelType})`);
    } catch (error) {
      this.logger.error('Failed to initialize CTXH agent service', error);
      throw error;
    }
  }

  /**
   * Single unified agent call.
   *
   * Binds all CTXH agent tools to the LLM and invokes the agent prompt.
   * The LLM picks exactly one tool and fills its parameters freely.
   *
   * @returns AgentDecision — caller branches on `decision.action`
   */
  async decide(
    question: string,
    chatHistory: string,
    currentDate: string,
  ): Promise<AgentDecision> {
    if (!this.initialized) await this.initialize();

    try {
      const llmWithTools = this.llm.bindTools([...AGENT_TOOLS]);
      const chain = CTXH_AGENT_PROMPT.pipe(llmWithTools);

      const result = await chain.invoke({
        question,
        chat_history: chatHistory,
        current_date: currentDate,
      });

      const toolCalls = (result as any).tool_calls as
        | Array<{ name: string; args: Record<string, any> }>
        | undefined;

      const call = toolCalls?.[0];

      if (!call) {
        this.logger.warn('[Agent] No tool call returned — defaulting to semantic search');
        return { action: 'search', params: { rewrittenQuestion: question, mode: 'semantic' } };
      }

      this.logger.debug(`[Agent] Tool: ${call.name} | args: ${JSON.stringify(call.args)}`);

      return this.parseToolCall(call.name, call.args, question);
    } catch (error: any) {
      this.logger.warn(
        `[Agent] decide() failed (${error?.message}) — defaulting to semantic search`,
      );
      return { action: 'search', params: { rewrittenQuestion: question, mode: 'semantic' } };
    }
  }

  // ---------------------------------------------------------------------------
  // Conversion helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts AgentSearchParams to the legacy MetadataFilters shape so that
   * McpSqlFallbackService methods (which accept MetadataFilters) work unchanged.
   */
  toMetadataFilters(params: AgentSearchParams): MetadataFilters {
    const filters: MetadataFilters = {};

    if (params.status?.length) {
      filters.status = params.status;
    }

    if (params.organizationName) {
      filters.organizationKeywords = expandOrgKeywords(params.organizationName);
    }

    if (params.location) {
      filters.locationRaw = [params.location];
    }

    if (params.dateFrom || params.dateTo) {
      filters.dateRange = {
        ...(params.dateFrom && { startDate: params.dateFrom }),
        ...(params.dateTo && { endDate: params.dateTo }),
      };
    }

    return filters;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private parseToolCall(
    toolName: string,
    args: Record<string, any>,
    fallbackQuestion: string,
  ): AgentDecision {
    switch (toolName) {
      case AGENT_TOOL_NAMES.SEARCH: {
        const a = args as Partial<SearchCtxhActivitiesArgs>;
        return {
          action: 'search',
          params: {
            rewrittenQuestion: a.query ?? fallbackQuestion,
            status: a.status,
            dateFrom: a.dateFrom,
            dateTo: a.dateTo,
            organizationName: a.organizationName,
            location: a.location,
            mode: a.mode ?? 'semantic',
          },
        };
      }

      case AGENT_TOOL_NAMES.REGISTER: {
        const a = args as Partial<RegisterActivityArgs>;
        return {
          action: 'register',
          params: {
            activityContext: a.activityContext ?? fallbackQuestion,
            activityId: a.activityId,
          },
        };
      }

      case AGENT_TOOL_NAMES.RESPOND: {
        return args.type === 'greeting'
          ? { action: 'greeting' }
          : { action: 'out_of_scope' };
      }

      default:
        this.logger.warn(`[Agent] Unknown tool name: ${toolName} — defaulting to search`);
        return {
          action: 'search',
          params: { rewrittenQuestion: fallbackQuestion, mode: 'semantic' },
        };
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

/**
 * Strips common Vietnamese org-type prefix words ("khoa", "ban", "phòng", …)
 * and returns BOTH the original and the stripped variant so that ILIKE can
 * match either form stored in the DB.
 *
 * Examples:
 *   "khoa Máy tính"  → ["khoa Máy tính", "Máy tính"]
 *   "phòng Đào tạo"  → ["phòng Đào tạo", "Đào tạo"]
 *   "Đoàn trường"    → ["Đoàn trường"]  (no stripping — no matching prefix)
 *   "Hội Sinh viên"  → ["Hội Sinh viên"] (no stripping)
 */
const ORG_PREFIX_WORDS = [
  'bộ môn',     // 2-word prefix first
  'trung tâm',
  'câu lạc bộ',
  'liên chi hội',
  'chi hội',
  'khoa',
  'ban',
  'phòng',
  'clb',
];

export function expandOrgKeywords(raw: string): string[] {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  for (const prefix of ORG_PREFIX_WORDS) {
    if (lower.startsWith(prefix + ' ') && lower.length > prefix.length + 1) {
      const stripped = trimmed.slice(prefix.length + 1); // preserve original case
      return Array.from(new Set([trimmed, stripped]));
    }
  }

  return [trimmed];
}
