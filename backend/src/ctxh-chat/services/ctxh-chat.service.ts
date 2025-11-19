import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatMessageDto, ChatResponseDto, ConversationHistoryDto } from '../dto/chat.dto';
import { EmbeddingService } from '@/ctxh-chat/services/embedding.service';
import { CtxhRetrievalService } from '@/ctxh-chat/services/ctxh-retrieval.service';
import { ConversationService } from '@/ctxh-chat/services/conversation.service';

@Injectable()
export class CtxhChatService {
  private readonly logger = new Logger(CtxhChatService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingService: EmbeddingService,
    private readonly retrievalService: CtxhRetrievalService,
    private readonly conversationService: ConversationService,
  ) {}

  async processMessage(request: ChatMessageDto): Promise<ChatResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Processing message: ${request.message.substring(0, 100)}...`);

    try {
      // TODO: Implement in Phase 2
      // 1. Retrieve relevant documents
      // 2. Format prompt with context
      // 3. Call LLM
      // 4. Parse response
      // 5. Save to conversation history

      // Placeholder response for Phase 0 setup
      const response: ChatResponseDto = {
        response: 'Xin chào! Tôi là chatbot CTXH. Hiện tại tôi đang trong giai đoạn phát triển. Vui lòng thử lại sau.',
        sessionId: request.sessionId || this.generateSessionId(),
        sources: [],
        metadata: {
          processingTime: Date.now() - startTime,
          model: 'placeholder',
        }
      };

      return response;
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);
      throw new Error('Có lỗi xảy ra khi xử lý tin nhắn. Vui lòng thử lại.');
    }
  }

  async getConversationHistory(sessionId: string): Promise<ConversationHistoryDto> {
    // TODO: Implement in Phase 2
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

  async clearSession(sessionId: string): Promise<void> {
    // TODO: Implement in Phase 2
    this.logger.log(`Clearing session: ${sessionId}`);
  }

  async submitFeedback(feedback: any): Promise<void> {
    // TODO: Implement in Phase 2
    this.logger.log(`Feedback received: ${JSON.stringify(feedback)}`);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}