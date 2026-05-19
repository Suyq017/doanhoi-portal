import { Test, TestingModule } from '@nestjs/testing';
import { FollowUpSuggestionsService, FollowUpOutputSchema } from '../follow-up-suggestions.service';
import { UniversalLLMService } from '../universal-llm.service';

// Mock the prompt module
jest.mock('../../prompts/follow-up-suggestions.prompt', () => ({
  FOLLOW_UP_SUGGESTIONS_PROMPT: {
    pipe: jest.fn(function (llm) {
      return {
        invoke: jest.fn(function () {
          throw new Error('Mock not configured');
        }),
      };
    }),
  },
}));

describe('FollowUpSuggestionsService', () => {
  let service: FollowUpSuggestionsService;
  let mockUniversalLLMService: UniversalLLMService;
  let mockLLM: any;
  let mockPrompt: any;

  beforeEach(async () => {
    mockLLM = {
      withStructuredOutput: jest.fn().mockReturnValue({}),
    };

    mockUniversalLLMService = {
      getLLM: jest.fn().mockReturnValue(mockLLM),
    } as any;

    // Get the mocked prompt
    mockPrompt = require('../../prompts/follow-up-suggestions.prompt').FOLLOW_UP_SUGGESTIONS_PROMPT;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpSuggestionsService,
        { provide: UniversalLLMService, useValue: mockUniversalLLMService },
      ],
    }).compile();

    service = module.get<FollowUpSuggestionsService>(FollowUpSuggestionsService);
  });

  describe('generate', () => {
    const userQuestion = 'Các hoạt động CTXH có gì?';
    const assistantAnswer = 'Có nhiều hoạt động CTXH hấp dẫn như quét rác, trồng cây...';

    it('should return LLM suggestions when successful', async () => {
      const mockChain = {
        invoke: jest.fn().mockResolvedValue({
          suggestion1: 'Chi tiết hoạt động nào?',
          suggestion2: 'Làm sao để đăng ký?',
          suggestion3: 'Có điểm thưởng không?',
        }),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      const result = await service.generate(userQuestion, assistantAnswer);

      expect(result).toEqual([
        'Chi tiết hoạt động nào?',
        'Làm sao để đăng ký?',
        'Có điểm thưởng không?',
      ]);
      expect(mockLLM.withStructuredOutput).toHaveBeenCalledWith(
        FollowUpOutputSchema,
        { name: 'generate_follow_up_suggestions' },
      );
    });

    it('should filter out empty suggestions from LLM', async () => {
      const mockChain = {
        invoke: jest.fn().mockResolvedValue({
          suggestion1: 'Suggestion 1',
          suggestion2: '',
          suggestion3: '   ',
        }),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      const result = await service.generate(userQuestion, assistantAnswer);

      expect(result).toEqual(['Suggestion 1']);
    });

    it('should return fallback suggestions when LLM times out', async () => {
      const mockChain = {
        invoke: jest.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Follow-up suggestions LLM timeout')), 50);
          });
        }),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      const result = await service.generate(userQuestion, assistantAnswer);

      // Should return fallback (non-empty array)
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should use fallback when LLM returns empty suggestions', async () => {
      const mockChain = {
        invoke: jest.fn().mockResolvedValue({
          suggestion1: '',
          suggestion2: '',
          suggestion3: '',
        }),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      const result = await service.generate(userQuestion, assistantAnswer);

      // Should return fallback
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use fallback with hoạt động keyword match', async () => {
      const mockChain = {
        invoke: jest.fn().mockRejectedValue(new Error('LLM error')),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      const answerWithKeyword = 'Hoạt động quét rác là hoạt động CTXH rất hay';
      const result = await service.generate(userQuestion, answerWithKeyword);

      expect(result).toContain('Cho tôi biết thêm chi tiết về hoạt động này');
      expect(result).toContain('Làm sao để đăng ký tham gia?');
    });

    it('should use fallback with ngày/thời gian keyword match', async () => {
      const mockChain = {
        invoke: jest.fn().mockRejectedValue(new Error('LLM error')),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      const answerWithTimeKeyword = 'Hoạt động này diễn ra vào thứ bảy ngày 15/3';
      const result = await service.generate(userQuestion, answerWithTimeKeyword);

      expect(result).toContain('Có hoạt động nào khác trong tháng này không?');
    });

    it('should return default fallback suggestions when no keywords match', async () => {
      const mockChain = {
        invoke: jest.fn().mockRejectedValue(new Error('LLM error')),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      const genericAnswer = 'Lorem ipsum dolor sit amet';
      const result = await service.generate(userQuestion, genericAnswer);

      expect(result).toContain('Có hoạt động CTXH nào đang mở đăng ký?');
      expect(result).toContain('Tìm hoạt động CTXH theo địa điểm');
      expect(result).toContain('Hoạt động nào có nhiều ngày CTXH nhất?');
    });

    it('should truncate long assistant answers', async () => {
      const longAnswer = 'A'.repeat(1000);
      let capturedInput: any;

      const mockChain = {
        invoke: jest.fn().mockImplementation((input: any) => {
          capturedInput = input;
          return Promise.resolve({
            suggestion1: 'Suggestion 1',
            suggestion2: 'Suggestion 2',
            suggestion3: 'Suggestion 3',
          });
        }),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      await service.generate(userQuestion, longAnswer);

      // Should truncate to 500 chars
      expect(capturedInput.assistant_answer).toBe('A'.repeat(500));
      expect(capturedInput.assistant_answer.length).toBeLessThanOrEqual(500);
    });

    it('should include hoạt động and CTXH in keyword check', async () => {
      const mockChain = {
        invoke: jest.fn().mockRejectedValue(new Error('LLM error')),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      const answerWithCTXH = 'Các hoạt động CTXH này rất hay';
      const result = await service.generate(userQuestion, answerWithCTXH);

      expect(result).toContain('Cho tôi biết thêm chi tiết về hoạt động này');
    });

    it('should handle any LLM error by returning fallback', async () => {
      const mockChain = {
        invoke: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      const result = await service.generate(userQuestion, assistantAnswer);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should always return at most 3 suggestions', async () => {
      const mockChain = {
        invoke: jest.fn().mockResolvedValue({
          suggestion1: 'S1',
          suggestion2: 'S2',
          suggestion3: 'S3',
        }),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      const result = await service.generate(userQuestion, assistantAnswer);

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should call LLM with structured output schema', async () => {
      const mockChain = {
        invoke: jest.fn().mockResolvedValue({
          suggestion1: 'S1',
          suggestion2: 'S2',
          suggestion3: 'S3',
        }),
      };

      mockPrompt.pipe.mockReturnValue(mockChain);

      await service.generate(userQuestion, assistantAnswer);

      expect(mockLLM.withStructuredOutput).toHaveBeenCalledWith(
        FollowUpOutputSchema,
        { name: 'generate_follow_up_suggestions' },
      );
    });
  });
});
