import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  async getConversation(sessionId: string): Promise<any> {
    // TODO: Implement in Phase 2 with Redis
    this.logger.log(`Getting conversation for session: ${sessionId}`);
    return null;
  }

  async saveMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    // TODO: Implement in Phase 2 with Redis
    this.logger.log(`Saving message for session: ${sessionId}, role: ${role}`);
  }

  async clearSession(sessionId: string): Promise<void> {
    // TODO: Implement in Phase 2 with Redis
    this.logger.log(`Clearing session: ${sessionId}`);
  }
}