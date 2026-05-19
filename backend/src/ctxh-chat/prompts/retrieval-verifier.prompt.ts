import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Retrieval Verifier Prompt
 *
 * Called ONLY when primary retrieval returns zero documents (docs.length === 0).
 * Asks the LLM to:
 *   1. Confirm the retrieval is truly insufficient (NEEDS_SUPPLEMENT)
 *   2. Propose a simpler, filter-free semantic query for the fallback search
 *
 * Design notes for Qwen / Ollama compatibility:
 * ─────────────────────────────────────────────
 * • `/no_think` suppresses Qwen's internal reasoning block to keep output clean.
 * • Task is minimal and focused — only called when docs = 0, so the model has
 *   very little context to work with. Keeping the prompt short helps Qwen stay
 *   on task without hallucinating extra fields.
 * • The `supplementQuery` stripping rule is defined with a concrete example to
 *   anchor the model on the expected transformation.
 * • Verdict logic is rule-based (0 results -> NEEDS_SUPPLEMENT), so the model's
 *   main job is just producing a good supplementQuery string.
 * • Output shape is enforced by `llm.withStructuredOutput(VerifierOutputSchema)`.
 */
export const RETRIEVAL_VERIFIER_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn là Retrieval Verifier cho hệ thống tìm kiếm hoạt động CTXH tại BK TP.HCM.

NHIỆM VỤ: Tìm kiếm ban đầu trả về 0 kết quả. Bạn cần đề xuất câu tìm kiếm ngữ nghĩa đơn giản hơn để thử lại.

QUY TẮC:
1. Verdict LUÔN là "NEEDS_SUPPLEMENT" vì kết quả rỗng.
2. Tạo câu supplementQuery bằng cách:
   - Giữ lại CHỦ ĐỀ CHÍNH (loại hoạt động, ví dụ: "hiến máu", "tình nguyện", "hội trại")
   - XÓA BỎ hoàn toàn: thời gian ("hôm nay", "tuần này", "tháng 3"), địa điểm ("cơ sở 1", "KTX"), tổ chức ("khoa Máy tính")
   - Kết quả phải là cụm từ ngắn gọn để tìm kiếm embedding

Ví dụ minh họa:
• Câu hỏi: "Có hoạt động hiến máu nào ở cơ sở 1 tuần này không?"
  -> supplementQuery: "hoạt động hiến máu tình nguyện"

• Câu hỏi: "Hoạt động tình nguyện của khoa Máy tính tháng 3"
  -> supplementQuery: "hoạt động tình nguyện CTXH"

• Câu hỏi: "Hội trại nào đang diễn ra hôm nay tại Thủ Đức?"
  -> supplementQuery: "chương trình hội trại ngày hội"`,
  ],
  [
    'human',
    `Câu hỏi gốc đã tìm kiếm (để hiểu chủ đề): {question}

Kết quả tìm được: 0 tài liệu.

Hãy xác định verdict và tạo supplementQuery phù hợp.`,
  ],
]);
