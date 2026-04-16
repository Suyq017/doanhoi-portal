import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

/**
 * Memory entry with metadata for TTL management
 */
interface MemoryEntry {
  memory: any; // BufferMemory type
  history: InMemoryChatMessageHistory;
  lastAccessed: Date;
  turnCount: number;
  /** Last mentioned activity — used by REGISTER_ACTIVITY intent */
  lastMentionedActivity?: {
    activityId: string | number;
    activityName: string;
    isRecruiting: boolean;
  };
}

/**
 * LangChain Memory Service
 * Manages conversation memory using LangChain's BufferMemory
 * with in-memory storage and automatic cleanup
 */
@Injectable()
export class LangChainMemoryService {
  private readonly logger = new Logger(LangChainMemoryService.name);
  private memories = new Map<string, MemoryEntry>();
  private BufferMemoryClass: any = null;

  // Configuration
  private readonly maxMemories: number;
  private readonly memoryTTL: number; // in milliseconds
  private readonly maxMessagesPerSession: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.maxMemories = this.configService.get('RAG_MAX_SESSIONS', 1000);
    this.memoryTTL = this.configService.get('RAG_SESSION_TTL_MS', 30 * 60 * 1000); // 30 minutes
    this.maxMessagesPerSession = this.configService.get('RAG_MAX_MESSAGES_PER_SESSION', 20);

    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupOldMemories(),
      5 * 60 * 1000, // Every 5 minutes
    );

    // Initialize BufferMemory class synchronously with require
    this.initBufferMemory();

    this.logger.log(
      `Memory service initialized: maxMemories=${this.maxMemories}, TTL=${this.memoryTTL}ms`,
    );
  }

  /**
   * Initialize BufferMemory class using require
   */
  private initBufferMemory(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const memoryModule = require('@langchain/classic/memory');
      this.BufferMemoryClass = memoryModule.BufferMemory;
    } catch (error) {
      this.logger.error('Failed to load BufferMemory', error);
    }
  }

  /**
   * Ensure BufferMemory is loaded
   */
  private ensureBufferMemoryLoaded(): void {
    if (!this.BufferMemoryClass) {
      this.initBufferMemory();
    }
  }

  /**
   * Get or create memory for a session
   */
  async getMemory(sessionId: string): Promise<any> {
    this.ensureBufferMemoryLoaded();

    if (!this.memories.has(sessionId)) {
      // Cleanup if at capacity
      if (this.memories.size >= this.maxMemories) {
        this.cleanupOldMemories();
      }

      const history = new InMemoryChatMessageHistory();
      const memory = new this.BufferMemoryClass({
        chatHistory: history,
        returnMessages: true,
        memoryKey: 'chat_history',
        inputKey: 'question',
        outputKey: 'response',
      });

      this.memories.set(sessionId, {
        memory,
        history,
        lastAccessed: new Date(),
        turnCount: 0,
      });

      this.logger.debug(`Created new memory for session: ${sessionId}`);
    }

    const entry = this.memories.get(sessionId)!;
    entry.lastAccessed = new Date();
    return entry.memory;
  }

  /**
   * Get formatted conversation history as string
   */
  async getFormattedHistory(sessionId: string): Promise<string> {
    const entry = this.memories.get(sessionId);
    if (!entry) {
      return '';
    }

    try {
      const variables = await entry.memory.loadMemoryVariables({});
      const messages = variables.chat_history as BaseMessage[];

      if (!messages || messages.length === 0) {
        return '';
      }

      return messages
        .map((msg) => {
          if (msg instanceof HumanMessage) {
            return `Sinh viên: ${msg.content}`;
          } else if (msg instanceof AIMessage) {
            return `Trợ lý: ${msg.content}`;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
    } catch (error) {
      this.logger.error(`Failed to get formatted history for ${sessionId}`, error);
      return '';
    }
  }

  /**
   * Get raw messages from history
   */
  async getMessages(sessionId: string): Promise<BaseMessage[]> {
    const entry = this.memories.get(sessionId);
    if (!entry) {
      return [];
    }

    try {
      const variables = await entry.memory.loadMemoryVariables({});
      return (variables.chat_history as BaseMessage[]) || [];
    } catch (error) {
      this.logger.error(`Failed to get messages for ${sessionId}`, error);
      return [];
    }
  }

  /**
   * Save an interaction to memory
   */
  async saveInteraction(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
  ): Promise<void> {
    const entry = this.memories.get(sessionId);
    if (!entry) {
      // Create memory if doesn't exist
      this.getMemory(sessionId);
    }

    const memoryEntry = this.memories.get(sessionId)!;

    try {
      await memoryEntry.memory.saveContext(
        { question: userMessage },
        { response: aiResponse },
      );

      memoryEntry.turnCount += 1;
      memoryEntry.lastAccessed = new Date();

      // Trim old messages if exceeds limit
      await this.trimMemoryIfNeeded(sessionId);

      this.logger.debug(
        `Saved interaction for session ${sessionId}, turn ${memoryEntry.turnCount}`,
      );
    } catch (error) {
      this.logger.error(`Failed to save interaction for ${sessionId}`, error);
    }
  }

  /**
   * Add messages directly to history
   */
  async addMessages(sessionId: string, messages: BaseMessage[]): Promise<void> {
    const entry = this.memories.get(sessionId);
    if (!entry) {
      this.getMemory(sessionId);
    }

    const memoryEntry = this.memories.get(sessionId)!;

    try {
      await memoryEntry.history.addMessages(messages);
      memoryEntry.lastAccessed = new Date();
    } catch (error) {
      this.logger.error(`Failed to add messages for ${sessionId}`, error);
    }
  }

  /**
   * Clear memory for a session
   */
  async clearMemory(sessionId: string): Promise<void> {
    if (this.memories.has(sessionId)) {
      this.memories.delete(sessionId);
      this.logger.log(`Memory cleared for session: ${sessionId}`);
    }
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(sessionId: string): {
    exists: boolean;
    turnCount: number;
    lastAccessed: Date | null;
  } {
    const entry = this.memories.get(sessionId);
    return {
      exists: !!entry,
      turnCount: entry?.turnCount || 0,
      lastAccessed: entry?.lastAccessed || null,
    };
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.memories.keys());
  }

  /**
   * Store the last mentioned activity in session for REGISTER_ACTIVITY intent
   */
  setLastMentionedActivity(
    sessionId: string,
    activityId: string | number,
    activityName: string,
    isRecruiting: boolean,
  ): void {
    // Ensure session entry exists (may not exist on the very first turn
    // because getFormattedHistory() does not create entries)
    if (!this.memories.has(sessionId)) {
      this.getMemory(sessionId);
    }
    const entry = this.memories.get(sessionId);
    if (entry) {
      entry.lastMentionedActivity = { activityId, activityName, isRecruiting };
      this.logger.debug(
        `[Memory] Stored lastMentionedActivity for ${sessionId}: ${activityName} (id=${activityId}, recruiting=${isRecruiting})`,
      );
    }
  }

  /**
   * Retrieve the last mentioned activity from session
   */
  getLastMentionedActivity(sessionId: string): {
    activityId: string | number;
    activityName: string;
    isRecruiting: boolean;
  } | null {
    const entry = this.memories.get(sessionId);
    return entry?.lastMentionedActivity ?? null;
  }

  /**
   * Get memory stats
   */
  getStats(): {
    totalSessions: number;
    maxSessions: number;
    memoryUsagePercent: number;
  } {
    return {
      totalSessions: this.memories.size,
      maxSessions: this.maxMemories,
      memoryUsagePercent: (this.memories.size / this.maxMemories) * 100,
    };
  }

  /**
   * Trim memory if it exceeds max messages
   */
  private async trimMemoryIfNeeded(sessionId: string): Promise<void> {
    const entry = this.memories.get(sessionId);
    if (!entry) return;

    try {
      const messages = await entry.history.getMessages();
      
      if (messages.length > this.maxMessagesPerSession) {
        // Keep only the last N messages
        const trimmedMessages = messages.slice(-this.maxMessagesPerSession);
        
        // Clear and re-add
        await entry.history.clear();
        await entry.history.addMessages(trimmedMessages);
        
        this.logger.debug(
          `Trimmed memory for ${sessionId}: ${messages.length} -> ${trimmedMessages.length}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to trim memory for ${sessionId}`, error);
    }
  }

  /**
   * Cleanup old/expired memories
   */
  private cleanupOldMemories(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, entry] of this.memories.entries()) {
      const age = now.getTime() - entry.lastAccessed.getTime();
      if (age > this.memoryTTL) {
        this.memories.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired memory entries`);
    }
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memories.clear();
    this.logger.log('Memory service destroyed');
  }
}
