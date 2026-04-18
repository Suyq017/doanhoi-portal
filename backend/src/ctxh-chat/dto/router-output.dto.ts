import { z } from 'zod';

/**
 * Intent types for the Router Agent.
 *
 * - RAG_QUERY          : Question about specific CTXH activities -> needs vector DB retrieval
 * - GREETING           : Hello, capability questions, "who are you" -> friendly intro response
 * - CHITCHAT           : Truly off-topic (coding, weather, politics) -> polite rejection
 * - REGISTER_ACTIVITY  : Student wants to register/join a CTXH activity -> call registration API
 */
export const IntentEnum = z.enum(['RAG_QUERY', 'GREETING', 'CHITCHAT', 'REGISTER_ACTIVITY']);
export type Intent = z.infer<typeof IntentEnum>;

/**
 * Zod schema for the Router Agent's structured output.
 *
 * Used with `llm.withStructuredOutput(RouterOutputSchema)` so the LLM
 * returns a validated JSON object in a single call that both:
 *   1. Rewrites the question into a standalone, context-independent form
 *   2. Classifies the intent so downstream logic can branch accordingly
 */
export const RouterOutputSchema = z.object({
  /**
   * Standalone rewritten question.
   * Pronouns / contextual references are replaced with explicit terms
   * so vector search works without the conversation history.
   *
   * Rule: if the original question is already self-contained, return it unchanged.
   */
  rewrittenQuestion: z
    .string()
    .describe(
      'Câu hỏi đã được viết lại thành câu độc lập, rõ ràng, không cần ngữ cảnh. ' +
      'Thay thế đại từ (nó, hoạt động đó, ...) bằng tên cụ thể từ lịch sử. ' +
      'Nếu câu hỏi đã đủ rõ, giữ nguyên.',
    ),

  /**
   * Classified intent.
   * - RAG_QUERY  -> caller will run full retrieval pipeline
   * - CHITCHAT   -> caller returns a polite rejection without retrieval
   */
  intent: IntentEnum.describe(
    'Phân loại intent của câu hỏi: ' +
    'RAG_QUERY nếu hỏi về hoạt động CTXH cụ thể (tên, thời gian, địa điểm, tổ chức, trạng thái). ' +
    'GREETING nếu là lời chào hỏi, câu hỏi về khả năng chatbot, hoặc hỏi chatbot là ai/làm được gì. ' +
    'CHITCHAT nếu hoàn toàn ngoài phạm vi CTXH và không phải chào hỏi (toán, thời tiết, code, v.v.). ' +
    'REGISTER_ACTIVITY nếu sinh viên muốn ĐĂNG KÝ / THAM GIA / THÊM BẢN THÂN vào một hoạt động CTXH ' +
    '(ví dụ: "đăng ký tôi vào hoạt động này", "thêm tôi vào hoạt động ctxh", "tôi muốn tham gia", "đăng ký cho tôi").',
  ),
});

export type RouterOutput = z.infer<typeof RouterOutputSchema>;
