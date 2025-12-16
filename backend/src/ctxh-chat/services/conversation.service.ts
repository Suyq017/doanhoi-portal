import { Injectable, Logger, Inject, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  ConversationSession,
  ConversationMessage,
  SessionMetadata,
  SessionContext,
} from '../interfaces';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    
    @Inject('GEMINI_CLIENT')
    private readonly geminiAI: any,
    
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get existing session or create a new one
   */
  async getOrCreateSession(
    userId?: string,
    sessionId?: string
  ): Promise<ConversationSession> {
    const finalSessionId = sessionId || this.generateSessionId();
    const cacheKey = `conversation:${finalSessionId}`;
    
    try {
      const existingSession = await this.redis.get(cacheKey);
      
      if (existingSession) {
        const session = JSON.parse(existingSession) as ConversationSession;
        this.logger.debug(`Retrieved existing session: ${finalSessionId}`);
        return session;
      }
      
      // Create new session
      const newSession: ConversationSession = {
        sessionId: finalSessionId,
        userId: userId || 'anonymous',
        messages: [],
        metadata: {
          startTime: new Date(),
          lastActive: new Date(),
          turnCount: 0,
          totalTokens: 0,
        },
        context: {
          recentTopics: [],
          userPreferences: {},
        },
      };
      
      await this.saveSession(newSession);
      this.logger.log(`Created new session: ${finalSessionId}`);
      
      return newSession;
      
    } catch (error) {
      this.logger.error('Failed to get/create session:', error);
      throw error;
    }
  }

  /**
   * Get existing session (no creation)
   */
  async getSession(sessionId: string): Promise<ConversationSession | null> {
    const cacheKey = `conversation:${sessionId}`;
    
    try {
      const sessionData = await this.redis.get(cacheKey);
      if (!sessionData) {
        return null;
      }
      
      return JSON.parse(sessionData) as ConversationSession;
    } catch (error) {
      this.logger.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Add a message to the conversation
   */
  async addMessage(
    sessionId: string,
    message: ConversationMessage
  ): Promise<ConversationSession> {
    const session = await this.getOrCreateSession(undefined, sessionId);
    
    // Add new message with timestamp
    session.messages.push({
      ...message,
      timestamp: new Date(),
    });
    
    // Update metadata
    session.metadata.lastActive = new Date();
    session.metadata.turnCount += message.role === 'user' ? 1 : 0;
    session.metadata.totalTokens += this.estimateTokens(message.content);
    
    // Manage conversation window
    await this.manageConversationWindow(session);
    
    await this.saveSession(session);
    
    this.logger.debug(`Added ${message.role} message to session ${sessionId}`);
    
    return session;
  }

  /**
   * Clear a session
   */
  async clearSession(sessionId: string, userId?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (session && userId && session.userId !== userId) {
      throw new ForbiddenException('Cannot clear session of another user');
    }
    
    const cacheKey = `conversation:${sessionId}`;
    await this.redis.del(cacheKey);
    
    this.logger.log(`Cleared session: ${sessionId}`);
  }

  /**
   * Save session to Redis with TTL
   */
  private async saveSession(session: ConversationSession): Promise<void> {
    const cacheKey = `conversation:${session.sessionId}`;
    const ttl = this.configService.get('SESSION_TTL_SECONDS', 3600);
    
    await this.redis.setex(
      cacheKey,
      ttl,
      JSON.stringify(session)
    );
  }

  /**
   * Manage conversation window (summarize old messages if needed)
   */
  private async manageConversationWindow(
    session: ConversationSession
  ): Promise<void> {
    const maxMessages = this.configService.get('MAX_CONVERSATION_HISTORY', 20);
    const maxTokens = this.configService.get('MAX_CONVERSATION_TOKENS', 4000);
    
    // Check if we need to truncate
    if (session.messages.length > maxMessages || 
        session.metadata.totalTokens > maxTokens) {
      
      this.logger.debug(`Session ${session.sessionId} exceeded limits, summarizing...`);
      await this.summarizeAndTruncate(session);
    }
  }

  /**
   * Summarize old messages and truncate conversation
   */
  private async summarizeAndTruncate(
    session: ConversationSession
  ): Promise<void> {
    const messagesToKeep = this.configService.get('MESSAGES_TO_KEEP', 10);
    const messagesToSummarize = session.messages.slice(0, -messagesToKeep);
    
    if (messagesToSummarize.length === 0) {
      return;
    }
    
    try {
      // Use Gemini to summarize old messages
      const summaryPrompt = this.buildSummaryPrompt(messagesToSummarize);
      const summary = await this.generateSummary(summaryPrompt);
      
      // Replace old messages with summary
      session.messages = [
        {
          role: 'system',
          content: `Tóm tắt cuộc trò chuyện trước:\n${summary}`,
          timestamp: new Date(),
          metadata: {
            type: 'summary',
          },
        },
        ...session.messages.slice(-messagesToKeep)
      ];
      
      // Recalculate token count
      session.metadata.totalTokens = session.messages.reduce(
        (total, msg) => total + this.estimateTokens(msg.content), 
        0
      );
      
      this.logger.debug(`Summarized ${messagesToSummarize.length} messages into summary`);
      
    } catch (error) {
      this.logger.error('Failed to summarize messages:', error);
      // Fallback: just truncate without summary
      session.messages = session.messages.slice(-messagesToKeep);
    }
  }

  /**
   * Build prompt for summarization
   */
  private buildSummaryPrompt(messages: ConversationMessage[]): string {
    const conversation = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role === 'user' ? 'Sinh viên' : 'Trợ lý'}: ${msg.content}`)
      .join('\n');
      
    return `
Hãy tóm tắt cuộc trò chuyện sau về các hoạt động CTXH một cách ngắn gọn và chính xác:

${conversation}

Tóm tắt nên bao gồm:
- Các chủ đề chính được thảo luận
- Thông tin CTXH quan trọng được cung cấp
- Bối cảnh cần thiết cho cuộc trò chuyện tiếp theo

Tóm tắt (tối đa 200 từ):`;
  }

  /**
   * Generate summary using Gemini
   */
  private async generateSummary(prompt: string): Promise<string> {
    try {
      const response = await this.geminiAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 512,
        }
      });
      
      return response.text || 'Không thể tạo tóm tắt.';
      
    } catch (error) {
      this.logger.error('Gemini summarization failed:', error);
      return 'Tóm tắt không khả dụng do lỗi hệ thống.';
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for Vietnamese
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return uuidv4();
  }

  /**
   * Legacy method for backward compatibility
   */
  async getConversation(sessionId: string): Promise<ConversationSession | null> {
    return this.getSession(sessionId);
  }

  /**
   * Legacy method for backward compatibility
   */
  async saveMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await this.addMessage(sessionId, {
      role,
      content,
      timestamp: new Date(),
    });
  }
}