import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConversationService } from '../conversation.service';
import Redis from 'ioredis';
import { GoogleGenAI } from '@google/genai';

describe('ConversationService', () => {
  let service: ConversationService;
  let redisClient: jest.Mocked<Redis>;
  let geminiClient: any;

  const mockRedisClient = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
  };

  const mockGeminiClient = {
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: 'Tóm tắt: Sinh viên hỏi về hoạt động trồng cây và tình nguyện.',
      }),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        MAX_CONVERSATION_HISTORY: 20,
        MAX_CONVERSATION_TOKENS: 4000,
        MESSAGES_TO_KEEP: 10,
        SESSION_TTL: 3600,
        GEMINI_API_KEY: 'test-key',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
        {
          provide: 'GEMINI_CLIENT',
          useValue: mockGeminiClient,
        },
        {
          provide: 'CHAT_MODEL',
          useValue: 'gemini-2.5-flash',
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    redisClient = mockRedisClient as any;
    geminiClient = mockGeminiClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateSession', () => {
    it('should create new session when none exists', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const session = await service.getOrCreateSession('user-123');

      expect(session).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.messages).toHaveLength(0);
      expect(session.metadata.turnCount).toBe(0);
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });

    it('should retrieve existing session from Redis', async () => {
      const existingSession = {
        sessionId: 'session-123',
        userId: 'user-123',
        messages: [
          {
            role: 'user',
            content: 'Xin chào',
            timestamp: new Date(),
          },
        ],
        metadata: {
          startTime: new Date(),
          lastActive: new Date(),
          turnCount: 1,
          totalTokens: 50,
        },
        context: {
          recentTopics: [],
          userPreferences: {},
        },
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(existingSession));

      const session = await service.getOrCreateSession('user-123', 'session-123');

      expect(session.sessionId).toBe('session-123');
      expect(session.messages).toHaveLength(1);
    });

    it('should retrieve existing session correctly', async () => {
      const oldDate = new Date('2025-01-01');
      const existingSession = {
        sessionId: 'session-123',
        userId: 'user-123',
        messages: [],
        metadata: {
          startTime: oldDate,
          lastActive: oldDate,
          turnCount: 0,
          totalTokens: 0,
        },
        context: { recentTopics: [], userPreferences: {} },
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(existingSession));

      const session = await service.getOrCreateSession('user-123', 'session-123');

      // Should return the existing session
      expect(session.sessionId).toBe('session-123');
      expect(session.userId).toBe('user-123');
      expect(session.messages).toHaveLength(0);
    });
  });

  describe('addMessage', () => {
    it('should add user message to session', async () => {
      const existingSession = {
        sessionId: 'session-123',
        userId: 'user-123',
        messages: [],
        metadata: {
          startTime: new Date(),
          lastActive: new Date(),
          turnCount: 0,
          totalTokens: 0,
        },
        context: { recentTopics: [], userPreferences: {} },
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(existingSession));

      const updatedSession = await service.addMessage('session-123', {
        role: 'user',
        content: 'Có hoạt động CTXH nào không?',
        timestamp: new Date(),
      });

      expect(updatedSession.messages).toHaveLength(1);
      expect(updatedSession.messages[0].role).toBe('user');
      expect(updatedSession.metadata.turnCount).toBe(1);
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });

    it('should add assistant message to session', async () => {
      const existingSession = {
        sessionId: 'session-123',
        userId: 'user-123',
        messages: [
          { role: 'user', content: 'Xin chào', timestamp: new Date() },
        ],
        metadata: {
          startTime: new Date(),
          lastActive: new Date(),
          turnCount: 1,
          totalTokens: 50,
        },
        context: { recentTopics: [], userPreferences: {} },
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(existingSession));

      const updatedSession = await service.addMessage('session-123', {
        role: 'assistant',
        content: 'Xin chào! Tôi có thể giúp gì cho bạn?',
        timestamp: new Date(),
      });

      expect(updatedSession.messages).toHaveLength(2);
      expect(updatedSession.messages[1].role).toBe('assistant');
      expect(updatedSession.metadata.turnCount).toBe(1); // Turn count only increments for user messages
    });

    it('should update total token count', async () => {
      const existingSession = {
        sessionId: 'session-123',
        userId: 'user-123',
        messages: [],
        metadata: {
          startTime: new Date(),
          lastActive: new Date(),
          turnCount: 0,
          totalTokens: 0,
        },
        context: { recentTopics: [], userPreferences: {} },
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(existingSession));

      const longMessage = 'Đây là một câu hỏi rất dài về các hoạt động CTXH '.repeat(10);
      
      const updatedSession = await service.addMessage('session-123', {
        role: 'user',
        content: longMessage,
        timestamp: new Date(),
      });

      expect(updatedSession.metadata.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('manageConversationWindow', () => {
    it('should trigger summarization when message count exceeds limit', async () => {
      const messages = Array.from({ length: 25 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date(),
      }));

      const existingSession = {
        sessionId: 'session-123',
        userId: 'user-123',
        messages: [],
        metadata: {
          startTime: new Date(),
          lastActive: new Date(),
          turnCount: 12,
          totalTokens: 500,
        },
        context: { recentTopics: [], userPreferences: {} },
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(existingSession));

      // Add messages one by one to trigger window management
      let session = existingSession;
      for (const message of messages) {
        mockRedisClient.get.mockResolvedValue(JSON.stringify(session));
        session = await service.addMessage('session-123', message as any);
      }

      // Should have called Gemini for summarization
      expect(mockGeminiClient.models.generateContent).toHaveBeenCalled();
    });

    it('should keep recent messages after summarization', async () => {
      // This test would verify that MESSAGES_TO_KEEP recent messages are preserved
      // after summarization is triggered
    });
  });

  describe('clearSession', () => {
    it('should delete session from Redis', async () => {
      await service.clearSession('session-123', 'user-123');

      expect(mockRedisClient.del).toHaveBeenCalledWith('conversation:session-123');
    });
  });

  describe('Session TTL Management', () => {
    it('should set TTL when saving session', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await service.getOrCreateSession('user-123');

      expect(mockRedisClient.setex).toHaveBeenCalled();
      const ttlArg = mockRedisClient.setex.mock.calls[0][1];
      expect(ttlArg).toBe(3600); // Default TTL from config
    });
  });

  describe('Performance Requirements', () => {
    it('should handle session operations within acceptable time', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const startTime = Date.now();
      await service.getOrCreateSession('user-123');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should handle concurrent session operations', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const promises = Array.from({ length: 10 }, (_, i) =>
        service.getOrCreateSession(`user-${i}`)
      );

      const sessions = await Promise.all(promises);

      expect(sessions).toHaveLength(10);
      sessions.forEach((session, i) => {
        expect(session.userId).toBe(`user-${i}`);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      await expect(
        service.getOrCreateSession('user-123')
      ).rejects.toThrow();
    });

    it('should handle malformed session data in Redis', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');

      await expect(
        service.getOrCreateSession('user-123', 'session-123')
      ).rejects.toThrow();
    });
  });
});
