import { Test } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
// Mock MCP SDK imports used by several ctxh-chat services (virtual mocks)
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class {},
}), { virtual: true });
jest.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: class {},
}), { virtual: true });

import { CtxhChatController } from '../../ctxh-chat/controllers/ctxh-chat.controller';

describe('CtxhChat integration', () => {
  let app: INestApplication;

  const ragChainService = { invoke: jest.fn() };
  const memoryService = {} as any;
  const ingestionService = {} as any;
  const vectorStoreService = {} as any;
  const universalEmbeddingsService = {} as any;
  const universalLLMService = {} as any;
  const vectorSyncService = {} as any;
  const participationService = { registerSelf: jest.fn() };
  const userContextService = { getTrainingDepartmentName: jest.fn().mockResolvedValue('Khoa CNTT') };
  const staffAgentService = {} as any;
  const followUpSuggestionsService = { generate: jest.fn().mockResolvedValue(['gợi ý 1', 'gợi ý 2']) };

  const makeAuthGuard = (): CanActivate => ({
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      req.user = { id: 'user-1', email: 'student@example.com' };
      return true;
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Use actual class tokens by requiring service classes (so Nest DI can match types)
    const {
      LangChainRagChainService,
    } = require('../../ctxh-chat/services/langchain-rag-chain.service');
    const { LangChainMemoryService } = require('../../ctxh-chat/services/langchain-memory.service');
    const { LangChainIngestionService } = require('../../ctxh-chat/services/langchain-ingestion.service');
    const { LangChainVectorStoreService } = require('../../ctxh-chat/services/langchain-vector-store.service');
    const { UniversalEmbeddingsService } = require('../../ctxh-chat/services/universal-embeddings.service');
    const { UniversalLLMService } = require('../../ctxh-chat/services/universal-llm.service');
    const { CtxhVectorSyncService } = require('../../ctxh-chat/services/ctxh-vector-sync.service');
    const { ParticipationService } = require('../../ctxh/activity/services/participation.service');
    const { UserContextService } = require('../../ctxh-chat/services/user-context.service');
    const { StaffAgentService } = require('../../ctxh-chat/services/staff-agent.service');
    const { FollowUpSuggestionsService } = require('../../ctxh-chat/services/follow-up-suggestions.service');

    const moduleRef = await Test.createTestingModule({
      controllers: [CtxhChatController],
      providers: [
        { provide: LangChainRagChainService, useValue: ragChainService },
        { provide: LangChainMemoryService, useValue: memoryService },
        { provide: LangChainIngestionService, useValue: ingestionService },
        { provide: LangChainVectorStoreService, useValue: vectorStoreService },
        { provide: UniversalEmbeddingsService, useValue: universalEmbeddingsService },
        { provide: UniversalLLMService, useValue: universalLLMService },
        { provide: CtxhVectorSyncService, useValue: vectorSyncService },
        { provide: ParticipationService, useValue: participationService },
        { provide: UserContextService, useValue: userContextService },
        { provide: StaffAgentService, useValue: staffAgentService },
        { provide: FollowUpSuggestionsService, useValue: followUpSuggestionsService },
      ],
    })
      .overrideGuard(require('../../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue(makeAuthGuard())
      .compile();

    app = moduleRef.createNestApplication();
    app.useLogger(false);
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('POST /ctxh-chat/message returns mapped response and suggestions', async () => {
    ragChainService.invoke.mockResolvedValue({
      response: 'Thông tin hoạt động',
      sources: [
        { pageContent: 'nội dung', metadata: { activityId: 'a1', activityName: 'Hoạt động A', organizationName: 'Khoa A', score: 0.5 } },
      ],
      responseTime: 120,
      sessionId: 'sess-1',
    });

    const resp = await request(app.getHttpServer())
      .post('/ctxh-chat/message')
      .send({ message: 'Xin chào', sessionId: 'test-session' })
      .expect(201);

    expect(resp.body.response).toContain('Thông tin hoạt động');
    expect(resp.body.sources).toBeDefined();
    expect(resp.body.followUpSuggestions).toBeDefined();
    expect(ragChainService.invoke).toHaveBeenCalled();
  });
});
