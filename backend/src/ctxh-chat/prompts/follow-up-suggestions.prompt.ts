import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Follow-Up Suggestions Prompt
 *
 * Given the user's original question and the assistant's answer,
 * ask the LLM to produce exactly 3 concise follow-up questions in Vietnamese.
 *
 * Design notes:
 * • `/no_think` suppresses Qwen's <think> block — compatible with Ollama and Gemini.
 * • Output shape is enforced by `llm.withStructuredOutput(FollowUpOutputSchema)` in the service,
 *   so the prompt does NOT need to specify JSON explicitly.
 * • `{assistant_answer}` is pre-truncated by the service to ≤ 500 chars to avoid
 *   inflating the prompt with huge RAG responses.
 */
export const FOLLOW_UP_SUGGESTIONS_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn là trợ lý gợi ý câu hỏi tiếp theo cho chatbot CTXH tại Đại học Bách Khoa TP.HCM.

NHIỆM VỤ: Dựa vào câu hỏi của sinh viên và câu trả lời vừa được đưa ra, hãy đề xuất đúng 3 câu hỏi tiếp theo.

Yêu cầu:
1. Mỗi câu hỏi PHẢI liên quan trực tiếp đến nội dung câu trả lời (tên hoạt động, thời gian, địa điểm, tổ chức cụ thể đã đề cập).
2. Mỗi câu hỏi ≤ 15 từ, viết bằng tiếng Việt tự nhiên.
3. KHÔNG lặp lại câu hỏi gốc của sinh viên.
4. Đa dạng về góc độ: ví dụ 1 câu hỏi chi tiết hơn, 1 câu về đăng ký / tham gia, 1 câu mở rộng tìm kiếm liên quan.
5. Nếu câu trả lời không đủ thông tin để suy ra câu hỏi cụ thể, hãy đề xuất các câu hỏi về CTXH phổ biến.`,
  ],
  [
    'human',
    `Câu hỏi của sinh viên: {user_question}

Câu trả lời vừa rồi: {assistant_answer}

Hãy điền đúng 3 câu hỏi vào các trường suggestion1, suggestion2, suggestion3.`,
  ],
]);
