import { ConfigService } from '@nestjs/config';
import { CtxhFilterExtractionService } from '../ctxh-filter-extraction.service';

jest.mock('../../config/langchain.config', () => ({
  LangChainConfig: {
    getLLM: jest.fn().mockReturnValue({
      withStructuredOutput: jest.fn().mockReturnValue({}),
    }),
    isUsingLocalModel: jest.fn().mockReturnValue(true),
    isUsingLocalLLM: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('../../prompts/filter-extraction.prompt', () => ({
  FILTER_EXTRACTION_PROMPT: {
    pipe: jest.fn().mockReturnValue({
      invoke: jest.fn(),
    }),
  },
}));

describe('CtxhFilterExtractionService', () => {
  let service: CtxhFilterExtractionService;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    configService = {
      get: jest.fn(),
    };

    service = new CtxhFilterExtractionService(configService as unknown as ConfigService);
  });

  it('should initialize once and reuse the LLM', async () => {
    await service.initialize();
    await service.initialize();

    const { LangChainConfig } = require('../../config/langchain.config');
    expect(LangChainConfig.getLLM).toHaveBeenCalledTimes(1);
    expect(service['initialized']).toBe(true);
  });

  it('should extract filters and auto-initialize when needed', async () => {
    const { FILTER_EXTRACTION_PROMPT } = require('../../prompts/filter-extraction.prompt');
    const mockExtractChain = FILTER_EXTRACTION_PROMPT.pipe();
    const mockStructuredLlm = {
      withStructuredOutput: jest.fn().mockReturnValue({}),
    };
    const { LangChainConfig } = require('../../config/langchain.config');
    LangChainConfig.getLLM.mockReturnValueOnce(mockStructuredLlm);

    mockExtractChain.invoke.mockResolvedValueOnce({
      status: ['ongoing'],
      organizationKeywords: ['Khoa CNTT'],
      dateRange: { isToday: true },
    });

    const result = await service.extractFilters('Hôm nay có hoạt động nào không?', '2026-04-28');

    expect(result).toEqual({
      status: ['ongoing'],
      organizationKeywords: ['Khoa CNTT'],
      dateRange: { isToday: true },
    });
    expect(mockStructuredLlm.withStructuredOutput).toHaveBeenCalled();
    expect(mockExtractChain.invoke).toHaveBeenCalledWith({
      question: 'Hôm nay có hoạt động nào không?',
      current_date: '2026-04-28',
    });
  });

  it('should return empty filters when extraction fails', async () => {
    const { FILTER_EXTRACTION_PROMPT } = require('../../prompts/filter-extraction.prompt');
    const mockExtractChain = FILTER_EXTRACTION_PROMPT.pipe();
    mockExtractChain.invoke.mockRejectedValueOnce(new Error('LLM failed'));

    await expect(service.extractFilters('test')).resolves.toEqual({});
  });

  it('should resolve today, this week and this month date ranges', () => {
    const today = service.resolveDateRange({ dateRange: { isToday: true } } as any, '2026-04-28');
    expect(today.dateRange).toEqual({ isToday: true, startDate: '2026-04-28', endDate: '2026-04-28' });

    const week = service.resolveDateRange({ dateRange: { isThisWeek: true } } as any, '2026-04-28');
    expect(week.dateRange).toEqual({
      isThisWeek: true,
      startDate: '2026-04-26',
      endDate: '2026-05-02',
    });

    const month = service.resolveDateRange({ dateRange: { isThisMonth: true } } as any, '2026-04-28');
    expect(month.dateRange).toEqual({
      isThisMonth: true,
      startDate: '2026-03-31',
      endDate: '2026-04-29',
    });
  });

  it('should return the original filters when dateRange is absent', () => {
    const filters = { organizationKeywords: ['A'] } as any;
    expect(service.resolveDateRange(filters, '2026-04-28')).toBe(filters);
  });

  it('should detect empty and non-empty filters', () => {
    expect(service.isEmpty({} as any)).toBe(true);
    expect(service.isEmpty({ status: ['ongoing'] } as any)).toBe(false);
    expect(service.isEmpty({ organizationKeywords: ['Khoa A'] } as any)).toBe(false);
    expect(service.isEmpty({ organizationLevel: 'faculty' } as any)).toBe(false);
    expect(service.isEmpty({ locationRaw: ['HCM'] } as any)).toBe(false);
    expect(service.isEmpty({ dateRange: { isToday: true } } as any)).toBe(false);
  });
});
