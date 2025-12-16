import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { EmbeddingService } from '@/ctxh-chat/services/embedding.service';
import { CtxhRetrievalService } from '@/ctxh-chat/services/ctxh-retrieval.service';
import { ConversationService } from '@/ctxh-chat/services/conversation.service';
import { ResponseFormatterService } from './response-formatter.service';
import {
  ChatResponse,
  AgentResponse,
  ChatOptions,
  ConversationMessage,
  SessionContext,
} from '../interfaces';

@Injectable()
export class CtxhChatService {
  private readonly logger = new Logger(CtxhChatService.name);

  constructor(
    @Inject('GEMINI_CLIENT')
    private readonly geminiAI: GoogleGenAI,
    
    @Inject('CHAT_MODEL')
    private readonly chatModel: string,
    
    private readonly embeddingService: EmbeddingService,
    private readonly retrievalService: CtxhRetrievalService,
    private readonly conversationService: ConversationService,
    private readonly responseFormatter: ResponseFormatterService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log(`Chat service initialized with model: ${this.chatModel}`);
  }

  /**
   * Process user message with RAG (Retrieval-Augmented Generation)
   */
  async processMessage(
    message: string,
    sessionId?: string,
    userId?: string,
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Processing message for user ${userId || 'anonymous'}`);
      
      // Step 1: Get or create conversation session
      const session = await this.conversationService.getOrCreateSession(
        userId,
        sessionId
      );

      // Step 2: Add user message to conversation
      await this.conversationService.addMessage(session.sessionId, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Step 3: Build conversation context
      const conversationHistory = this.buildConversationHistory(session.messages);
      
      // Step 4: Generate response using RAG
      const agentResponse = await this.generateAgentResponse(
        message,
        conversationHistory,
        session.context
      );

      // Step 5: Add assistant response to conversation
      await this.conversationService.addMessage(session.sessionId, {
        role: 'assistant',
        content: agentResponse.content,
        timestamp: new Date(),
        metadata: {
          sources: agentResponse.sources.map(doc => doc.metadata.activityId),
          type: 'response',
          processingTime: agentResponse.retrievalTime,
        }
      });

      // Step 6: Format final response
      const formattedResponse = await this.responseFormatter.formatResponse(
        agentResponse,
        {
          includeSourceLinks: options.includeSourceLinks ?? true,
          enableMarkdown: options.enableMarkdown ?? true,
          addFollowUpSuggestions: options.addFollowUpSuggestions ?? true,
        }
      );

      return {
        sessionId: session.sessionId,
        response: formattedResponse.content,
        sources: formattedResponse.sources,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        followUpSuggestions: formattedResponse.followUpSuggestions,
        confidence: formattedResponse.metadata.confidence,
      };

    } catch (error) {
      this.logger.error('Chat processing failed:', error);
      return this.handleChatError(error, sessionId);
    }
  }

  /**
   * Generate agent response using RAG pattern
   */
  private async generateAgentResponse(
    userMessage: string,
    conversationHistory: string,
    context?: SessionContext
  ): Promise<AgentResponse> {
    // Step 1: Retrieve relevant documents
    const retrievalResults = await this.retrievalService.retrieveRelevantDocuments(
      userMessage,
      {
        k: 3,
        useMMR: true,
        similarityThreshold: this.configService.get('RAG_SIMILARITY_THRESHOLD', 0.7),
      }
    );

    this.logger.debug(`Retrieved ${retrievalResults.documents.length} documents in ${retrievalResults.retrievalTime}ms`);

    // Step 2: Build context from retrieved documents
    const contextDocs = this.buildContextFromDocuments(retrievalResults.documents);

    // Step 3: Build final prompt
    const prompt = this.buildPrompt(
      userMessage,
      contextDocs,
      conversationHistory,
      context
    );

    // Step 4: Generate response with Gemini
    try {
      const response = await this.geminiAI.models.generateContent({
        model: this.chatModel,
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      });

      return {
        content: response.text || 'Xin lỗi, tôi không thể tạo phản hồi lúc này.',
        sources: retrievalResults.documents,
        retrievalTime: retrievalResults.retrievalTime,
      };
      
    } catch (error) {
      this.logger.error('Gemini generation failed:', error);
      
      // Fallback response
      return {
        content: 'Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
        sources: retrievalResults.documents,
        retrievalTime: retrievalResults.retrievalTime,
      };
    }
  }

  /**
   * Build system prompt with dynamic context
   */
  private buildSystemPrompt(context?: SessionContext): string {
    let basePrompt = `
Bạn là trợ lý ảo chuyên tư vấn về các hoạt động Công tác xã hội (CTXH) cho sinh viên.

NHIỆM VỤ CHÍNH:
1. Trả lời câu hỏi về các hoạt động CTXH một cách chính xác và chi tiết
2. Cung cấp thông tin cụ thể về thời gian, địa điểm, số ngày CTXH
3. Gợi ý các hoạt động phù hợp với nhu cầu sinh viên  
4. Hướng dẫn quy trình tham gia hoạt động CTXH

QUY TẮC QUAN TRỌNG:
- CHỈ sử dụng thông tin từ tài liệu được cung cấp bên dưới
- Nếu không tìm thấy thông tin, hãy thông báo rõ ràng
- Luôn trích dẫn nguồn thông tin khi cung cấp chi tiết cụ thể
- Sử dụng ngôn ngữ thân thiện, dễ hiểu cho sinh viên
- Ưu tiên các hoạt động có status ACTIVE hoặc sắp diễn ra

ĐỊNH DẠNG PHẢN HỒI:
- Câu trả lời trực tiếp và ngắn gọn
- Thông tin chi tiết được tổ chức rõ ràng
- Đề xuất hành động tiếp theo nếu phù hợp`;

    // Add dynamic context
    if (context?.recentTopics?.length > 0) {
      basePrompt += `\n\nCÁC CHỦ ĐỀ ĐÃ THẢO LUẬN: ${context.recentTopics.join(', ')}`;
    }

    return basePrompt;
  }

  /**
   * Build context string from retrieved documents
   */
  private buildContextFromDocuments(documents: any[]): string {
    if (documents.length === 0) {
      return 'Không có thông tin CTXH liên quan.';
    }

    return documents
      .map(doc => `
Hoạt động: ${doc.metadata.activityName}
Tổ chức: ${doc.metadata.organizationName}  
Thời gian: ${new Date(doc.metadata.startDate).toLocaleDateString('vi-VN')} - ${new Date(doc.metadata.endDate).toLocaleDateString('vi-VN')}
Ngày CTXH: ${doc.metadata.totalDays} ngày
Địa điểm: ${doc.metadata.location}
Trạng thái: ${doc.metadata.status}
Mô tả: ${doc.content}
---`)
      .join('\n');
  }

  /**
   * Build conversation history string
   */
  private buildConversationHistory(messages: ConversationMessage[]): string {
    return messages
      .filter(msg => msg.role !== 'system')
      .slice(-6) // Last 6 messages
      .map(msg => `${msg.role === 'user' ? 'Sinh viên' : 'Trợ lý'}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Build complete prompt for Gemini
   */
  private buildPrompt(
    userMessage: string,
    contextDocs: string,
    conversationHistory: string,
    context?: SessionContext
  ): string {
    const systemPrompt = this.buildSystemPrompt(context);
    
    return `
${systemPrompt}

${conversationHistory ? 'Lịch sử trò chuyện:\n' + conversationHistory + '\n\n' : ''}
Câu hỏi hiện tại: ${userMessage}

Thông tin CTXH liên quan:
${contextDocs}

Hãy trả lời câu hỏi dựa trên thông tin được cung cấp ở trên.`;
  }

  /**
   * Handle chat errors gracefully
   */
  private handleChatError(error: any, sessionId?: string): ChatResponse {
    return {
      sessionId: sessionId || 'error-session',
      response: 'Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.',
      sources: [],
      responseTime: 0,
      timestamp: new Date(),
      confidence: 0,
    };
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<any> {
    const session = await this.conversationService.getSession(sessionId);
    
    if (!session) {
      return {
        messages: [],
        metadata: {
          sessionId,
          startTime: new Date(),
          lastActive: new Date(),
          turnCount: 0,
        }
      };
    }

    return {
      messages: session.messages,
      metadata: session.metadata,
    };
  }

  /**
   * Clear conversation session
   */
  async clearSession(sessionId: string, userId?: string): Promise<void> {
    await this.conversationService.clearSession(sessionId, userId);
  }

  /**
   * Submit user feedback (for future improvements)
   */
  async submitFeedback(feedback: any): Promise<void> {
    this.logger.log(`Feedback received: ${JSON.stringify(feedback)}`);
    // TODO: Store feedback in database for analysis
  }
}