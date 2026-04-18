import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainVectorStoreService } from './langchain-vector-store.service';
import { LangChainMemoryService } from './langchain-memory.service';
import { LangChainConfig } from '../config/langchain.config';
import { CTXH_RAG_PROMPT } from '../prompts/ctxh-chat.prompts';
import { ROUTER_AGENT_PROMPT } from '../prompts/router-agent.prompt';
import { RETRIEVAL_VERIFIER_PROMPT } from '../prompts/retrieval-verifier.prompt';
import { TOOL_SELECTOR_PROMPT } from '../prompts/tool-selector.prompt';
import { RouterOutput, RouterOutputSchema } from '../dto/router-output.dto';
import { VerifierOutputSchema } from '../dto/verifier-output.dto';
import { RAG_TOOLS, RAG_TOOL_NAMES, RagToolName } from '../tools/rag-tools';
import { ActivityStatus } from '@/entities/ctxh-activity.entity';
import { CtxhFilterExtractionService } from './ctxh-filter-extraction.service';

/**
 * RAG Response structure
 */
export interface RAGResponse {
  response: string;
  sources: Document[];
  responseTime: number;
  sessionId?: string;
  /** Intent detected by the Router Agent — useful for debugging and analytics */
  intent?: RouterOutput['intent'];
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
}

/** Polite rejection for truly off-topic requests (CHITCHAT) */
const CHITCHAT_REJECTION =
  'Xin lỗi, tôi chỉ hỗ trợ câu hỏi về hoạt động Công tác xã hội tại Trường Đại học Bách khoa - Đại học Quốc gia TP.HCM.';

/** Friendly greeting response for GREETING intent */
const GREETING_RESPONSE = [
  'Xin chào bạn! Tôi là trợ lý ảo chuyên tư vấn về các hoạt động **Công tác Xã hội (CTXH)** tại Đại học Bách Khoa TP.HCM.',
  '',
  'Tôi có thể giúp bạn:',
  '\n• **Tìm kiếm hoạt động CTXH** theo thời gian, địa điểm, danh mục (hiến máu, tình nguyện, hội trại,...)',
  '\n• **Tra cứu thông tin chi tiết**: thời gian, địa điểm, số ngày CTXH được tính',
  '\n• **Tìm hoạt động theo tổ chức/khoa** (ví dụ: hoạt động của Liên chi đoàn Khoa Máy tính)',
  '\n• **Kiểm tra trạng thái**: đang mở đăng ký, đã kết thúc',
  '',
  '\nHãy đặt câu hỏi cho tôi nhé! 😊',
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
    private readonly filterExtractionService: CtxhFilterExtractionService,
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
   * Router Agent: combines question rewriting + intent classification in one LLM call.
   *
   * Replaces the old `processQuestion()` + `buildQuestionRewriteChain()` pair.
   * Returns both a standalone rewritten question AND an intent label so the
   * caller can short-circuit the expensive retrieval path for CHITCHAT queries.
   *
   * Optimised for Qwen running on Ollama:
   *  - Uses `withStructuredOutput` (Zod) — avoids brittle JSON string parsing.
   *  - Prompt includes `/no_think` to suppress Qwen's reasoning block output.
   *  - Falls back gracefully: on error, treats the question as RAG_QUERY unchanged.
   */
  private async routeQuestion(
    question: string,
    chatHistory: string,
  ): Promise<RouterOutput> {
    try {
      const structuredLlm = this.llm.withStructuredOutput(RouterOutputSchema, {
        name: 'route_question',
      });

      const chain = ROUTER_AGENT_PROMPT.pipe(structuredLlm);

      const result = await chain.invoke({
        question,
        chat_history: chatHistory,
      }) as RouterOutput;

      this.logger.debug(
        `[RouterAgent] intent=${result.intent} | rewritten="${result.rewrittenQuestion.slice(0, 80)}"`,
      );

      return result;
    } catch (error) {
      // Graceful degradation: if the router fails (e.g. malformed JSON from model),
      // treat as RAG_QUERY with the original question so the user still gets an answer.
      this.logger.warn(
        `[RouterAgent] Failed to route question, falling back to RAG_QUERY: ${error?.message}`,
      );
      return {
        rewrittenQuestion: question,
        intent: 'RAG_QUERY',
      };
    }
  }

  /**
   * Extract filters and retrieve relevant documents.
   *
   * Org-injection logic:
   * - If the student does NOT mention a department in their question AND `userOrg` is provided
   *   (from their training department in the DB), inject it into `organizationKeywords` so the
   *   search automatically scopes to their own faculty.
   * - If the filtered search returns 0 results because of that auto-injected org filter,
   *   we retry without it so the student still gets a useful answer.
   * - If the student explicitly mentions a department, the LLM extracts it — we never override.
   */
  private async retrieveDocuments(
    question: string,
    currentDate: string,
    topK: number,
    useMMR: boolean,
    userOrg?: string,
  ): Promise<Document[]> {
    // 1. Extract structured metadata filters via LLM
    let filters = await this.filterExtractionService.extractFilters(
      question,
      currentDate,
    );

    // 2. Resolve relative date expressions ("hôm nay", "tuần này") into concrete bounds
    if (filters.dateRange && currentDate) {
      filters = this.filterExtractionService.resolveDateRange(
        filters,
        currentDate,
      );
    }

    // 3. Org injection: if student did not mention a department, use their training dept
    const userMentionedOrg = (filters.organizationKeywords?.length ?? 0) > 0;
    let orgInjected = false;

    if (!userMentionedOrg && userOrg) {
      filters = { ...filters, organizationKeywords: [userOrg] };
      orgInjected = true;
      this.logger.debug(`[OrgFilter] Injected user dept: "${userOrg}"`);
    }

    this.logger.debug(
      `Extracted filters: ${JSON.stringify(filters)}`,
    );

    let docs: Document[];

    if (this.filterExtractionService.isEmpty(filters)) {
      // No meaningful filters — fall back to standard search
      if (useMMR) {
        docs = await this.vectorStoreService.maxMarginalRelevanceSearch(
          question,
          { k: topK, fetchK: topK * 4, lambda: 0.5 },
        );
      } else {
        docs = await this.vectorStoreService.similaritySearchWithDateFilter(
          question,
          topK,
          currentDate,
          'all',
        );
      }
    } else {
      // Use pre-filtered vector search
      docs = await this.vectorStoreService.similaritySearchWithMetadataFilters(
        question,
        filters,
        topK,
        currentDate,
      );
    }

    // 4. Parallel broad-search & merge when org was auto-injected
    // Reason: query "hiến máu" with org="KTMT" returns KTMT results (>0, no retry),
    // but misses activities from Đoàn trường / Hội sinh viên.
    // -> Always also run broad search (no org filter) and merge results.
    if (orgInjected) {
      const filtersWithoutOrg = { ...filters, organizationKeywords: [] };
      const broadDocs = await this.vectorStoreService.similaritySearchWithMetadataFilters(
        question,
        filtersWithoutOrg,
        topK,
        currentDate,
      );

      // Merge: keep org-specific docs first, append broad docs not already present
      const seenIds = new Set(docs.map(d => d.metadata?.activityId).filter(Boolean));
      const newDocs = broadDocs.filter(d => !seenIds.has(d.metadata?.activityId));
      const orgCount = docs.length;
      docs = [...docs, ...newDocs].slice(0, topK);

      this.logger.debug(
        `[OrgFilter] Parallel merge: ${orgCount} org-specific + ${newDocs.length} broad -> total ${docs.length}`,
      );
    }

    return docs;
  }

  /**
   * Dynamic Tool Selection (Phase 3 — Option A: Lightweight bindTools).
   *
   * Asks the LLM to select ONE search tool from {search_with_filters,
   * search_semantic, search_diverse} by calling `llm.bindTools(RAG_TOOLS)`.
   * We parse the resulting `tool_calls[0].name` and execute the matching
   * VectorStore method ourselves — no AgentExecutor, no loop.
   *
   * Tool routing:
   *  search_with_filters -> retrieveDocuments()   (filter extraction + SQL WHERE)
   *  search_semantic     -> similaritySearchWithDateFilter() (no filter extraction)
   *  search_diverse      -> maxMarginalRelevanceSearch() (MMR, diverse results)
   *
   * Fallback hierarchy (graceful degradation):
   *  1. No tool_call returned -> retrieveDocuments() with useMMR flag
   *  2. bindTools() / invoke() throws -> retrieveDocuments() with useMMR flag
   *
   * Optimised for Qwen / Ollama:
   *  - /no_think in TOOL_SELECTOR_PROMPT prevents reasoning block pollution.
   *  - Tool descriptions carry the selection examples (prompt is minimal).
   *  - Fallback ensures correctness even when model ignores tool calling.
   */
  private async selectAndExecuteTool(
    question: string,
    currentDate: string,
    topK: number,
    useMMR: boolean,
    userOrg?: string,
  ): Promise<Document[]> {
    try {
      // Bind all 3 search tools to a dedicated LLM call
      const llmWithTools = this.llm.bindTools([...RAG_TOOLS]);
      const chain = TOOL_SELECTOR_PROMPT.pipe(llmWithTools);

      const result = await chain.invoke({
        question,
        current_date: currentDate,
      });

      // Parse which tool the LLM selected
      const toolCalls = (result as any).tool_calls as Array<{ name: string; args: Record<string, any> }> | undefined;
      const selectedTool = toolCalls?.[0]?.name as RagToolName | undefined;

      this.logger.debug(`[ToolSelector] Selected: ${selectedTool ?? 'none — using fallback'}`);

      switch (selectedTool) {
        // ── search_with_filters: LLM extracts metadata filters then runs SQL-filtered search ─
        case RAG_TOOL_NAMES.FILTERED_SEARCH:
          return this.retrieveDocuments(question, currentDate, topK, false, userOrg);

        // ── search_semantic: pure embedding similarity, skips filter extraction ──────────
        case RAG_TOOL_NAMES.SEMANTIC_SEARCH:
          return this.vectorStoreService.similaritySearchWithDateFilter(
            question,
            topK,
            currentDate,
            'all',
          );

        // ── search_diverse: MMR for variety when user wants broad overview ───────────
        case RAG_TOOL_NAMES.DIVERSE_SEARCH:
          return this.vectorStoreService.maxMarginalRelevanceSearch(
            question,
            { k: topK, fetchK: topK * 4, lambda: 0.5 },
          );

        // ── Fallback: model returned no tool call ──────────────────────────────────
        default:
          this.logger.warn('[ToolSelector] No tool call in response — falling back to retrieveDocuments()');
          return this.retrieveDocuments(question, currentDate, topK, useMMR, userOrg);
      }
    } catch (error) {
      // Graceful degradation: bindTools / invoke failure must never crash the pipeline.
      this.logger.warn(
        `[ToolSelector] Tool selection failed — falling back to retrieveDocuments(): ${error?.message}`,
      );
      return this.retrieveDocuments(question, currentDate, topK, useMMR, userOrg);
    }
  }

  /**
   * Retrieve-Then-Verify: wraps retrieveDocuments() with an LLM-driven fallback.
   *
   * Strategy (per Phase 2 design decisions):
   *  - Insufficient threshold : docs.length === 0
   *  - When insufficient      : Verifier LLM proposes a stripped-down semantic query;
   *                             we re-run similaritySearchWithDateFilter (no hard filters)
   *                             and merge the results, deduplicating by activityId.
   *  - When sufficient        : Pass-through, no extra LLM call (zero added latency).
   *
   * Optimised for Qwen / Ollama:
   *  - Verifier uses withStructuredOutput + /no_think prompt.
   *  - Falls back gracefully: if the verifier itself fails, the original (empty)
   *    docs array is returned so the generation step can respond "no info found".
   */
  private async retrieveDocumentsWithVerification(
    question: string,
    currentDate: string,
    topK: number,
    useMMR: boolean,
    userOrg?: string,
  ): Promise<Document[]> {
    // ── Dynamic Tool Selection (Phase 3) then Verify (Phase 2) ────────────
    const docs = await this.selectAndExecuteTool(question, currentDate, topK, useMMR, userOrg);

    // ── Fast-path: results exist -> skip verifier entirely ─────────────────────
    if (docs.length > 0) {
      this.logger.debug(
        `[Verifier] Primary retrieval returned ${docs.length} docs — skipping verification`,
      );
      return docs;
    }

    // ── Verifier LLM call: propose a simplified fallback query ─────────────────
    this.logger.warn(
      `[Verifier] Primary retrieval returned 0 docs — invoking verifier LLM for "${question.slice(0, 60)}…"`,
    );

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

      // ── Semantic fallback search ───────────────────────────────────────────────
      if (verifierResult.verdict === 'NEEDS_SUPPLEMENT' && verifierResult.supplementQuery) {
        const fallbackQuery = verifierResult.supplementQuery;

        const supplementDocs = await this.vectorStoreService.similaritySearchWithDateFilter(
          fallbackQuery,
          topK,
          currentDate,
          'all',
        );

        this.logger.debug(
          `[Verifier] Fallback semantic search returned ${supplementDocs.length} docs`,
        );

        // Deduplicate by activityId (primary docs is empty here, but guard anyway)
        const seen = new Set(docs.map((d) => d.metadata?.activityId).filter(Boolean));
        const newDocs = supplementDocs.filter((d) => !seen.has(d.metadata?.activityId));

        return [...docs, ...newDocs].slice(0, topK);
      }
    } catch (error) {
      // Graceful degradation: verifier failure must never crash the pipeline.
      // Return the original empty array so generation can say "no info found".
      this.logger.warn(
        `[Verifier] Verifier LLM failed — returning empty docs: ${error?.message}`,
      );
    }

    return docs; // empty array — generation will respond "no information found"
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
    } = options;

    try {
      // ── Step 1: Load chat history ──────────────────────────────────────────
      let chatHistory = '';
      if (sessionId && includeHistory) {
        chatHistory = await this.memoryService.getFormattedHistory(sessionId);
      }

      // ── Step 2: Router Agent — rewrite + classify intent ───────────────────
      const routerOutput = await this.routeQuestion(question, chatHistory);
      const { rewrittenQuestion, intent } = routerOutput;

      // ── Step 3: GREETING — friendly intro, no retrieval needed ───────────────
      if (intent === 'GREETING') {
        this.logger.debug('[RouterAgent] GREETING intent — returning intro response');
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

      // ── Step 4: CHITCHAT early-exit (no retrieval needed) ────────────────────
      if (intent === 'CHITCHAT') {
        this.logger.debug('[RouterAgent] CHITCHAT intent — skipping retrieval');
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

      // ── Step 4.5: REGISTER_ACTIVITY — find target activity, hand off to controller ──
      if (intent === 'REGISTER_ACTIVITY') {
        this.logger.debug('[RouterAgent] REGISTER_ACTIVITY intent — looking up activity');
        const registrationResult = await this.handleRegistrationIntent(
          rewrittenQuestion, sessionId, currentDate, k, useMMR, startTime, userOrg,
        );
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, registrationResult.response);
        }
        return registrationResult;
      }

      // ── Step 5: Retrieve documents (with Retrieve-Then-Verify) ──────────
      const sources = await this.retrieveDocumentsWithVerification(rewrittenQuestion, currentDate, k, useMMR, userOrg);

      // ── Step 6: Format context ─────────────────────────────────────────────
      const formattedContext = this.formatDocumentsAsContext(sources, currentDate);

      const userOrgInstruction = userOrg
        ? `\nNếu người dùng thuộc tổ chức "${userOrg}", hãy ưu tiên đề cập các hoạt động của tổ chức này lên trên cùng nếu có trong context.`
        : '';

      // ── Step 7: Generate response ──────────────────────────────────────────
      let response = await this.ragChain.invoke({
        question: rewrittenQuestion,
        chat_history: chatHistory,
        context: formattedContext,
        current_date: currentDate,
        current_day_of_week: currentDayOfWeek,
        current_datetime: currentDatetime,
        user_org_instruction: userOrgInstruction,
      });

      // ── Step 8: Post-process — track last activity + suggest registration ──
      const recruitingActivity = this.findRecruitingActivity(sources, currentDate);
      if (sessionId && recruitingActivity) {
        this.memoryService.setLastMentionedActivity(
          sessionId,
          recruitingActivity.activityId,
          recruitingActivity.activityName,
          recruitingActivity.isRecruiting,
        );
      }

      // If query resolved to a single activity that is still recruiting -> suggest
      const distinctActivityIds = new Set(
        sources.map(d => d.metadata?.activityId).filter(Boolean),
      );
      if (distinctActivityIds.size === 1 && recruitingActivity?.isRecruiting) {
        response += `\n\n---\n💬 Bạn có muốn tôi đăng ký bạn vào hoạt động **${recruitingActivity.activityName}** không?`;
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
    } = options;

    try {
      // ── Step 1: Load chat history ──────────────────────────────────────────
      let chatHistory = '';
      if (sessionId && includeHistory) {
        chatHistory = await this.memoryService.getFormattedHistory(sessionId);
      }

      // ── Step 2: Router Agent — rewrite + classify intent ───────────────────
      const routerOutput = await this.routeQuestion(question, chatHistory);
      const { rewrittenQuestion, intent } = routerOutput;

      // ── Step 3: GREETING — friendly intro, no retrieval needed (stream) ──────
      if (intent === 'GREETING') {
        this.logger.debug('[RouterAgent] GREETING intent — returning intro response (stream)');
        yield GREETING_RESPONSE;
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, GREETING_RESPONSE);
        }
        return;
      }

      // ── Step 4: CHITCHAT early-exit — yield single token then return ──────────
      if (intent === 'CHITCHAT') {
        this.logger.debug('[RouterAgent] CHITCHAT intent — skipping retrieval (stream)');
        yield CHITCHAT_REJECTION;
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, CHITCHAT_REJECTION);
        }
        return;
      }

      // ── Step 4.5: REGISTER_ACTIVITY — yield confirmation, let controller act ───
      if (intent === 'REGISTER_ACTIVITY') {
        this.logger.debug('[RouterAgent] REGISTER_ACTIVITY intent — handling in stream');
        const registrationResult = await this.handleRegistrationIntent(
          rewrittenQuestion, sessionId, currentDate, k, useMMR, Date.now(), userOrg,
        );
        yield registrationResult.response;
        if (sessionId) {
          await this.memoryService.saveInteraction(sessionId, question, registrationResult.response);
        }
        return;
      }

      // ── Step 5: Retrieve documents (with Retrieve-Then-Verify) ──────────
      const sources = await this.retrieveDocumentsWithVerification(rewrittenQuestion, currentDate, k, useMMR, userOrg);

      // ── Step 6: Format context ─────────────────────────────────────────────
      const formattedContext = this.formatDocumentsAsContext(sources, currentDate);

      const userOrgInstruction = userOrg
        ? `\nNếu người dùng thuộc tổ chức "${userOrg}", hãy ưu tiên đề cập các hoạt động của tổ chức này lên trên cùng nếu có trong context.`
        : '';

      // ── Step 7: Stream response ────────────────────────────────────────────
      const stream = await this.ragChain.stream({
        question: rewrittenQuestion,
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
    rewrittenQuestion: string,
    sessionId: string | undefined,
    currentDate: string,
    topK: number,
    useMMR: boolean,
    startTime: number,
    userOrg?: string,
  ): Promise<RAGResponse> {
    const intent = 'REGISTER_ACTIVITY' as const;

    // ── Priority 1: last mentioned activity from session memory ──────────
    if (sessionId) {
      const last = this.memoryService.getLastMentionedActivity(sessionId);
      if (last) {
        this.logger.debug(
          `[Register] Found lastMentionedActivity in session: ${last.activityName} (id=${last.activityId})`,
        );
        if (!last.isRecruiting) {
          return {
            response: `Hoạt động **"${last.activityName}"** hiện không còn nhận đăng ký.`,
            sources: [],
            responseTime: Date.now() - startTime,
            sessionId,
            intent,
          };
        }
        return {
          response: `Tôi sẽ tiến hành đăng ký bạn vào hoạt động **"${last.activityName}"**.`,
          sources: [],
          responseTime: Date.now() - startTime,
          sessionId,
          intent,
          registrationTarget: { activityId: last.activityId, activityName: last.activityName },
        };
      }
    }

    // ── Priority 2: run retrieval to find the mentioned activity ─────────
    this.logger.debug('[Register] No lastMentionedActivity — running retrieval for registration target');
    const sources = await this.retrieveDocumentsWithVerification(
      rewrittenQuestion, currentDate, topK, useMMR, userOrg,
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

    return {
      response: `Tôi sẽ đăng ký bạn vào hoạt động **"${target.activityName}"**.`,
      sources,
      responseTime: Date.now() - startTime,
      sessionId,
      intent,
      registrationTarget: { activityId: target.activityId, activityName: target.activityName },
    };
  }

  /**
   * Find the first activity in retrieved docs that is still recruiting.
   * Reuses the same date-based status logic as formatDocumentsAsContext().
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

        return `[Nguồn ${index + 1}]
Hoạt động: ${metadata.activityName || 'N/A'}
Tổ chức: ${metadata.organizationName || 'N/A'}
      ActivityStatus: ${activityStatusText}
Thời gian: ${startDateVN} - ${endDateVN} (ISO: ${startISO} đến ${endISO})
Địa điểm: ${metadata.location || 'N/A'}
Số ngày CTXH: ${metadata.totalDays || 'N/A'} ngày
Trạng thái (tính đến ${currentDate || today.toISOString().split('T')[0]}): ${realtimeStatus}
      Trạng thái tuyển thành viên: ${recruitmentStatus}
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
