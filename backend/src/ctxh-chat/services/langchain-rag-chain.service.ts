import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainVectorStoreService } from './langchain-vector-store.service';
import { LangChainMemoryService, MentionedActivity } from './langchain-memory.service';
import { LangChainConfig } from '../config/langchain.config';
import { CTXH_RAG_PROMPT } from '../prompts/ctxh-chat.prompts';
import { RETRIEVAL_VERIFIER_PROMPT } from '../prompts/retrieval-verifier.prompt';
import { VerifierOutputSchema } from '../dto/verifier-output.dto';
import { ActivityStatus } from '@/entities/ctxh-activity.entity';
import { McpSqlFallbackService, StatusHint } from './mcp-sql-fallback.service';
import { McpMetadataEnricherService } from './mcp-metadata-enricher.service';
import { CtxhAgentService, AgentSearchParams, AgentRegisterParams } from './ctxh-agent.service';

/**
 * RAG Response structure
 */
export interface RAGResponse {
  response: string;
  sources: Document[];
  responseTime: number;
  sessionId?: string;
  /** Intent detected by the agent — useful for debugging and analytics */
  intent?: 'RAG_QUERY' | 'GREETING' | 'CHITCHAT' | 'REGISTER_ACTIVITY';
  /** Set when intent is REGISTER_ACTIVITY and target activity is found */
  registrationTarget?: {
    activityId: string | number;
    activityName: string;
  };
}

/**
 * RAG Chain options
 */
export interface RAGChainOptions {
  k?: number;
  useMMR?: boolean;
  includeHistory?: boolean;
  currentDate?: string;       // YYYY-MM-DD, e.g. "2026-03-01"
  currentDayOfWeek?: string;  // e.g. "Thứ Bảy"
  currentDatetime?: string;   // e.g. "01/03/2026, 14:30"
  userOrg?: string;           // Optional organization string, e.g. "Khoa Máy tính"
  userId?: string;            // Used by controller for registration context
  /** Called once with retrieved sources before LLM streaming begins */
  onSources?: (sources: Document[]) => void;
}

/** Polite rejection for truly off-topic requests (CHITCHAT) */
const CHITCHAT_REJECTION =
  'Xin lỗi, tôi chỉ hỗ trợ câu hỏi về hoạt động Công tác xã hội tại Trường Đại học Bách khoa - Đại học Quốc gia TP.HCM.';

/** Friendly greeting response for GREETING intent */
const GREETING_RESPONSE = [
  'Xin chào bạn! Tôi là trợ lý ảo chuyên tư vấn về các hoạt động **Công tác Xã hội (CTXH)** tại Đại học Bách Khoa TP.HCM.',
  '',
  'Tôi có thể giúp bạn:',
  '\n- **Tìm kiếm hoạt động CTXH** theo thời gian, địa điểm, danh mục (hiến máu, tình nguyện, hội trại,...)',
  '\n- **Tra cứu thông tin chi tiết**: thời gian, địa điểm, số ngày CTXH được tính',
  '\n- **Tìm hoạt động theo tổ chức/khoa** (ví dụ: hoạt động của Liên chi đoàn Khoa Khoa học và Kỹ thuật máy tính)',
  '\n- **Kiểm tra trạng thái**: đang mở đăng ký, đã kết thúc',
  '\n- **Tự động gửi đăng ký hoạt động**: khi bạn hỏi về một hoạt động đang tuyển thành viên, tôi sẽ đề xuất đăng ký giúp bạn',
  '',
  '\nHãy đặt câu hỏi cho tôi nhé!',
].join('\n');

/**
 * LangChain RAG Chain Service
 * Core RAG implementation using LangChain.js
 * Supports both Ollama (local) and Gemini (cloud) LLMs
 */
@Injectable()
export class LangChainRagChainService implements OnModuleInit {
  private readonly logger = new Logger(LangChainRagChainService.name);
  private llm: BaseChatModel;
  private ragChain: RunnableSequence;
  private initialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly vectorStoreService: LangChainVectorStoreService,
    private readonly memoryService: LangChainMemoryService,
    private readonly agentService: CtxhAgentService,
    private readonly mcpFallbackService: McpSqlFallbackService,
    private readonly mcpEnricher: McpMetadataEnricherService,
  ) {}

  async onModuleInit() {
    await this.initializeChains();
  }

  /**
   * Initialize RAG chains
   */
  async initializeChains(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.log('Initializing LangChain RAG chains...');

      // Initialize LLM (supports both Ollama and Gemini)
      this.llm = LangChainConfig.getLLM(this.configService);
      
      const modelType = LangChainConfig.isUsingLocalLLM(this.configService) ? 'Ollama' : 'Gemini';
      this.logger.log(`Using ${modelType} LLM for RAG chain`);

      // Ensure vector store is ready
      if (!this.vectorStoreService.isInitialized()) {
        await this.vectorStoreService.initialize();
      }

      // Build main RAG chain
      this.ragChain = this.buildRAGChain();
      // Router Agent runs per-request via routeQuestion() — no chain to pre-build.

      this.initialized = true;
      this.logger.log('LangChain RAG chains initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RAG chains', error);
      throw error;
    }
  }

  /**
   * Build the main RAG chain
   */
  private buildRAGChain(): RunnableSequence {
    return RunnableSequence.from([
      CTXH_RAG_PROMPT,
      this.llm,
      new StringOutputParser(),
    ]);
  }

  /**
   * Execute a search based on the agent's decision.
   *
   * Replaces three separate steps (router → filter extraction → tool selection)
   * with a single dispatch on the mode the LLM already chose.
   *
   * Org-injection: if the agent did NOT extract an org AND userOrg is available,
   * inject it and run a parallel broad search so faculty-level + school-wide results
   * are both included.
   */
  private async executeSearchDecision(
    params: AgentSearchParams,
    currentDate: string,
    topK: number,
    userOrg?: string,
  ): Promise<Document[]> {
    const { rewrittenQuestion, mode } = params;

    // ── list_all: pure SQL, no embedding needed ──────────────────────────────
    if (mode === 'list_all') {
      const statusHint = this.statusHintFromParams(params);
      const rawJson = await this.mcpFallbackService.listActivities(statusHint, params.organizationName, topK);
      try {
        const parsed = JSON.parse(rawJson);
        if (parsed.found > 0) {
          return (parsed.activities as any[]).map(
            (a) =>
              new Document({
                pageContent: [a.name, a.organization, a.category, a.location]
                  .filter(Boolean)
                  .join(' — '),
                metadata: {
                  activityName: a.name,
                  status: a.status,
                  startDate: a.start_date,
                  endDate: a.end_date,
                  location: a.location,
                  totalDays: a.total_days,
                  organizationName: a.organization,
                  categoryName: a.category,
                  requiresApproval: a.requires_approval,
                  maxParticipants: a.max_participants,
                  source: 'list_activities_sql',
                },
              }),
          );
        }
      } catch {}
      return [];
    }

    // ── diverse: MMR for variety ─────────────────────────────────────────────
    if (mode === 'diverse') {
      return this.vectorStoreService.maxMarginalRelevanceSearch(
        rewrittenQuestion,
        { k: topK, fetchK: topK * 4, lambda: 0.5 },
      );
    }

    // ── semantic: pure embedding similarity, no filters ──────────────────────
    if (mode === 'semantic') {
      return this.vectorStoreService.similaritySearchWithDateFilter(
        rewrittenQuestion,
        topK,
        currentDate,
        'all',
      );
    }

    // ── filtered: SQL-constrained pgvector search ─────────────────────────────
    // Convert AgentSearchParams to MetadataFilters for MCP compatibility.
    let filters = this.agentService.toMetadataFilters(params);

    // Org injection: if agent did not extract an org AND userOrg is provided,
    // inject user's department to scope results to their faculty.
    const orgInjected = !params.organizationName && !!userOrg;
    if (orgInjected) {
      filters = { ...filters, organizationKeywords: [userOrg!] };
      this.logger.debug(`[OrgFilter] Injected user dept: "${userOrg}"`);
    }

    this.logger.debug(`[Agent] Executing filtered search, filters: ${JSON.stringify(filters)}`);

    const activityIds = await this.mcpFallbackService.queryEmbeddingActivityIds(
      filters,
      currentDate,
    );

    let docs: Document[];
    if (activityIds === null) {
      // MCP returned null (filters empty or disconnected) → semantic fallback
      docs = await this.vectorStoreService.similaritySearchWithDateFilter(
        rewrittenQuestion,
        topK,
        currentDate,
        'all',
      );
    } else {
      docs = await this.vectorStoreService.similaritySearchConstrainedByIds(
        rewrittenQuestion,
        activityIds,
        topK,
        currentDate,
      );
    }

    // Parallel broad-search & merge when org was auto-injected
    if (orgInjected) {
      const filtersWithoutOrg = { ...filters, organizationKeywords: [] };
      const broadIds = await this.mcpFallbackService.queryEmbeddingActivityIds(
        filtersWithoutOrg,
        currentDate,
      );
      const broadDocs = broadIds !== null
        ? await this.vectorStoreService.similaritySearchConstrainedByIds(
            rewrittenQuestion,
            broadIds,
            topK,
            currentDate,
          )
        : await this.vectorStoreService.similaritySearchWithDateFilter(
            rewrittenQuestion,
            topK,
            currentDate,
            'all',
          );

      const seenIds = new Set(docs.map(d => d.metadata?.activityId).filter(Boolean));
      const newDocs = broadDocs.filter(d => !seenIds.has(d.metadata?.activityId));
      const orgCount = docs.length;
      docs = [...docs, ...newDocs].slice(0, topK);

      this.logger.debug(
        `[OrgFilter] Merge: ${orgCount} org-specific + ${newDocs.length} broad → total ${docs.length}`,
      );
    }

    return docs;
  }

  /**
   * Retrieve-Then-Verify: wraps executeSearchDecision() with an LLM-driven fallback.
   *

   * Strategy:
   *  - Sufficient (docs.length > 0) : pass-through, no extra LLM call
   *  - Zero-result                  : parallel Verifier LLM + MCP SQL fallback → merge

   */
  private async retrieveDocumentsWithVerification(
    searchParams: AgentSearchParams,
    currentDate: string,
    topK: number,
    userOrg?: string,
    userId?: string,
  ): Promise<Document[]> {
    // Pre-fetch enrolled IDs once
    const enrolledIds = userId
      ? await this.mcpFallbackService.queryEnrolledActivityIds(userId)
      : new Set<string>();

    const filterEnrolled = (d: Document) =>
      enrolledIds.size === 0 || !enrolledIds.has(String(d.metadata?.activityId));

    const docs = await this.executeSearchDecision(searchParams, currentDate, topK, userOrg);

    if (docs.length > 0) {
      const filtered = docs.filter(filterEnrolled);
      this.logger.debug(
        `[Verifier] Primary retrieval returned ${docs.length} docs (${docs.length - filtered.length} enrolled excluded) — skipping verification`,
      );
      return filtered;
    }

    // Zero-result: run parallel Verifier LLM + MCP SQL fallback
    this.logger.warn(
      `[Verifier+MCP] Primary retrieval 0 docs — running parallel fallback for "${searchParams.rewrittenQuestion.slice(0, 60)}…"`,
    );

    const statusHint = this.statusHintFromParams(searchParams);
    const fallbackFilters = this.agentService.toMetadataFilters(searchParams);

    const [verifierResult, mcpResult] = await Promise.allSettled([
      this.runVerifierFallback(searchParams.rewrittenQuestion, currentDate, topK),
      this.mcpFallbackService.fallbackSearch(statusHint, topK, currentDate, fallbackFilters),
    ]);

    const verifierDocs = verifierResult.status === 'fulfilled' ? verifierResult.value : [];
    const mcpDocs      = mcpResult.status === 'fulfilled'      ? mcpResult.value      : [];

    // Merge: MCP SQL (deterministic) takes priority
    const seenIds = new Set<string>();
    const merged: Document[] = [];

    for (const doc of mcpDocs) {
      const id = doc.metadata?.activityId;
      if (id && !seenIds.has(String(id))) {
        seenIds.add(String(id));
        merged.push(doc);
      }
    }

    for (const doc of verifierDocs) {
      const id = doc.metadata?.activityId;
      if (!id || !seenIds.has(String(id))) {
        if (id) seenIds.add(String(id));
        merged.push(doc);
      }
    }

    this.logger.debug(
      `[Verifier+MCP] Merged: ${mcpDocs.length} MCP + ${verifierDocs.length} verifier → ${merged.length} total`,
    );

    return merged.filter(filterEnrolled).slice(0, topK);
  }

  /** Verifier LLM rewrite fallback. */
  private async runVerifierFallback(
    question: string,
    currentDate: string,
    topK: number,
  ): Promise<Document[]> {
    try {
      const structuredLlm = this.llm.withStructuredOutput(VerifierOutputSchema, {
        name: 'verify_retrieval',
      });

      const verifierResult = await RETRIEVAL_VERIFIER_PROMPT.pipe(structuredLlm).invoke({
        question,
      });

      this.logger.debug(
        `[Verifier] verdict=${verifierResult.verdict} | supplementQuery="${verifierResult.supplementQuery}"`,
      );

      if (verifierResult.verdict === 'NEEDS_SUPPLEMENT' && verifierResult.supplementQuery) {
        return this.vectorStoreService.similaritySearchWithDateFilter(
          verifierResult.supplementQuery,
          topK,
          currentDate,
          'all',
        );
      }
    } catch (error) {
      this.logger.warn(`[Verifier] LLM failed: ${error?.message}`);
    }
    return [];
  }

  /**
   * Derive a StatusHint for MCP fallback from AgentSearchParams.
   * Replaces the old regex-based inferStatusFromQuestion().
   */
  private statusHintFromParams(params: AgentSearchParams): StatusHint {
    if (!params.status?.length) return 'all';
    if (params.status.includes('upcoming') && !params.status.includes('ongoing')) return 'upcoming';
    if (params.status.includes('ongoing') && !params.status.includes('upcoming')) return 'ongoing';
    return 'all';
  }

  /**
   * Map AgentDecision.action to the legacy RAGResponse intent strings
   * for backwards compatibility with the controller and downstream consumers.
   */
  private decisionToIntent(action: string): RAGResponse['intent'] {
    switch (action) {
      case 'search':   return 'RAG_QUERY';
      case 'register': return 'REGISTER_ACTIVITY';
      case 'greeting': return 'GREETING';
      default:         return 'CHITCHAT';
    }
  }

  private async routeQuestion(question: string, chatHistory: string, currentDate: string) {
    const decision = await this.agentService.decide(question, chatHistory, currentDate);

    const params = (decision as any).params ?? { rewrittenQuestion: question, mode: 'filtered' };

    return {
      action: decision.action,
      intent: this.decisionToIntent(decision.action),
      params,
      rewrittenQuestion: params.rewrittenQuestion ?? question,
    };
  }

  private normalizeActivityStatus(status: unknown): ActivityStatus | undefined {
    if (!status || typeof status !== 'string') {
      return undefined;
    }

    const normalized = status.toUpperCase();
    if (Object.values(ActivityStatus).includes(normalized as ActivityStatus)) {
      return normalized as ActivityStatus;
    }

    return undefined;
  }

  /**
   * Invoke RAG chain with a question
   */
  async invoke(
    question: string,
    sessionId?: string,
    options: RAGChainOptions = {},
  ): Promise<RAGResponse> {
    if (!this.initialized) {
      await this.initializeChains();
    }

    const startTime = Date.now();
    const {
      k = 5,
      useMMR = false,
      includeHistory = true,
      currentDate = new Date().toISOString().split('T')[0],
      currentDayOfWeek = new Date().toLocaleDateString('vi-VN', { weekday: 'long' }),
      currentDatetime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      userOrg,
      userId,
    } = options;

    try {
      // ── Step 1: Load chat history ──────────────────────────────────────────
      let chatHistory = '';
      if (sessionId && includeHistory) {
        chatHistory = await this.memoryService.getFormattedHistory(sessionId);
      }

      // ── Step 2: Agent Decision — intent + search params in one call ──────────
      const decision = await this.routeQuestion(question, chatHistory, currentDate);
      const intent = this.decisionToIntent(decision.action);

      // ── Step 2.5: Pending registration override ───────────────────────────────
      // If there is a pending registration confirmation in memory, route directly to
      // handleRegistrationIntent so the user's "có"/"không" reply is handled correctly,
      // regardless of how the LLM classified the message (it often returns out_of_scope
      // for short replies like "không").
      if (sessionId && this.memoryService.getPendingRegistration(sessionId)) {
        this.logger.debug('[Agent] Pending registration detected — overriding to REGISTER_ACTIVITY');
        const registrationResult = await this.handleRegistrationIntent(
          question,
          { activityContext: question },
          sessionId, currentDate, k, startTime, userOrg,
        );
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, registrationResult.response);
        }
        return registrationResult;
      }

      // ── Step 3: GREETING ──────────────────────────────────────────────────────
      if (decision.action === 'greeting') {
        this.logger.debug('[Agent] GREETING — returning intro response');
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, GREETING_RESPONSE);
        }
        return {
          response: GREETING_RESPONSE,
          sources: [],
          responseTime: Date.now() - startTime,
          sessionId,
          intent,
        };
      }

      // ── Step 4: CHITCHAT early-exit ───────────────────────────────────────────
      if (decision.action === 'out_of_scope') {
        this.logger.debug('[Agent] CHITCHAT — skipping retrieval');
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, CHITCHAT_REJECTION);
        }
        return {
          response: CHITCHAT_REJECTION,
          sources: [],
          responseTime: Date.now() - startTime,
          sessionId,
          intent,
        };
      }

      // ── Step 4.5: REGISTER_ACTIVITY ───────────────────────────────────────────
      if (decision.action === 'register') {
        this.logger.debug('[Agent] REGISTER_ACTIVITY — looking up activity');
        const registrationResult = await this.handleRegistrationIntent(
          question, decision.params, sessionId, currentDate, k, startTime, userOrg,
        );
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, registrationResult.response);
        }
        return registrationResult;
      }

      // ── Step 5: Retrieve documents (search) ────────────────────────────────
      const sources = await this.retrieveDocumentsWithVerification(decision.params, currentDate, k, userOrg, userId);

      // ── Step 6: Format context ─────────────────────────────────────────────
      const enrichedSources = await this.mcpEnricher.enrichDocuments(sources);
      const formattedContext = this.formatDocumentsAsContext(enrichedSources, currentDate);

      const userOrgInstruction = userOrg
        ? `\nNếu người dùng thuộc tổ chức "${userOrg}", hãy ưu tiên đề cập các hoạt động của tổ chức này lên trên cùng nếu có trong context.`
        : '';

      // ── Step 7: Generate response ──────────────────────────────────────────
      let response = await this.ragChain.invoke({
        question: decision.params.rewrittenQuestion,
        chat_history: chatHistory,
        context: formattedContext,
        current_date: currentDate,
        current_day_of_week: currentDayOfWeek,
        current_datetime: currentDatetime,
        user_org_instruction: userOrgInstruction,
      });

      // ── Step 8: Post-process — track activities + suggest registration ──
      const allActivities = this.extractActivitiesFromDocs(sources, currentDate);
      if (sessionId && allActivities.length > 0) {
        this.memoryService.setMentionedActivities(sessionId, allActivities);
      }

      // If query resolved to a single activity that is still recruiting -> suggest
      const distinctActivityIds = new Set(
        sources.map(d => d.metadata?.activityId).filter(Boolean),
      );
      const recruitingActivity = allActivities.find(a => a.isRecruiting);
      if (distinctActivityIds.size === 1 && recruitingActivity) {
        response += `\n\n---\nBạn có muốn tôi đăng ký bạn vào hoạt động **${recruitingActivity.activityName}** không?`;
      }

      // Save interaction to memory
      if (sessionId) {
        await this.memoryService.saveInteraction(sessionId, question, response);
      }

      return {
        response,
        sources,
        responseTime: Date.now() - startTime,
        sessionId,
        intent,
      };
    } catch (error) {
      this.logger.error('RAG chain invocation failed', error);
      throw error;
    }
  }

  /**
   * Stream RAG response
   */
  async *stream(
    question: string,
    sessionId?: string,
    options: RAGChainOptions = {},
  ): AsyncGenerator<string, void, unknown> {
    if (!this.initialized) {
      await this.initializeChains();
    }

    const {
      k = 5,
      useMMR = false,
      includeHistory = true,
      currentDate = new Date().toISOString().split('T')[0],
      currentDayOfWeek = new Date().toLocaleDateString('vi-VN', { weekday: 'long' }),
      currentDatetime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      userOrg,
      userId,
    } = options;

    try {
      // ── Step 1: Load chat history ──────────────────────────────────────────
      let chatHistory = '';
      if (sessionId && includeHistory) {
        chatHistory = await this.memoryService.getFormattedHistory(sessionId);
      }

      // ── Step 2: Agent Decision — intent + search params in one call ──────────
      const decision = await this.routeQuestion(question, chatHistory, currentDate);
      const intent = this.decisionToIntent(decision.action);

      // ── Step 2.5: Pending registration override ───────────────────────────────
      if (sessionId && this.memoryService.getPendingRegistration(sessionId)) {
        this.logger.debug('[Agent] Pending registration detected — overriding to REGISTER_ACTIVITY (stream)');
        const registrationResult = await this.handleRegistrationIntent(
          question,
          { activityContext: question },
          sessionId, currentDate, k, Date.now(), userOrg,
        );
        yield registrationResult.response;
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, registrationResult.response);
        }
        return;
      }

      // ── Step 3: GREETING ──────────────────────────────────────────────────────
      if (decision.action === 'greeting') {
        this.logger.debug('[Agent] GREETING — returning intro response (stream)');
        yield GREETING_RESPONSE;
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, GREETING_RESPONSE);
        }
        return;
      }

      // ── Step 4: CHITCHAT early-exit ───────────────────────────────────────────
      if (decision.action === 'out_of_scope') {
        this.logger.debug('[Agent] CHITCHAT — skipping retrieval (stream)');
        yield CHITCHAT_REJECTION;
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, CHITCHAT_REJECTION);
        }
        return;
      }

      // ── Step 4.5: REGISTER_ACTIVITY ───────────────────────────────────────────
      if (decision.action === 'register') {
        this.logger.debug('[Agent] REGISTER_ACTIVITY — handling in stream');
        const registrationResult = await this.handleRegistrationIntent(
          question, decision.params, sessionId, currentDate, k, Date.now(), userOrg,
        );
        yield registrationResult.response;
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, registrationResult.response);
        }
        return;
      }

      // ── Step 5: Retrieve documents (search) ────────────────────────────────
      const sources = await this.retrieveDocumentsWithVerification(decision.params, currentDate, k, userOrg, userId);
      options.onSources?.(sources);

      // ── Step 6: Format context ─────────────────────────────────────────────
      const enrichedSources = await this.mcpEnricher.enrichDocuments(sources);
      const formattedContext = this.formatDocumentsAsContext(enrichedSources, currentDate);

      const userOrgInstruction = userOrg
        ? `\nNếu người dùng thuộc tổ chức "${userOrg}", hãy ưu tiên đề cập các hoạt động của tổ chức này lên trên cùng nếu có trong context.`
        : '';

      // ── Step 7: Stream response ────────────────────────────────────────────
      const stream = await this.ragChain.stream({
        question: decision.params.rewrittenQuestion,
        chat_history: chatHistory,
        context: formattedContext,
        current_date: currentDate,
        current_day_of_week: currentDayOfWeek,
        current_datetime: currentDatetime,
        user_org_instruction: userOrgInstruction,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        yield chunk;
      }

      // Track activities for future REGISTER_ACTIVITY turns
      const allActivities = this.extractActivitiesFromDocs(sources, currentDate);
      if (sessionId && allActivities.length > 0) {
        this.memoryService.setMentionedActivities(sessionId, allActivities);
      }

      // Save to memory after streaming completes
      if (sessionId) {
        await this.memoryService.saveInteraction(sessionId, question, fullResponse);
      }
    } catch (error) {
      this.logger.error('RAG chain streaming failed', error);
      throw error;
    }
  }

  /**
   * Handle REGISTER_ACTIVITY intent:
   * 1. Check session memory for lastMentionedActivity
   * 2. Fallback: run retrieval to find the activity
   * 3. Return RAGResponse with registrationTarget for the controller to act on
   */
  private async handleRegistrationIntent(
    originalQuestion: string,
    registerParams: AgentRegisterParams,
    sessionId: string | undefined,
    currentDate: string,
    topK: number,
    startTime: number,
    userOrg?: string,
  ): Promise<RAGResponse> {
    const intent = 'REGISTER_ACTIVITY' as const;

    // ── Priority 0: check if user is confirming a pending registration ────
    // If a previous turn asked "Bạn có muốn đăng ký X không?" and the user
    // now replies with a confirmation word ("có", "đồng ý", "xác nhận", "ok", "oke"),
    // proceed with the registration immediately.
    if (sessionId) {
      const pending = this.memoryService.getPendingRegistration(sessionId);
      if (pending) {
        const q = originalQuestion.toLowerCase().trim();
        const isConfirmation = /^(có|co|ok|oke|đồng ý|dong y|xác nhận|xac nhan|đăng ký đi|dang ky di|yes|ừ|uh|uhm)/.test(q);
        const isCancellation = /^(không|khong|thôi|thoi|hủy|huy|cancel|no)/.test(q);

        if (isConfirmation) {
          this.memoryService.clearPendingRegistration(sessionId);
          return {
            response: `Tôi sẽ tiến hành đăng ký bạn vào hoạt động **"${pending.activityName}"**.`,
            sources: [],
            responseTime: Date.now() - startTime,
            sessionId,
            intent,
            registrationTarget: { activityId: pending.activityId, activityName: pending.activityName },
          };
        }

        if (isCancellation) {
          this.memoryService.clearPendingRegistration(sessionId);
          return {
            response: `Đã hủy. Nếu bạn muốn đăng ký hoạt động khác, hãy cho tôi biết tên hoạt động.`,
            sources: [],
            responseTime: Date.now() - startTime,
            sessionId,
            intent,
          };
        }

        // User said something else — treat as a new registration request, clear old pending
        this.memoryService.clearPendingRegistration(sessionId);
      }
    }

    // ── Helper: build activity detail block for confirmation prompt ───────
    const buildConfirmationPrompt = (
      activityName: string,
      meta: Record<string, any>,
    ): string => {
      const fmt = (d: string | undefined) => {
        if (!d) return null;
        try {
          return new Date(d).toLocaleDateString('vi-VN');
        } catch {
          return d;
        }
      };
      const lines: string[] = [
        `Tôi tìm thấy hoạt động sau:`,
        ``,
        `**${activityName}**`,
      ];
      if (meta.organizationName) lines.push(`- Tổ chức: ${meta.organizationName}`);
      if (meta.categoryName)     lines.push(`- Danh mục: ${meta.categoryName}`);
      if (meta.startDate || meta.endDate)
        lines.push(`- Thời gian: ${fmt(meta.startDate) ?? '?'} – ${fmt(meta.endDate) ?? '?'}`);
      if (meta.location)         lines.push(`- Địa điểm: ${meta.location}`);
      if (meta.totalDays)        lines.push(`- Số ngày: ${meta.totalDays}`);
      lines.push(``, `Bạn có muốn đăng ký hoạt động này không? (Trả lời **"có"** để xác nhận hoặc **"không"** để hủy.)`);
      return lines.join('\n');
    };

    // ── Priority 1: resolve from recent session memory ────────────────────
    if (sessionId) {
      const recentActivities = this.memoryService.getMentionedActivities(sessionId);
      if (recentActivities.length > 0) {
        const target = this.resolveTargetActivity(originalQuestion, recentActivities);
        if (target) {
          this.logger.debug(
            `[Register] Resolved from memory: ${target.activityName} (id=${target.activityId})`,
          );
          if (!target.isRecruiting) {
            return {
              response: `Hoạt động **"${target.activityName}"** hiện không còn nhận đăng ký.`,
              sources: [],
              responseTime: Date.now() - startTime,
              sessionId,
              intent,
            };
          }
          // Always ask for confirmation — never auto-register
          this.memoryService.setPendingRegistration(sessionId, target.activityId, target.activityName);
          const confirmPrompt = buildConfirmationPrompt(target.activityName, {});
          return {
            response: confirmPrompt,
            sources: [],
            responseTime: Date.now() - startTime,
            sessionId,
            intent,
            // Do NOT set registrationTarget — wait for user confirmation
          };
        }
      }
    }

    // ── Priority 2: run retrieval to find the mentioned activity ─────────
    // Use activityContext for better semantic retrieval quality.
    this.logger.debug('[Register] No memory match — running retrieval for registration target');
    const searchParams: AgentSearchParams = {
      rewrittenQuestion: registerParams.activityContext,
      mode: 'semantic',
    };
    const sources = await this.retrieveDocumentsWithVerification(
      searchParams, currentDate, topK, userOrg,
    );

    const target = this.findRecruitingActivity(sources, currentDate);

    if (!target) {
      return {
        response: 'Tôi không tìm thấy hoạt động bạn đề cập. Bạn có thể cho tôi biết tên cụ thể của hoạt động không?',
        sources,
        responseTime: Date.now() - startTime,
        sessionId,
        intent,
      };
    }

    // Store found activity so future turns can reference it
    if (sessionId) {
      this.memoryService.setLastMentionedActivity(
        sessionId, target.activityId, target.activityName, target.isRecruiting,
      );
    }

    if (!target.isRecruiting) {
      return {
        response: `Hoạt động **"${target.activityName}"** hiện không còn nhận đăng ký (đã kết thúc hoặc đã hủy).`,
        sources,
        responseTime: Date.now() - startTime,
        sessionId,
        intent,
      };
    }

    // ── Safety check: verify found activity name shares keywords with user's query ──
    const stopWords = new Set([
      'đăng', 'ký', 'cho', 'tôi', 'vào', 'hoạt', 'động', 'muốn',
      'giúp', 'hãy', 'bạn', 'với', 'các', 'này', 'đó', 'của',
    ]);
    const normalize = (s: string) =>
      s.toLowerCase().replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
    const queryKeywords = normalize(originalQuestion)
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
    const nameNorm = normalize(target.activityName);
    const hasOverlap = queryKeywords.some(kw => nameNorm.includes(kw));

    if (!hasOverlap && queryKeywords.length > 0) {
      // No keyword overlap — ask without storing pending (ambiguous, may be wrong activity)
      return {
        response:
          `Tôi tìm thấy hoạt động **"${target.activityName}"**. ` +
          `Đây có phải hoạt động bạn muốn đăng ký không? (Trả lời "có" để xác nhận hoặc cho tôi biết tên cụ thể hơn.)`,
        sources,
        responseTime: Date.now() - startTime,
        sessionId,
        intent,
      };
    }

    // Activity found and keywords match — show details and ask for confirmation
    const firstDocMeta = sources[0]?.metadata ?? {};
    if (sessionId) {
      this.memoryService.setPendingRegistration(sessionId, target.activityId, target.activityName);
    }
    return {
      response: buildConfirmationPrompt(target.activityName, firstDocMeta),
      sources,
      responseTime: Date.now() - startTime,
      sessionId,
      intent,
      // Do NOT set registrationTarget — wait for user confirmation
    };
  }

  /**
   * Extract all unique activities from retrieved docs with their real-time recruiting status.
   * Replaces findRecruitingActivity — returns ALL activities, not just the first recruiting one.
   */
  private extractActivitiesFromDocs(docs: Document[], currentDate?: string): MentionedActivity[] {
    const today = currentDate ? new Date(currentDate) : new Date();
    today.setHours(0, 0, 0, 0);

    const seen = new Set<string | number>();
    const result: MentionedActivity[] = [];

    for (const doc of docs) {
      const metadata = doc.metadata || {};
      const activityId = metadata.activityId;
      const activityName = metadata.activityName;
      if (!activityId || !activityName || seen.has(activityId)) continue;
      seen.add(activityId);

      const activityStatus = this.normalizeActivityStatus(metadata.status);
      const startRaw = metadata.startDate ? new Date(metadata.startDate) : null;
      const endRaw = metadata.endDate ? new Date(metadata.endDate) : null;
      if (startRaw) startRaw.setHours(0, 0, 0, 0);
      if (endRaw) endRaw.setHours(0, 0, 0, 0);

      let realtimeStatus: string;
      if (activityStatus === ActivityStatus.CANCELLED || activityStatus === ActivityStatus.COMPLETED) {
        realtimeStatus = 'ended';
      } else if (!startRaw || !endRaw) {
        realtimeStatus = 'unknown';
      } else if (today < startRaw) {
        realtimeStatus = 'upcoming';
      } else if (today > endRaw) {
        realtimeStatus = 'ended';
      } else {
        realtimeStatus = 'ongoing';
      }

      const isRecruiting =
        activityStatus === ActivityStatus.ACTIVE &&
        (realtimeStatus === 'ongoing' || realtimeStatus === 'upcoming');

      result.push({ activityId, activityName, isRecruiting });
    }

    return result;
  }

  /**
   * Resolve which activity the user wants to register for.
   * Priority: ordinal reference ("thứ 2") > name match > first recruiting activity.
   */
  private resolveTargetActivity(
    question: string,
    activities: MentionedActivity[],
  ): MentionedActivity | null {
    if (activities.length === 0) return null;

    const q = question.toLowerCase();

    // Ordinal match: support both named ("thứ nhất") and numeric ("số 4", "thứ 4") forms.
    // Named ordinals map to fixed indices for safety.
    const namedOrdinalMap: Array<[RegExp, number]> = [
      [/thứ\s*nhất|đầu\s*tiên/, 0],
      [/thứ\s*hai/, 1],
      [/thứ\s*ba/, 2],
      [/thứ\s*tư/, 3],
      [/thứ\s*năm/, 4],
      [/thứ\s*sáu/, 5],
      [/thứ\s*bảy/, 6],
      [/thứ\s*tám/, 7],
      [/thứ\s*chín/, 8],
      [/thứ\s*mười/, 9],
    ];
    for (const [pattern, index] of namedOrdinalMap) {
      if (pattern.test(q) && index < activities.length) {
        return activities[index];
      }
    }

    // Numeric ordinal: "số N", "thứ N", "hoạt động số N", "#N" — handles any digit.
    const numericOrdinalMatch = q.match(/(?:số|thứ|#)\s*(\d+)/);
    if (numericOrdinalMatch) {
      const n = parseInt(numericOrdinalMatch[1], 10);
      const index = n - 1; // user says "số 4" → 1-based → index 3
      if (index >= 0 && index < activities.length) {
        return activities[index];
      }
    }

    // Name fuzzy match.
    // normalize: lowercase, strip [TAG] prefixes (e.g. [CTV], [XD]), collapse whitespace.
    const normalize = (s: string) =>
      s.toLowerCase().replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();

    const qNorm = normalize(q);

    // Pass 1: exact substring match (both directions, normalized).
    for (const activity of activities) {
      const nameNorm = normalize(activity.activityName);
      if (nameNorm.length > 0 && (qNorm.includes(nameNorm) || nameNorm.includes(qNorm))) {
        return activity;
      }
    }

    // Pass 2: keyword scoring — count how many user-query keywords (words > 2 chars,
    // after stripping Vietnamese registration stop-words) appear in the activity name.
    // This handles cases like "cse jobfair" → "[CTV] tham gia hỗ trợ CSE Jobfair 4/2026".
    const stopWords = new Set([
      'đăng', 'ký', 'cho', 'tôi', 'vào', 'hoạt', 'động', 'muốn',
      'giúp', 'hãy', 'bạn', 'với', 'các', 'này', 'đó', 'của',
      'the', 'and', 'for', 'with',
    ]);
    const qKeywords = qNorm.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

    if (qKeywords.length > 0) {
      let bestScore = 0;
      let bestActivity: MentionedActivity | null = null;

      for (const activity of activities) {
        const nameNorm = normalize(activity.activityName);
        const matched = qKeywords.filter(kw => nameNorm.includes(kw)).length;
        const score = matched / qKeywords.length;
        if (score > bestScore) {
          bestScore = score;
          bestActivity = activity;
        }
      }

      // Accept if at least one keyword matched (for short queries like "cse jobfair").
      // IMPORTANT: Return null when score = 0 — do NOT fall back to first activity
      // to avoid registering a completely unrelated activity.
      if (bestScore > 0 && bestActivity) {
        return bestActivity;
      }
      return null;
    }

    // No extractable keywords — cannot safely resolve; return null to trigger clarification.
    return null;
  }

  /**
   * Find the first activity in retrieved docs that is still recruiting.
   * @deprecated Use extractActivitiesFromDocs instead.
   */
  private findRecruitingActivity(
    docs: Document[],
    currentDate?: string,
  ): { activityId: string | number; activityName: string; isRecruiting: boolean } | null {
    if (docs.length === 0) return null;

    const today = currentDate ? new Date(currentDate) : new Date();
    today.setHours(0, 0, 0, 0);

    for (const doc of docs) {
      const metadata = doc.metadata || {};
      const activityStatus = this.normalizeActivityStatus(metadata.status);
      const activityId = metadata.activityId;
      const activityName = metadata.activityName;

      if (!activityId || !activityName) continue;

      const startRaw = metadata.startDate ? new Date(metadata.startDate) : null;
      const endRaw = metadata.endDate ? new Date(metadata.endDate) : null;
      if (startRaw) startRaw.setHours(0, 0, 0, 0);
      if (endRaw) endRaw.setHours(0, 0, 0, 0);

      // Compute real-time status
      let realtimeStatus: string;
      if (activityStatus === ActivityStatus.CANCELLED || activityStatus === ActivityStatus.COMPLETED) {
        realtimeStatus = 'ended';
      } else if (!startRaw || !endRaw) {
        realtimeStatus = 'unknown';
      } else if (today < startRaw) {
        realtimeStatus = 'upcoming';
      } else if (today > endRaw) {
        realtimeStatus = 'ended';
      } else {
        realtimeStatus = 'ongoing';
      }

      const isRecruiting =
        activityStatus === ActivityStatus.ACTIVE &&
        (realtimeStatus === 'ongoing' || realtimeStatus === 'upcoming');

      // Return the first activity (most relevant) with its recruiting status
      return { activityId, activityName, isRecruiting };
    }

    return null;
  }

  /**
   * Format documents as context string
   * @param docs - retrieved documents
   * @param currentDate - ISO date string (YYYY-MM-DD) for computing real-time activity status
   */
  private formatDocumentsAsContext(docs: Document[], currentDate?: string): string {
    if (docs.length === 0) {
      return 'Không có thông tin CTXH liên quan trong cơ sở dữ liệu.';
    }

    const today = currentDate ? new Date(currentDate) : new Date();
    // Normalize to date-only (midnight) to avoid time-of-day comparison issues
    today.setHours(0, 0, 0, 0);

    return docs
      .map((doc, index) => {
        const metadata = doc.metadata || {};
        const activityStatus = this.normalizeActivityStatus(metadata.status);

        // Parse start/end dates for real-time status computation
        const startRaw = metadata.startDate ? new Date(metadata.startDate) : null;
        const endRaw = metadata.endDate ? new Date(metadata.endDate) : null;
        if (startRaw) startRaw.setHours(0, 0, 0, 0);
        if (endRaw) endRaw.setHours(0, 0, 0, 0);

        const startDateVN = startRaw ? startRaw.toLocaleDateString('vi-VN') : 'N/A';
        const endDateVN = endRaw ? endRaw.toLocaleDateString('vi-VN') : 'N/A';

        // Compute status shown to LLM using both ActivityStatus and date bounds.
        let realtimeStatus: string;
        if (activityStatus === ActivityStatus.CANCELLED) {
          realtimeStatus = 'Đã hủy';
        } else if (activityStatus === ActivityStatus.COMPLETED) {
          realtimeStatus = 'Đã hoàn thành';
        } else if (!startRaw || !endRaw) {
          realtimeStatus = 'Không rõ';
        } else if (today < startRaw) {
          realtimeStatus = 'Sắp diễn ra';
        } else if (today > endRaw) {
          realtimeStatus = 'Đã kết thúc';
        } else {
          realtimeStatus = 'Đang diễn ra';
        }

        const isRecruiting =
          activityStatus === ActivityStatus.ACTIVE &&
          (realtimeStatus === 'Đang diễn ra' || realtimeStatus === 'Sắp diễn ra');

        const activityStatusText = activityStatus || metadata.status || 'N/A';
        const recruitmentStatus = isRecruiting
          ? 'Còn tuyển thành viên'
          : 'Không còn tuyển thành viên';

        // Also provide ISO dates so LLM can verify independently
        const startISO = startRaw ? startRaw.toISOString().split('T')[0] : 'N/A';
        const endISO = endRaw ? endRaw.toISOString().split('T')[0] : 'N/A';

        const activityUrl = metadata.activityId
          ? `${process.env.FRONTEND_URL || ''}/portal/ctxh/activities/${metadata.activityId}`
          : null;

        return `[Nguồn ${index + 1}]
Hoạt động: ${metadata.activityName || 'N/A'}
Danh mục: ${metadata.categoryName || 'N/A'}
Tổ chức: ${metadata.organizationName || 'N/A'}
ActivityStatus: ${activityStatusText}
Thời gian: ${startDateVN} - ${endDateVN} (ISO: ${startISO} đến ${endISO})
Địa điểm: ${metadata.location || 'N/A'}
Số ngày CTXH: ${metadata.totalDays || 'N/A'} ngày
Yêu cầu duyệt: ${metadata.requiresApproval != null ? (metadata.requiresApproval ? 'Có' : 'Không') : 'N/A'}
Tổng đã đăng ký (pending+approved): ${metadata.totalRegistered != null ? metadata.totalRegistered : 'N/A'}${metadata.maxParticipants != null ? ` / ${metadata.maxParticipants}` : ''}
Số đã được duyệt: ${metadata.approvedCount != null ? metadata.approvedCount : 'N/A'}
Số đang chờ duyệt: ${metadata.pendingCount != null ? metadata.pendingCount : 'N/A'}
Số chỗ còn lại: ${metadata.remainingSlots != null ? metadata.remainingSlots : (metadata.maxParticipants != null ? `tối đa ${metadata.maxParticipants}` : 'Không giới hạn')}
Trạng thái (tính đến ${currentDate || today.toISOString().split('T')[0]}): ${realtimeStatus}
Trạng thái tuyển thành viên: ${recruitmentStatus}${activityUrl ? `\nLink chi tiết: ${activityUrl}` : ''}
Nội dung: ${doc.pageContent}
---`;
      })
      .join('\n\n');
  }

  /**
   * Get retriever for external use
   */
  getRetriever(k: number = 5) {
    return this.vectorStoreService.getRetriever(k);
  }

  /**
   * Check if chains are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
