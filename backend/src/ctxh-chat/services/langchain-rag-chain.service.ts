import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LangChainVectorStoreService } from './langchain-vector-store.service';
import { LangChainMemoryService } from './langchain-memory.service';
import { LangChainConfig } from '../config/langchain.config';
import { CTXH_RAG_PROMPT, STANDALONE_QUESTION_PROMPT } from '../prompts/ctxh-chat.prompts';

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
}

/**
 * LangChain RAG Chain Service
 * Core RAG implementation using LangChain.js
 */
@Injectable()
export class LangChainRagChainService implements OnModuleInit {
  private readonly logger = new Logger(LangChainRagChainService.name);
  private llm: ChatGoogleGenerativeAI;
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

      // Initialize LLM
      this.llm = LangChainConfig.getLLM(this.configService);

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
    const retriever = this.vectorStoreService.getRetriever(ragConfig.topK);

    return RunnableSequence.from([
      RunnablePassthrough.assign({
        context: async (input: { question: string; chat_history: string }) => {
          const docs = await retriever.invoke(input.question);
          return this.formatDocumentsAsContext(docs);
        },
      }),
      CTXH_RAG_PROMPT,
      this.llm,
      new StringOutputParser(),
    ]);
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
    const { k = 5, useMMR = false, includeHistory = true } = options;

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

    const { includeHistory = true } = options;

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
   */
  private formatDocumentsAsContext(docs: Document[]): string {
    if (docs.length === 0) {
      return 'Không có thông tin CTXH liên quan trong cơ sở dữ liệu.';
    }

    return docs
      .map((doc, index) => {
        const metadata = doc.metadata || {};
        const startDate = metadata.startDate 
          ? new Date(metadata.startDate).toLocaleDateString('vi-VN')
          : 'N/A';
        const endDate = metadata.endDate
          ? new Date(metadata.endDate).toLocaleDateString('vi-VN')
          : 'N/A';

        return `[Nguồn ${index + 1}]
Hoạt động: ${metadata.activityName || 'N/A'}
Tổ chức: ${metadata.organizationName || 'N/A'}
Thời gian: ${startDate} - ${endDate}
Địa điểm: ${metadata.location || 'N/A'}
Số ngày CTXH: ${metadata.totalDays || 'N/A'} ngày
Trạng thái: ${metadata.status || 'N/A'}
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
