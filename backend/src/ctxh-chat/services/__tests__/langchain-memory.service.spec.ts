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

  describe('setMentionedActivities and getMentionedActivities', () => {
    it('should store mentioned activities for a session', () => {
      const sessionId = 'activity-session-1';
      const activities = [
        { activityId: '101', activityName: 'Activity A', isRecruiting: true },
        { activityId: '102', activityName: 'Activity B', isRecruiting: false },
      ];

      service.setMentionedActivities(sessionId, activities);

      const retrieved = service.getMentionedActivities(sessionId);
      expect(retrieved).toEqual(activities);
    });

    it('should return empty for non-existent session', () => {
      const retrieved = service.getMentionedActivities('non-existent');
      expect(retrieved).toEqual([]);
    });

    it('should not add empty activity list', async () => {
      const sessionId = 'activity-session-2';
      await service.getMemory(sessionId);

      service.setMentionedActivities(sessionId, []);

      const retrieved = service.getMentionedActivities(sessionId);
      expect(retrieved).toEqual([]);
    });

    it('should deduplicate activities by ID', () => {
      const sessionId = 'activity-session-3';
      const activity1 = { activityId: '201', activityName: 'Activity 1', isRecruiting: true };
      const activity2 = { activityId: '202', activityName: 'Activity 2', isRecruiting: true };

      // First turn: add activity1 and activity2
      service.setMentionedActivities(sessionId, [activity1, activity2]);

      // Second turn: add activity2 again and a new activity
      const activity3 = { activityId: '203', activityName: 'Activity 3', isRecruiting: false };
      service.setMentionedActivities(sessionId, [activity2, activity3]);

      const retrieved = service.getMentionedActivities(sessionId);

      // Should have unique IDs, with most-recent turn first
      const ids = retrieved.map((a) => a.activityId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length); // All unique
    });

    it('should maintain sliding window of last 3 turns', () => {
      const sessionId = 'activity-session-4';

      // Add activities in 5 separate turns
      for (let i = 1; i <= 5; i++) {
        service.setMentionedActivities(sessionId, [
          { activityId: `${i}00`, activityName: `Activity Turn ${i}`, isRecruiting: true },
        ]);
      }

      const retrieved = service.getMentionedActivities(sessionId, 3);

      // Should have at most 3 turns worth of activities
      expect(retrieved.length).toBeLessThanOrEqual(3);
    });

    it('should order activities with most-recent turn first', () => {
      const sessionId = 'activity-session-5';

      const activity1 = { activityId: '301', activityName: 'Old Activity', isRecruiting: true };
      const activity2 = { activityId: '302', activityName: 'Recent Activity', isRecruiting: true };

      service.setMentionedActivities(sessionId, [activity1]);
      service.setMentionedActivities(sessionId, [activity2]);

      const retrieved = service.getMentionedActivities(sessionId);

      // Most recent (activity2) should come first
      expect(retrieved[0]?.activityId).toBe('302');
    });
  });

  describe('setLastMentionedActivity and getLastMentionedActivity', () => {
    it('should store and retrieve last mentioned activity', () => {
      const sessionId = 'last-activity-session-1';

      service.setLastMentionedActivity(sessionId, '401', 'Single Activity', true);

      const last = service.getLastMentionedActivity(sessionId);

      expect(last).toEqual({
        activityId: '401',
        activityName: 'Single Activity',
        isRecruiting: true,
      });
    });

    it('should return most recent when multiple activities stored', () => {
      const sessionId = 'last-activity-session-2';

      service.setLastMentionedActivity(sessionId, '401', 'First Activity', true);
      service.setLastMentionedActivity(sessionId, '402', 'Second Activity', false);

      const last = service.getLastMentionedActivity(sessionId);

      expect(last?.activityId).toBe('402');
    });

    it('should return null for non-existent session', () => {
      const last = service.getLastMentionedActivity('non-existent');
      expect(last).toBeNull();
    });
  });

  describe('setPendingRegistration and getPendingRegistration', () => {
    it('should store pending registration', async () => {
      const sessionId = 'pending-session-1';
      await service.getMemory(sessionId);

      service.setPendingRegistration(sessionId, '501', 'Pending Activity');

      const pending = service.getPendingRegistration(sessionId);

      expect(pending).toEqual({
        activityId: '501',
        activityName: 'Pending Activity',
      });
    });

    it('should return null when no pending registration', async () => {
      const sessionId = 'pending-session-2';
      await service.getMemory(sessionId);

      const pending = service.getPendingRegistration(sessionId);

      expect(pending).toBeNull();
    });

    it('should return null for non-existent session', () => {
      const pending = service.getPendingRegistration('non-existent');

      expect(pending).toBeNull();
    });

    it('should update pending registration when called multiple times', async () => {
      const sessionId = 'pending-session-3';
      await service.getMemory(sessionId);

      service.setPendingRegistration(sessionId, '501', 'Activity 1');
      service.setPendingRegistration(sessionId, '502', 'Activity 2');

      const pending = service.getPendingRegistration(sessionId);

      expect(pending?.activityId).toBe('502');
    });
  });

  describe('clearPendingRegistration', () => {
    it('should clear pending registration', async () => {
      const sessionId = 'clear-pending-session-1';
      await service.getMemory(sessionId);

      service.setPendingRegistration(sessionId, '601', 'Activity to Clear');
      expect(service.getPendingRegistration(sessionId)).toBeDefined();

      service.clearPendingRegistration(sessionId);

      expect(service.getPendingRegistration(sessionId)).toBeNull();
    });

    it('should not throw for non-existent session', () => {
      expect(() => {
        service.clearPendingRegistration('non-existent');
      }).not.toThrow();
    });

    it('should not affect if no pending registration exists', async () => {
      const sessionId = 'clear-pending-session-2';
      await service.getMemory(sessionId);

      service.clearPendingRegistration(sessionId);

      expect(service.getPendingRegistration(sessionId)).toBeNull();
    });
  });

  describe('turnCount tracking', () => {
    it('should increment turn count on saveInteraction', async () => {
      const sessionId = 'turn-count-session-1';

      let metadata = service.getSessionMetadata(sessionId);
      expect(metadata.turnCount).toBe(0);

      await service.saveInteraction(sessionId, 'Q1', 'A1');
      metadata = service.getSessionMetadata(sessionId);
      expect(metadata.turnCount).toBe(1);

      await service.saveInteraction(sessionId, 'Q2', 'A2');
      metadata = service.getSessionMetadata(sessionId);
      expect(metadata.turnCount).toBe(2);
    });

    it('should increment turn count on addMessages', async () => {
      const sessionId = 'turn-count-session-2';
      const { HumanMessage } = require('@langchain/core/messages');

      let metadata = service.getSessionMetadata(sessionId);
      expect(metadata.turnCount).toBe(0);

      await service.addMessages(sessionId, [new HumanMessage('Test')]);
      metadata = service.getSessionMetadata(sessionId);
      expect(metadata.turnCount).toBe(1);

      await service.addMessages(sessionId, [new HumanMessage('Test 2')]);
      metadata = service.getSessionMetadata(sessionId);
      expect(metadata.turnCount).toBe(2);
    });
  });

  describe('getFormattedHistory error handling', () => {
    it('should return empty string when loadMemoryVariables fails', async () => {
      const sessionId = 'error-session-1';
      const memory = await service.getMemory(sessionId);

      // Mock loadMemoryVariables to reject
      memory.loadMemoryVariables = jest.fn().mockRejectedValue(
        new Error('Memory load failed'),
      );

      const result = await service.getFormattedHistory(sessionId);

      expect(result).toBe('');
    });

    it('should return empty string when chat_history is null', async () => {
      const sessionId = 'error-session-2';
      const memory = await service.getMemory(sessionId);

      memory.loadMemoryVariables = jest.fn().mockResolvedValue({
        chat_history: null,
      });

      const result = await service.getFormattedHistory(sessionId);

      expect(result).toBe('');
    });
  });

  describe('getMessages error handling', () => {
    it('should return empty array when loadMemoryVariables fails', async () => {
      const sessionId = 'error-session-3';
      const memory = await service.getMemory(sessionId);

      memory.loadMemoryVariables = jest.fn().mockRejectedValue(
        new Error('Memory load failed'),
      );

      const result = await service.getMessages(sessionId);

      expect(result).toEqual([]);
    });
  });

  describe('saveInteraction error handling', () => {
    it('should handle saveContext errors gracefully', async () => {
      const sessionId = 'error-session-4';
      const memory = await service.getMemory(sessionId);

      memory.saveContext = jest.fn().mockRejectedValue(
        new Error('Save context failed'),
      );

      await expect(service.saveInteraction(sessionId, 'Q', 'A')).resolves.not.toThrow();
    });
  });
});

