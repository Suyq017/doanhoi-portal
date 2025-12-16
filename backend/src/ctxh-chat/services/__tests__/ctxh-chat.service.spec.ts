import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CtxhChatService } from '../ctxh-chat.service';
import { CtxhRetrievalService } from '../ctxh-retrieval.service';
import { ConversationService } from '../conversation.service';
import { ResponseFormatterService } from '../response-formatter.service';
import { EmbeddingService } from '../embedding.service';
import { GoogleGenAI } from '@google/genai';

describe('CtxhChatService - RAG Pipeline Integration', () => {
  let service: CtxhChatService;
  let retrievalService: CtxhRetrievalService;
  let conversationService: ConversationService;
  let responseFormatter: ResponseFormatterService;
  let geminiClient: any;

  const mockRetrievalService = {
    retrieveRelevantDocuments: jest.fn().mockResolvedValue({
      documents: [
        {
          content: 'Hoạt động trồng cây xanh tại công viên Gia Định',
          metadata: {
            activityId: 'activity-1',
            activityName: 'Trồng cây xanh',
            organizationName: 'Đoàn trường',
            categoryName: 'Môi trường',
            location: 'Công viên Gia Định',
            startDate: new Date('2025-01-15'),
            endDate: new Date('2025-01-16'),
            totalDays: 2,
            status: 'ACTIVE',
          },
          similarityScore: 0.85,
          source: 'ctxh_activity:activity-1',
        },
      ],
      totalResults: 1,
      retrievalTime: 45,
      query: 'hoạt động trồng cây',
    }),
  };

  const mockConversationService = {
    getOrCreateSession: jest.fn().mockResolvedValue({
      sessionId: 'session-123',
      userId: 'user-123',
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
    }),
    addMessage: jest.fn().mockResolvedValue({
      sessionId: 'session-123',
      userId: 'user-123',
      messages: [
        { role: 'user', content: 'Test', timestamp: new Date() },
      ],
      metadata: {
        startTime: new Date(),
        lastActive: new Date(),
        turnCount: 1,
        totalTokens: 100,
      },
      context: { recentTopics: [], userPreferences: {} },
    }),
  };

  const mockResponseFormatter = {
    formatResponse: jest.fn().mockResolvedValue({
      content: 'Có hoạt động **Trồng cây xanh** do 🏢 **Đoàn trường** tổ chức.',
      sources: [
        {
          activityId: 'activity-1',
          activityName: 'Trồng cây xanh',
          organizationName: 'Đoàn trường',
          categoryName: 'Môi trường',
          similarityScore: 0.85,
          link: '/activities/activity-1',
        },
      ],
      followUpSuggestions: [
        'Làm thế nào để đăng ký tham gia hoạt động "Trồng cây xanh"?',
        'Có những hoạt động CTXH nào khác của Đoàn trường?',
      ],
      metadata: {
        responseType: 'single_activity',
        confidence: 85,
        processingTime: 45,
      },
    }),
  };

  const mockGeminiClient = {
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: 'Có hoạt động Trồng cây xanh do Đoàn trường tổ chức vào ngày 15-16/01/2025 tại Công viên Gia Định. Hoạt động này tính 2 ngày CTXH.',
      }),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        GEMINI_API_KEY: 'test-key',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CtxhChatService,
        {
          provide: 'GEMINI_CLIENT',
          useValue: mockGeminiClient,
        },
        {
          provide: 'CHAT_MODEL',
          useValue: 'gemini-2.5-flash',
        },
        {
          provide: CtxhRetrievalService,
          useValue: mockRetrievalService,
        },
        {
          provide: ConversationService,
          useValue: mockConversationService,
        },
        {
          provide: ResponseFormatterService,
          useValue: mockResponseFormatter,
        },
        {
          provide: EmbeddingService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CtxhChatService>(CtxhChatService);
    retrievalService = module.get<CtxhRetrievalService>(CtxhRetrievalService);
    conversationService = module.get<ConversationService>(ConversationService);
    responseFormatter = module.get<ResponseFormatterService>(ResponseFormatterService);
    geminiClient = mockGeminiClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processMessage - Full RAG Pipeline', () => {
    it('should execute complete RAG pipeline successfully', async () => {
      const message = 'Có hoạt động CTXH nào về trồng cây không?';
      const userId = 'user-123';

      const response = await service.processMessage(message, undefined, userId);

      // Verify RAG pipeline steps
      expect(conversationService.getOrCreateSession).toHaveBeenCalledWith(userId, undefined);
      expect(conversationService.addMessage).toHaveBeenCalledTimes(2); // User + Assistant
      expect(retrievalService.retrieveRelevantDocuments).toHaveBeenCalledWith(
        message,
        expect.objectContaining({ k: 3, useMMR: true })
      );
      expect(geminiClient.models.generateContent).toHaveBeenCalled();
      expect(responseFormatter.formatResponse).toHaveBeenCalled();

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.sessionId).toBe('session-123');
      expect(response.response).toContain('Trồng cây xanh');
      expect(response.sources).toHaveLength(1);
      expect(response.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should maintain conversation context across multiple turns', async () => {
      const message1 = 'Tôi muốn tham gia hoạt động CTXH';
      const message2 = 'Hoạt động nào phù hợp với tôi?';
      const sessionId = 'session-123';
      const userId = 'user-123';

      // First turn
      await service.processMessage(message1, sessionId, userId);
      
      // Second turn - should use same session
      await service.processMessage(message2, sessionId, userId);

      expect(conversationService.getOrCreateSession).toHaveBeenCalledTimes(2);
      expect(conversationService.getOrCreateSession).toHaveBeenNthCalledWith(
        2,
        userId,
        sessionId
      );
    });

    it('should include retrieved documents in generation prompt', async () => {
      const message = 'Hoạt động trồng cây ở đâu?';

      await service.processMessage(message);

      const geminiCall = geminiClient.models.generateContent.mock.calls[0][0];
      expect(geminiCall.contents).toContain('Hoạt động: Trồng cây xanh');
      expect(geminiCall.contents).toContain('Tổ chức: Đoàn trường');
      expect(geminiCall.contents).toContain('Địa điểm: Công viên Gia Định');
    });

    it('should pass conversation history to generation', async () => {
      mockConversationService.getOrCreateSession.mockResolvedValueOnce({
        sessionId: 'session-123',
        userId: 'user-123',
        messages: [
          { role: 'user', content: 'Xin chào', timestamp: new Date() },
          { role: 'assistant', content: 'Xin chào!', timestamp: new Date() },
        ],
        metadata: {
          startTime: new Date(),
          lastActive: new Date(),
          turnCount: 1,
          totalTokens: 50,
        },
        context: { recentTopics: [], userPreferences: {} },
      });

      await service.processMessage('Có hoạt động nào không?', 'session-123');

      const geminiCall = geminiClient.models.generateContent.mock.calls[0][0];
      expect(geminiCall.contents).toContain('Lịch sử trò chuyện');
    });
  });

  describe('Response Quality', () => {
    it('should provide accurate responses with source attribution', async () => {
      const response = await service.processMessage('Hoạt động trồng cây');

      expect(response.response).toBeDefined();
      expect(response.sources).toHaveLength(1);
      expect(response.sources[0].activityName).toBe('Trồng cây xanh');
      expect(response.sources[0].similarityScore).toBeGreaterThan(0.7);
    });

    it('should include follow-up suggestions', async () => {
      const response = await service.processMessage('Hoạt động CTXH', undefined, undefined, {
        addFollowUpSuggestions: true,
      });

      expect(response.followUpSuggestions).toBeDefined();
      expect(response.followUpSuggestions.length).toBeGreaterThan(0);
    });

    it('should format response with markdown enhancements', async () => {
      const response = await service.processMessage('Trồng cây', undefined, undefined, {
        enableMarkdown: true,
      });

      expect(responseFormatter.formatResponse).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ enableMarkdown: true })
      );
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 2 seconds for typical queries', async () => {
      const startTime = Date.now();
      
      await service.processMessage('Hoạt động CTXH');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('should handle concurrent chat requests', async () => {
      const messages = [
        'Hoạt động trồng cây',
        'Tình nguyện dạy học',
        'Hiến máu nhân đạo',
      ];

      const promises = messages.map((msg, i) =>
        service.processMessage(msg, undefined, `user-${i}`)
      );

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.response).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle retrieval errors gracefully', async () => {
      mockRetrievalService.retrieveRelevantDocuments.mockRejectedValueOnce(
        new Error('Retrieval failed')
      );

      const response = await service.processMessage('test query');

      expect(response).toBeDefined();
      expect(response.response).toContain('Xin lỗi');
    });

    it('should handle generation errors with fallback', async () => {
      mockGeminiClient.models.generateContent.mockRejectedValueOnce(
        new Error('Generation failed')
      );

      const response = await service.processMessage('test query');

      expect(response).toBeDefined();
      // Should return fallback response
    });

    it('should handle conversation service errors', async () => {
      mockConversationService.getOrCreateSession.mockRejectedValueOnce(
        new Error('Session error')
      );

      const response = await service.processMessage('test query');

      // Should return fallback response on session error
      expect(response).toBeDefined();
      expect(response.response).toContain('Xin lỗi');
    });
  });

  describe('System Prompt Engineering', () => {
    it('should use appropriate system prompt for CTXH context', async () => {
      await service.processMessage('Hoạt động CTXH');

      const geminiCall = geminiClient.models.generateContent.mock.calls[0][0];
      expect(geminiCall.contents).toContain('trợ lý ảo');
      expect(geminiCall.contents).toContain('Công tác xã hội');
      expect(geminiCall.contents).toContain('NHIỆM VỤ CHÍNH');
    });

    it('should include dynamic context when available', async () => {
      mockConversationService.getOrCreateSession.mockResolvedValueOnce({
        sessionId: 'session-123',
        userId: 'user-123',
        messages: [],
        metadata: {
          startTime: new Date(),
          lastActive: new Date(),
          turnCount: 0,
          totalTokens: 0,
        },
        context: {
          recentTopics: ['Môi trường', 'Giáo dục'],
          userPreferences: {},
        },
      });

      await service.processMessage('Hoạt động nào phù hợp?', 'session-123');

      const geminiCall = geminiClient.models.generateContent.mock.calls[0][0];
      expect(geminiCall.contents).toContain('CÁC CHỦ ĐỀ ĐÃ THẢO LUẬN');
    });
  });

  describe('Feedback Collection', () => {
    it('should accept positive feedback', async () => {
      const feedback = {
        sessionId: 'session-123',
        rating: 'positive' as const,
        comment: 'Rất hữu ích!',
      };

      await expect(
        service.submitFeedback(feedback)
      ).resolves.not.toThrow();
    });

    it('should accept negative feedback with comment', async () => {
      const feedback = {
        sessionId: 'session-123',
        rating: 'negative' as const,
        comment: 'Thông tin không chính xác',
      };

      await expect(
        service.submitFeedback(feedback)
      ).resolves.not.toThrow();
    });
  });
});
