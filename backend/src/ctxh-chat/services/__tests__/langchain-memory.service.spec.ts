import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LangChainMemoryService } from '../langchain-memory.service';
import { createMockConfigService } from './mocks/config.service.mock';

// Mock the LangChain modules
jest.mock('@langchain/classic/memory', () => ({
  BufferMemory: jest.fn().mockImplementation(({ chatHistory }) => ({
    chatHistory,
    loadMemoryVariables: jest.fn().mockResolvedValue({ chat_history: [] }),
    saveContext: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@langchain/core/chat_history', () => ({
  InMemoryChatMessageHistory: jest.fn().mockImplementation(() => ({
    getMessages: jest.fn().mockResolvedValue([]),
    addMessages: jest.fn().mockResolvedValue(undefined),
    addUserMessage: jest.fn().mockResolvedValue(undefined),
    addAIChatMessage: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@langchain/core/messages', () => ({
  HumanMessage: class HumanMessage {
    content: string;
    constructor(content: string) {
      this.content = content;
    }
  },
  AIMessage: class AIMessage {
    content: string;
    constructor(content: string) {
      this.content = content;
    }
  },
  BaseMessage: class BaseMessage {
    content: string;
    constructor(content: string) {
      this.content = content;
    }
  },
}));

describe('LangChainMemoryService', () => {
  let service: LangChainMemoryService;
  let mockConfigService: ReturnType<typeof createMockConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangChainMemoryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LangChainMemoryService>(LangChainMemoryService);
  });

  afterEach(() => {
    // Clean up interval timers
    if (service['cleanupInterval']) {
      clearInterval(service['cleanupInterval']);
    }
    jest.clearAllMocks();
  });

  describe('getMemory', () => {
    it('should create memory for new session', async () => {
      const sessionId = 'new-session-123';
      
      const memory = await service.getMemory(sessionId);

      expect(memory).toBeDefined();
      expect(memory.chatHistory).toBeDefined();
    });

    it('should reuse existing memory for same session', async () => {
      const sessionId = 'existing-session-456';
      
      const memory1 = await service.getMemory(sessionId);
      const memory2 = await service.getMemory(sessionId);

      expect(memory1).toBe(memory2);
    });

    it('should create different memories for different sessions', async () => {
      const sessionId1 = 'session-1';
      const sessionId2 = 'session-2';
      
      const memory1 = await service.getMemory(sessionId1);
      const memory2 = await service.getMemory(sessionId2);

      expect(memory1).not.toBe(memory2);
    });
  });

  describe('getFormattedHistory', () => {
    it('should return empty string for non-existent session', async () => {
      const history = await service.getFormattedHistory('non-existent-session');
      
      expect(history).toBe('');
    });

    it('should return formatted history for existing session', async () => {
      const sessionId = 'session-history-test';
      
      await service.getMemory(sessionId);
      const history = await service.getFormattedHistory(sessionId);

      expect(typeof history).toBe('string');
    });
  });

  describe('getMessages', () => {
    it('should return empty array for non-existent session', async () => {
      const messages = await service.getMessages('non-existent');
      
      expect(messages).toEqual([]);
    });

    it('should return messages array for existing session', async () => {
      const sessionId = 'session-raw-messages';
      
      await service.getMemory(sessionId);
      const messages = await service.getMessages(sessionId);

      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe('saveInteraction', () => {
    it('should save interaction correctly', async () => {
      const sessionId = 'session-save-test';
      const userMessage = 'Hello, how are you?';
      const aiResponse = 'I am doing well, thank you!';

      await service.getMemory(sessionId);
      await service.saveInteraction(sessionId, userMessage, aiResponse);

      const metadata = service.getSessionMetadata(sessionId);
      expect(metadata.exists).toBe(true);
      expect(metadata.turnCount).toBe(1);
    });

    it('should create memory if session does not exist', async () => {
      const sessionId = 'new-session-for-save';
      const userMessage = 'Test';
      const aiResponse = 'Response';

      await service.saveInteraction(sessionId, userMessage, aiResponse);

      const metadata = service.getSessionMetadata(sessionId);
      expect(metadata.exists).toBe(true);
    });

    it('should increment turn count on each interaction', async () => {
      const sessionId = 'session-turn-count';
      
      await service.getMemory(sessionId);
      
      await service.saveInteraction(sessionId, 'msg1', 'res1');
      expect(service.getSessionMetadata(sessionId).turnCount).toBe(1);
      
      await service.saveInteraction(sessionId, 'msg2', 'res2');
      expect(service.getSessionMetadata(sessionId).turnCount).toBe(2);
    });
  });

  describe('addMessages', () => {
    it('should add messages to existing session', async () => {
      const sessionId = 'session-add-messages';
      const { HumanMessage, AIMessage } = require('@langchain/core/messages');
      
      await service.getMemory(sessionId);
      
      const messages = [
        new HumanMessage('Hello'),
        new AIMessage('Hi there!'),
      ];
      
      await service.addMessages(sessionId, messages);
      
      const metadata = service.getSessionMetadata(sessionId);
      expect(metadata.exists).toBe(true);
    });

    it('should create memory if session does not exist', async () => {
      const sessionId = 'new-session-add-messages';
      const { HumanMessage } = require('@langchain/core/messages');
      
      await service.addMessages(sessionId, [new HumanMessage('Test')]);
      
      const metadata = service.getSessionMetadata(sessionId);
      expect(metadata.exists).toBe(true);
    });
  });

  describe('clearMemory', () => {
    it('should clear memory for session', async () => {
      const sessionId = 'session-to-clear';
      
      await service.getMemory(sessionId);
      expect(service.getSessionMetadata(sessionId).exists).toBe(true);
      
      await service.clearMemory(sessionId);
      
      expect(service.getSessionMetadata(sessionId).exists).toBe(false);
    });

    it('should do nothing for non-existent session', async () => {
      await expect(service.clearMemory('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getSessionMetadata', () => {
    it('should return metadata with exists=false for non-existent session', () => {
      const metadata = service.getSessionMetadata('non-existent');
      
      expect(metadata.exists).toBe(false);
      expect(metadata.turnCount).toBe(0);
      expect(metadata.lastAccessed).toBeNull();
    });

    it('should return correct metadata for existing session', async () => {
      const sessionId = 'session-metadata-test';
      
      await service.getMemory(sessionId);
      const metadata = service.getSessionMetadata(sessionId);

      expect(metadata.exists).toBe(true);
      expect(metadata.turnCount).toBe(0);
      expect(metadata.lastAccessed).toBeInstanceOf(Date);
    });

    it('should update lastAccessed when memory is accessed', async () => {
      const sessionId = 'session-last-accessed';
      
      await service.getMemory(sessionId);
      const metadata1 = service.getSessionMetadata(sessionId);
      
      // Wait a bit and access again
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.getMemory(sessionId);
      const metadata2 = service.getSessionMetadata(sessionId);

      expect(metadata2.lastAccessed!.getTime()).toBeGreaterThanOrEqual(
        metadata1.lastAccessed!.getTime()
      );
    });
  });

  describe('getActiveSessions', () => {
    it('should return empty array when no sessions', () => {
      const sessions = service.getActiveSessions();
      expect(sessions).toEqual([]);
    });

    it('should return all active session IDs', async () => {
      await service.getMemory('session-1');
      await service.getMemory('session-2');
      await service.getMemory('session-3');

      const sessions = service.getActiveSessions();

      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
      expect(sessions).toContain('session-3');
      expect(sessions.length).toBe(3);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', async () => {
      await service.getMemory('stats-session-1');
      await service.getMemory('stats-session-2');

      const stats = service.getStats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.maxSessions).toBe(100); // From mock config
      expect(stats.memoryUsagePercent).toBe(2); // 2/100 * 100
    });

    it('should return zero stats when no sessions', () => {
      const stats = service.getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.memoryUsagePercent).toBe(0);
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear all memories on destroy', async () => {
      await service.getMemory('session-1');
      await service.getMemory('session-2');

      service.onModuleDestroy();

      expect(service.getActiveSessions()).toEqual([]);
    });
  });
});
