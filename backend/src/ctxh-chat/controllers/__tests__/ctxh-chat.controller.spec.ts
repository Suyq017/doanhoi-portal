jest.mock('../../services/langchain-rag-chain.service', () => ({
  LangChainRagChainService: class {},
}));

jest.mock('../../services/staff-agent.service', () => ({
  StaffAgentService: class {},
}));

import { CtxhChatController } from '../ctxh-chat.controller';

describe('CtxhChatController', () => {
  let controller: CtxhChatController;
  let ragChainService: {
    invoke: jest.Mock;
    stream: jest.Mock;
  };
  let memoryService: {
    getMessages: jest.Mock;
    getSessionMetadata: jest.Mock;
    clearMemory: jest.Mock;
    getStats: jest.Mock;
    getActiveSessions: jest.Mock;
  };
  let ingestionService: {
    runFullIngestion: jest.Mock;
    runIncrementalUpdate: jest.Mock;
    processActivity: jest.Mock;
    deleteActivity: jest.Mock;
    getIngestionStats: jest.Mock;
    healthCheck: jest.Mock;
  };
  let vectorStoreService: {
    isInitialized: jest.Mock;
  };
  let universalEmbeddingsService: {
    healthCheck: jest.Mock;
    isUsingLocalModel: jest.Mock;
    getModelName: jest.Mock;
    getDimension: jest.Mock;
  };
  let universalLLMService: {
    healthCheck: jest.Mock;
    getModelName: jest.Mock;
  };
  let vectorSyncService: {
    getQueueStatus: jest.Mock;
    forceSyncAll: jest.Mock;
  };
  let userContextService: {
    getTrainingDepartmentName: jest.Mock;
  };
  let followUpSuggestionsService: {
    generate: jest.Mock;
  };

  beforeEach(() => {
    ragChainService = {
      invoke: jest.fn(),
      stream: jest.fn(),
    };

    memoryService = {
      getMessages: jest.fn(),
      getSessionMetadata: jest.fn(),
      clearMemory: jest.fn(),
      getStats: jest.fn(),
      getActiveSessions: jest.fn(),
    };

    ingestionService = {
      runFullIngestion: jest.fn(),
      runIncrementalUpdate: jest.fn(),
      processActivity: jest.fn(),
      deleteActivity: jest.fn(),
      getIngestionStats: jest.fn(),
      healthCheck: jest.fn(),
    };

    vectorStoreService = {
      isInitialized: jest.fn(),
    };

    universalEmbeddingsService = {
      healthCheck: jest.fn(),
      isUsingLocalModel: jest.fn(),
      getModelName: jest.fn(),
      getDimension: jest.fn(),
    };

    universalLLMService = {
      healthCheck: jest.fn(),
      getModelName: jest.fn(),
    };

    vectorSyncService = {
      getQueueStatus: jest.fn(),
      forceSyncAll: jest.fn(),
    };

    userContextService = {
      getTrainingDepartmentName: jest.fn().mockResolvedValue('Khoa CNTT'),
    };

    followUpSuggestionsService = {
      generate: jest.fn().mockResolvedValue([
        'Cho tôi biết thêm chi tiết về hoạt động này',
        'Làm sao để đăng ký tham gia?',
        'Có hoạt động nào khác trong tháng này không?',
      ]),
    };

    controller = new CtxhChatController(
      ragChainService as any,
      memoryService as any,
      ingestionService as any,
      vectorStoreService as any,
      universalEmbeddingsService as any,
      universalLLMService as any,
      vectorSyncService as any,
      {} as any,
      userContextService as any,
      {} as any,
      followUpSuggestionsService as any,
    );
  });

  it('should send message and map sources plus follow-up suggestions', async () => {
    const docs = [
      {
        pageContent: 'Đây là nội dung hoạt động CTXH rất dài để kiểm tra ánh xạ.',
        metadata: {
          activityId: 'a1',
          activityName: 'Hoạt động 1',
          organizationName: 'Khoa A',
          score: 0.87,
        },
      },
    ];

    ragChainService.invoke.mockResolvedValue({
      response: 'Thông tin về hoạt động CTXH và thời gian diễn ra.',
      sources: docs,
      responseTime: 321,
      sessionId: 'session-1',
    });

    jest.spyOn(global.Date, 'now').mockReturnValue(1714291200000);

    const result = await controller.sendMessage(
      { message: 'Xin chào', evaluation_mode: true } as any,
      { user: { id: 'user-1' } } as any,
    );

    expect(ragChainService.invoke).toHaveBeenCalledWith(
      'Xin chào',
      expect.stringContaining('session_user-1_'),
      expect.objectContaining({
        k: 5,
        useMMR: false,
        includeHistory: true,
        currentDate: expect.any(String),
        currentDayOfWeek: expect.any(String),
        currentDatetime: expect.any(String),
      }),
    );
    expect(result.sessionId).toBe('session-1');
    expect(result.sources).toEqual([
      expect.objectContaining({
        activityId: 'a1',
        activityName: 'Hoạt động 1',
        organizationName: 'Khoa A',
        similarityScore: 0.87,
      }),
    ]);
    expect(result.followUpSuggestions.length).toBeGreaterThan(0);
    expect(result.confidence).toBe(0.6);
    expect(result.contexts).toEqual(['Đây là nội dung hoạt động CTXH rất dài để kiểm tra ánh xạ.']);
  });

  it('should build default session id and calculate confidence for multiple sources', async () => {
    ragChainService.invoke.mockResolvedValue({
      response: 'Kết quả có hoạt động và thời gian.',
      sources: [
        { pageContent: 'A', metadata: { activityId: 'a1', score: 0.9 } },
        { pageContent: 'B', metadata: { activityId: 'b1', score: 0.8 } },
        { pageContent: 'C', metadata: { activityId: 'c1', score: 0.7 } },
      ],
      responseTime: 12,
    });

    const result = await controller.sendMessage(
      { message: 'test' } as any,
      { user: { id: 'user-x' } } as any,
    );

    expect(result.sessionId).toMatch(/^session_user-x_/);
    expect(result.confidence).toBe(0.9);
  });

  it('should stream chunks and emit completion event', async () => {
    ragChainService.stream.mockImplementation(async function* () {
      yield 'Xin chào ';
      yield 'bạn';
    });

    const events: any[] = [];
    await new Promise<void>((resolve, reject) => {
      const observable = controller.streamMessage(
        { message: 'test' } as any,
        { user: { id: 'user-1' } } as any,
      );

      const subscription = observable.subscribe({
        next: (event) => events.push(event),
        error: reject,
        complete: () => {
          subscription.unsubscribe();
          resolve();
        },
      });
    });

    expect(events[0].data).toEqual({ type: 'content', content: 'Xin chào ', isLast: false });
    expect(events[1].data).toEqual({ type: 'content', content: 'bạn', isLast: false });
    expect(events[2].data).toEqual({ type: 'complete', fullResponse: 'Xin chào bạn' });
  });

  it('should get history and clear session', async () => {
    memoryService.getMessages.mockResolvedValue([
      { _getType: () => 'human', content: 'Xin chào' },
      { _getType: () => 'ai', content: 'Chào bạn' },
    ]);
    memoryService.getSessionMetadata.mockReturnValue({ turnCount: 2, lastAccessed: new Date('2026-04-28T00:00:00.000Z') });

    const history = await controller.getHistory('session-1', {} as any);
    expect(history.messages).toEqual([
      { role: 'user', content: 'Xin chào' },
      { role: 'assistant', content: 'Chào bạn' },
    ]);
    expect(history.metadata.turnCount).toBe(2);

    await expect(controller.clearSession('session-1', {} as any)).resolves.toEqual({ message: 'Session cleared successfully' });
    expect(memoryService.clearMemory).toHaveBeenCalledWith('session-1');
  });

  it('should support ingestion, queue, health and stats endpoints', async () => {
    ingestionService.runFullIngestion.mockResolvedValue({ errors: [], processed: 10 });
    ingestionService.runIncrementalUpdate.mockResolvedValue({ errors: ['x'], processed: 2 });
    ingestionService.processActivity.mockResolvedValue(undefined);
    ingestionService.deleteActivity.mockResolvedValue(undefined);
    ingestionService.getIngestionStats.mockReturnValue({ total: 99 });
    ingestionService.healthCheck.mockReturnValue({ ok: true });
    vectorSyncService.getQueueStatus.mockReturnValue({ waiting: 1 });
    vectorSyncService.forceSyncAll.mockResolvedValue(undefined);
    vectorStoreService.isInitialized.mockReturnValue(true);
    universalEmbeddingsService.healthCheck.mockResolvedValue(true);
    universalEmbeddingsService.isUsingLocalModel.mockReturnValue(true);
    universalEmbeddingsService.getModelName.mockReturnValue('embed-model');
    universalEmbeddingsService.getDimension.mockReturnValue(1024);
    universalLLMService.healthCheck.mockResolvedValue(false);
    universalLLMService.getModelName.mockReturnValue('llm-model');
    memoryService.getStats.mockReturnValue({ sessions: 2 });
    memoryService.getActiveSessions.mockReturnValue(Array.from({ length: 120 }, (_, i) => `s${i + 1}`));

    await expect(controller.runFullIngestion()).resolves.toEqual(expect.objectContaining({ success: true, processed: 10 }));
    await expect(controller.runIncrementalUpdate('2026-04-27')).resolves.toEqual(expect.objectContaining({ success: false, processed: 2 }));
    await expect(controller.processActivity('a1')).resolves.toEqual({ success: true, message: 'Activity a1 processed successfully' });
    await expect(controller.deleteActivity('a1')).resolves.toEqual({ success: true, message: 'Embeddings for activity a1 deleted successfully' });
    expect(await controller.getIngestionStats()).toEqual({ total: 99 });
    expect(await controller.getQueueStatus()).toEqual({ waiting: 1 });
    await expect(controller.forceSyncAll()).resolves.toEqual({ message: 'Full sync job added to queue', queueName: 'vectorize_queue' });
    expect(await controller.healthCheck()).toEqual({ ok: true });
    expect(await controller.vectorStoreHealthCheck()).toEqual({ status: 'healthy', initialized: true });
    expect(await controller.checkModelsHealth()).toEqual(expect.objectContaining({
      status: 'unhealthy',
      modelType: 'Ollama (Local)',
      embeddings: expect.objectContaining({ healthy: true, model: 'embed-model', dimension: 1024 }),
      llm: expect.objectContaining({ healthy: false, model: 'llm-model' }),
    }));
    expect(await controller.getMemoryStats()).toEqual({ sessions: 2 });

    const sessions = await controller.getActiveSessions();
    expect(sessions.count).toBe(120);
    expect(sessions.sessions).toHaveLength(100);
  });

  it('should generate expected follow-up suggestions and confidence edge cases', async () => {
    const helperController = controller as any;
    expect(helperController.generateFollowUpSuggestions('Không có nội dung')).toEqual([
      'Có hoạt động CTXH nào đang mở đăng ký?',
      'Tìm hoạt động CTXH theo địa điểm',
      'Hoạt động nào có nhiều ngày CTXH nhất?',
    ]);
    expect(helperController.generateFollowUpSuggestions('Có hoạt động CTXH vào ngày mai không?')).toEqual([
      'Cho tôi biết thêm chi tiết về hoạt động này',
      'Làm sao để đăng ký tham gia?',
      'Có hoạt động nào khác trong tháng này không?',
    ]);
    expect(helperController.calculateConfidence(0)).toBe(0.3);
    expect(helperController.calculateConfidence(1)).toBe(0.6);
    expect(helperController.calculateConfidence(2)).toBe(0.75);
    expect(helperController.calculateConfidence(3)).toBe(0.9);
    expect(helperController.calculateConfidence(999)).toBe(0.9);
  });
});
