import { z } from 'zod';

/**
 * Zod schema for the Retrieve-Then-Verify Agent's structured output.
 *
 * The Verifier LLM evaluates whether the primary retrieval returned
 * enough relevant results, and if not, proposes a simpler fallback query.
 *
 * Used with `llm.withStructuredOutput(VerifierOutputSchema)`.
 */
export const VerifierOutputSchema = z.object({
  /**
   * Verdict on the retrieval quality.
   * - SUFFICIENT      : At least one result is directly relevant -> proceed to generation.
   * - NEEDS_SUPPLEMENT: Zero results returned -> trigger a semantic fallback search.
   */
  verdict: z
    .enum(['SUFFICIENT', 'NEEDS_SUPPLEMENT'])
    .describe(
      'SUFFICIENT nếu có ít nhất 1 kết quả trả về từ tìm kiếm. ' +
      'NEEDS_SUPPLEMENT nếu kết quả rỗng (0 tài liệu).',
    ),

  /**
   * Simplified fallback search query proposed by the LLM.
   * Strips hard metadata constraints (dates, locations) and focuses
   * on the core semantic intent so the un-filtered similarity search
   * can find relevant documents.
   *
   * Must be null when verdict === 'SUFFICIENT'.
   */
  supplementQuery: z
    .string()
    .describe(
      'Câu tìm kiếm đơn giản hơn để thực hiện semantic search bổ sung. ' +
      'Bỏ qua các ràng buộc về thời gian, địa điểm, tổ chức — chỉ giữ ý nghĩa cốt lõi. ' +
      'Ví dụ: "hiến máu tuần này tại cơ sở 1" -> "hoạt động hiến máu". ' +
      'Trả về chuỗi rỗng "" nếu verdict là SUFFICIENT.',
    ),
});

export type VerifierOutput = z.infer<typeof VerifierOutputSchema>;
