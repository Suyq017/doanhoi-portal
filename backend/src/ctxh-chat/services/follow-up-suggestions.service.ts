import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { UniversalLLMService } from './universal-llm.service';
import { FOLLOW_UP_SUGGESTIONS_PROMPT } from '../prompts/follow-up-suggestions.prompt';

/**
 * Zod schema for the structured output returned by the LLM.
 *
 * Uses 3 flat string fields instead of an array — Ollama/Qwen's tool-calling
 * implementation handles flat z.object() fields reliably, whereas z.array()
 * frequently causes structured-output parsing errors on local models.
 */
export const FollowUpOutputSchema = z.object({
  suggestion1: z.string().describe('Câu hỏi tiếp theo thứ nhất bằng tiếng Việt, ≤ 15 từ'),
  suggestion2: z.string().describe('Câu hỏi tiếp theo thứ hai bằng tiếng Việt, ≤ 15 từ'),
  suggestion3: z.string().describe('Câu hỏi tiếp theo thứ ba bằng tiếng Việt, ≤ 15 từ'),
});

type FollowUpOutput = z.infer<typeof FollowUpOutputSchema>;

/** Max chars to pass from the assistant's answer into the prompt */
const MAX_ANSWER_CHARS = 500;

/** LLM call timeout in milliseconds */
const TIMEOUT_MS = 8000;

/**
 * Static fallback suggestions used when the LLM call fails or times out.
 */
function buildFallbackSuggestions(assistantAnswer: string): string[] {
  const suggestions: string[] = [];

  if (assistantAnswer.includes('hoạt động') || assistantAnswer.includes('CTXH')) {
    suggestions.push('Cho tôi biết thêm chi tiết về hoạt động này');
    suggestions.push('Làm sao để đăng ký tham gia?');
  }

  if (assistantAnswer.includes('ngày') || assistantAnswer.includes('thời gian')) {
    suggestions.push('Có hoạt động nào khác trong tháng này không?');
  }

  if (suggestions.length === 0) {
    suggestions.push('Có hoạt động CTXH nào đang mở đăng ký?');
    suggestions.push('Tìm hoạt động CTXH theo địa điểm');
    suggestions.push('Hoạt động nào có nhiều ngày CTXH nhất?');
  }

  return suggestions.slice(0, 3);
}

/**
 * FollowUpSuggestionsService
 *
 * Uses the LLM (via UniversalLLMService) to generate context-aware follow-up question
 * suggestions based on the user's most recent message and the assistant's response.
 *
 * Falls back to keyword-based static suggestions when:
 *  - The LLM call times out (> TIMEOUT_MS)
 *  - The model returns malformed / empty output
 *  - Any unexpected error occurs
 */
@Injectable()
export class FollowUpSuggestionsService {
  private readonly logger = new Logger(FollowUpSuggestionsService.name);

  constructor(private readonly universalLLMService: UniversalLLMService) {}

  /**
   * Generate 3 follow-up question suggestions.
   *
   * @param userQuestion   The original question sent by the student
   * @param assistantAnswer The assistant's response text (truncated internally)
   * @returns              Array of 1-3 suggestion strings
   */
  async generate(userQuestion: string, assistantAnswer: string): Promise<string[]> {
    const truncatedAnswer = assistantAnswer.slice(0, MAX_ANSWER_CHARS);

    try {
      const llm = this.universalLLMService.getLLM();
      const structuredLlm = llm.withStructuredOutput(FollowUpOutputSchema, {
        name: 'generate_follow_up_suggestions',
      });

      const chain = FOLLOW_UP_SUGGESTIONS_PROMPT.pipe(structuredLlm);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Follow-up suggestions LLM timeout')), TIMEOUT_MS),
      );

      const result = await Promise.race([
        chain.invoke({
          user_question: userQuestion,
          assistant_answer: truncatedAnswer,
        }) as Promise<FollowUpOutput>,
        timeoutPromise,
      ]);

      const suggestions = [result.suggestion1, result.suggestion2, result.suggestion3]
        .filter((s) => s && s.trim().length > 0)
        .slice(0, 3);

      if (suggestions.length === 0) {
        throw new Error('LLM returned empty suggestions');
      }

      this.logger.debug(`[FollowUp] Generated ${suggestions.length} suggestions via LLM`);
      return suggestions;
    } catch (error) {
      this.logger.warn(
        `[FollowUp] LLM call failed, using fallback: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return buildFallbackSuggestions(assistantAnswer);
    }
  }
}
