import { ConfigService } from '@nestjs/config';
import { CtxhAgentService, expandOrgKeywords } from '../ctxh-agent.service';

const mockGetLLM = jest.fn();
const mockIsUsingLocalLLM = jest.fn();

jest.mock('../../config/langchain.config', () => ({
  LangChainConfig: {
    getLLM: (...args: any[]) => mockGetLLM(...args),
    isUsingLocalLLM: (...args: any[]) => mockIsUsingLocalLLM(...args),
  },
}));

const mockPipe = jest.fn();
jest.mock('../../prompts/ctxh-agent.prompt', () => ({
  CTXH_AGENT_PROMPT: {
    pipe: (...args: any[]) => mockPipe(...args),
  },
}));

jest.mock('../../tools/agent-tools', () => ({
  AGENT_TOOLS: [{ name: 'tool-a' }],
  AGENT_TOOL_NAMES: {
    SEARCH: 'search_ctxh_activities',
    REGISTER: 'register_activity',
    RESPOND: 'respond',
  },
}));

describe('CtxhAgentService', () => {
  const configService = { get: jest.fn() } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with local llm', async () => {
    mockGetLLM.mockReturnValue({ bindTools: jest.fn() });
    mockIsUsingLocalLLM.mockReturnValue(true);

    const service = new CtxhAgentService(configService);
    await service.initialize();

    expect(mockGetLLM).toHaveBeenCalledWith(configService);
    await service.initialize();
    expect(mockGetLLM).toHaveBeenCalledTimes(1);
  });

  it('rethrows initialize errors', async () => {
    mockGetLLM.mockImplementation(() => {
      throw new Error('init failed');
    });

    const service = new CtxhAgentService(configService);
    await expect(service.initialize()).rejects.toThrow('init failed');
  });

  it('decide falls back when no tool_calls', async () => {
    const invoke = jest.fn().mockResolvedValue({ tool_calls: [] });
    mockGetLLM.mockReturnValue({ bindTools: jest.fn().mockReturnValue({}) });
    mockIsUsingLocalLLM.mockReturnValue(false);
    mockPipe.mockReturnValue({ invoke });

    const service = new CtxhAgentService(configService);
    const out = await service.decide('q', 'h', '2026-01-01');

    expect(out).toEqual({
      action: 'search',
      params: { rewrittenQuestion: 'q', mode: 'semantic' },
    });
  });

  it('decide parses search tool call', async () => {
    const invoke = jest.fn().mockResolvedValue({
      tool_calls: [
        {
          name: 'search_ctxh_activities',
          args: {
            query: 'rewrite',
            status: ['ongoing'],
            dateFrom: '2026-01-01',
            dateTo: '2026-01-31',
            organizationName: 'Khoa CNTT',
            location: 'BK',
            mode: 'filtered',
          },
        },
      ],
    });
    mockGetLLM.mockReturnValue({ bindTools: jest.fn().mockReturnValue({}) });
    mockPipe.mockReturnValue({ invoke });

    const service = new CtxhAgentService(configService);
    const out = await service.decide('fallback', 'h', '2026-01-01');

    expect(out).toEqual({
      action: 'search',
      params: {
        rewrittenQuestion: 'rewrite',
        status: ['ongoing'],
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        organizationName: 'Khoa CNTT',
        location: 'BK',
        mode: 'filtered',
      },
    });
  });

  it('decide parses register/respond/unknown and catches errors', async () => {
    mockGetLLM.mockReturnValue({ bindTools: jest.fn().mockReturnValue({}) });
    const service = new CtxhAgentService(configService);

    mockPipe.mockReturnValueOnce({
      invoke: jest.fn().mockResolvedValue({
        tool_calls: [{ name: 'register_activity', args: { activityId: 10 } }],
      }),
    });
    const registerOut = await service.decide('ctx', 'h', '2026-01-01');
    expect(registerOut).toEqual({
      action: 'register',
      params: { activityContext: 'ctx', activityId: 10 },
    });

    mockPipe.mockReturnValueOnce({
      invoke: jest.fn().mockResolvedValue({
        tool_calls: [{ name: 'respond', args: { type: 'greeting' } }],
      }),
    });
    expect(await service.decide('x', 'h', '2026-01-01')).toEqual({ action: 'greeting' });

    mockPipe.mockReturnValueOnce({
      invoke: jest.fn().mockResolvedValue({
        tool_calls: [{ name: 'respond', args: { type: 'other' } }],
      }),
    });
    expect(await service.decide('x', 'h', '2026-01-01')).toEqual({ action: 'out_of_scope' });

    mockPipe.mockReturnValueOnce({
      invoke: jest.fn().mockResolvedValue({
        tool_calls: [{ name: 'unknown', args: {} }],
      }),
    });
    expect(await service.decide('x', 'h', '2026-01-01')).toEqual({
      action: 'search',
      params: { rewrittenQuestion: 'x', mode: 'semantic' },
    });

    mockPipe.mockReturnValueOnce({
      invoke: jest.fn().mockRejectedValue(new Error('boom')),
    });
    expect(await service.decide('err', 'h', '2026-01-01')).toEqual({
      action: 'search',
      params: { rewrittenQuestion: 'err', mode: 'semantic' },
    });
  });

  it('converts to metadata filters and expands org keywords', () => {
    const service = new CtxhAgentService(configService);
    const filters = service.toMetadataFilters({
      rewrittenQuestion: 'q',
      mode: 'semantic',
      status: ['upcoming'],
      dateFrom: '2026-01-01',
      dateTo: '2026-01-02',
      organizationName: 'khoa Máy tính',
      location: 'B1',
    });

    expect(filters.status).toEqual(['upcoming']);
    expect(filters.organizationKeywords).toContain('khoa Máy tính');
    expect(filters.organizationKeywords).toContain('Máy tính');
    expect(filters.locationRaw).toEqual(['B1']);
    expect(filters.dateRange).toEqual({ startDate: '2026-01-01', endDate: '2026-01-02' });

    expect(expandOrgKeywords('Đoàn trường')).toEqual(['Đoàn trường']);
  });
});
