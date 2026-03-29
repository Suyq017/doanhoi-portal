import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainVectorStoreService } from './langchain-vector-store.service';
import { LangChainMemoryService } from './langchain-memory.service';
import { LangChainConfig } from '../config/langchain.config';
import { CTXH_RAG_PROMPT, STANDALONE_QUESTION_PROMPT } from '../prompts/ctxh-chat.prompts';
import { ActivityStatus } from '@/entities/ctxh-activity.entity';

/**
 * RAG Response structure
 */
export interface RAGResponse {
  response: string;
  sources: Document[];
  responseTime: number;
  sessionId?: string;
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
}

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
  private questionRewriteChain: RunnableSequence;
  private initialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly vectorStoreService: LangChainVectorStoreService,
    private readonly memoryService: LangChainMemoryService,
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
      
      const modelType = LangChainConfig.isUsingLocalModel(this.configService) ? 'Ollama' : 'Gemini';
      this.logger.log(`Using ${modelType} LLM for RAG chain`);

      // Ensure vector store is ready
      if (!this.vectorStoreService.isInitialized()) {
        await this.vectorStoreService.initialize();
      }

      // Build main RAG chain
      this.ragChain = this.buildRAGChain();

      // Build question rewrite chain for contextual questions
      this.questionRewriteChain = this.buildQuestionRewriteChain();

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
    const ragConfig = LangChainConfig.getRAGConfig(this.configService);

    return RunnableSequence.from([
      RunnablePassthrough.assign({
        context: async (input: { question: string; chat_history: string; current_date?: string }) => {
          const { question, current_date } = input;

          // Detect time-status queries and apply date filter accordingly
          const statusFilter = this.detectStatusFilter(question);

          let docs: Document[];
          if (statusFilter !== 'all' && current_date) {
            // Use date-aware retrieval for time-based questions
            docs = await this.vectorStoreService.similaritySearchWithDateFilter(
              question,
              ragConfig.topK,
              current_date,
              statusFilter,
            );
          } else {
            // Default retrieval still enforces ActivityStatus runtime filtering.
            docs = await this.vectorStoreService.similaritySearchWithDateFilter(
              question,
              ragConfig.topK,
              current_date,
              'all',
            );
          }

          return this.formatDocumentsAsContext(docs, current_date);
        },
      }),
      CTXH_RAG_PROMPT,
      this.llm,
      new StringOutputParser(),
    ]);
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
   * Detect the status filter type from the user's question
   */
  private detectStatusFilter(question: string): 'ongoing' | 'upcoming' | 'ended' | 'all' {
    const q = question.toLowerCase();
    if (
      q.includes('đang diễn ra') || q.includes('đang có') || q.includes('hiện tại') ||
      q.includes('hôm nay') || q.includes('đang mở') || q.includes('đang tổ chức') ||
      q.includes('hiện đang') || q.includes('đang hoạt động') || q.includes('đang xảy ra')
    ) {
      return 'ongoing';
    }
    if (
      q.includes('sắp tới') || q.includes('sắp diễn ra') || q.includes('sắp có') ||
      q.includes('sắp mở') || q.includes('tới đây') || q.includes('upcoming')
    ) {
      return 'upcoming';
    }
    if (
      q.includes('đã kết thúc') || q.includes('đã qua') || q.includes('đã diễn ra') ||
      q.includes('đã có') || q.includes('trước đây') || q.includes('đã hết')
    ) {
      return 'ended';
    }
    return 'all';
  }

  /**
   * Build chain for rewriting contextual questions
   */
  private buildQuestionRewriteChain(): RunnableSequence {
    return RunnableSequence.from([
      RunnablePassthrough.assign({}),
      STANDALONE_QUESTION_PROMPT,
      this.llm,
      new StringOutputParser(),
    ]);
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
    } = options;

    try {
      // Get chat history if session exists
      let chatHistory = '';
      if (sessionId && includeHistory) {
        chatHistory = await this.memoryService.getFormattedHistory(sessionId);
      }

      // Rewrite question if there's chat history (for contextual understanding)
      let processedQuestion = question;
      if (chatHistory && chatHistory.length > 0) {
        try {
          processedQuestion = await this.questionRewriteChain.invoke({
            question,
            chat_history: chatHistory,
          });
          this.logger.debug(`Rewritten question: ${processedQuestion}`);
        } catch (error) {
          this.logger.warn('Question rewrite failed, using original', error);
          processedQuestion = question;
        }
      }

      // Get source documents
      let sources: Document[];
      if (useMMR) {
        sources = await this.vectorStoreService.maxMarginalRelevanceSearch(
          processedQuestion,
          { k, fetchK: k * 4, lambda: 0.5 },
        );
      } else {
        sources = await this.vectorStoreService.similaritySearch(processedQuestion, k);
      }

      // Run RAG chain
      const response = await this.ragChain.invoke({
        question: processedQuestion,
        chat_history: chatHistory,
        current_date: currentDate,
        current_day_of_week: currentDayOfWeek,
        current_datetime: currentDatetime,
      });

      // Save interaction to memory
      if (sessionId) {
        await this.memoryService.saveInteraction(sessionId, question, response);
      }

      return {
        response,
        sources,
        responseTime: Date.now() - startTime,
        sessionId,
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
      includeHistory = true,
      currentDate = new Date().toISOString().split('T')[0],
      currentDayOfWeek = new Date().toLocaleDateString('vi-VN', { weekday: 'long' }),
      currentDatetime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    } = options;

    try {
      // Get chat history
      let chatHistory = '';
      if (sessionId && includeHistory) {
        chatHistory = await this.memoryService.getFormattedHistory(sessionId);
      }

      // Stream from chain
      const stream = await this.ragChain.stream({
        question,
        chat_history: chatHistory,
        current_date: currentDate,
        current_day_of_week: currentDayOfWeek,
        current_datetime: currentDatetime,
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
Link đăng ký: ${metadata.registrationLink || 'Liên hệ tổ chức'}
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
