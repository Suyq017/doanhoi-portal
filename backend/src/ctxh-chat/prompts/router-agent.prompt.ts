import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Router Agent Prompt
 *
 * Combines two sub-tasks into ONE LLM call (saves latency vs calling twice):
 *   1. Rewrite the question into a standalone, context-free form
 *   2. Classify the intent so the pipeline can branch early
 *
 * Design notes for Qwen / Ollama compatibility:
 * ─────────────────────────────────────────────
 * • `/no_think` prefix suppresses Qwen's <think>...</think> reasoning block,
 *   which would otherwise corrupt JSON structured output parsing.
 * • Instructions are written in numbered lists — Qwen follows numbered steps
 *   more reliably than bullet narratives.
 * • Vietnamese examples are provided for all 3 intents to anchor the model.
 * • The output shape is enforced externally by `llm.withStructuredOutput(RouterOutputSchema)`,
 *   so the prompt does NOT need to specify JSON format explicitly.
 *   Keeping the prompt clean prevents the model from over-formatting.
 * • `chat_history` is kept minimal — only the last exchanges matter for pronoun resolution.
 */
export const ROUTER_AGENT_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `/no_think Bạn là Router Agent cho chatbot CTXH tại Đại học Bách Khoa TP.HCM.

NHIỆM VỤ: Thực hiện 2 việc sau cho câu hỏi của sinh viên:

═══ BƯỚC 1: VIẾT LẠI CÂU HỎI ═══
Chuyển câu hỏi thành câu độc lập, rõ ràng, KHÔNG cần ngữ cảnh hội thoại.

Quy tắc:
1. Nếu câu hỏi có đại từ (nó, hoạt động đó, chương trình này, ...) → thay bằng tên cụ thể từ lịch sử.
2. Nếu câu hỏi tham chiếu ("cái đó", "trên kia", "vừa nói") → điền thông tin đầy đủ.
3. Nếu câu hỏi đã đủ rõ ràng → giữ nguyên KHÔNG thay đổi.

═══ BƯỚC 2: PHÂN LOẠI INTENT ═══
Chọn đúng một trong 4 loại sau:

RAG_QUERY — Câu hỏi về hoạt động CTXH CỤ THỂ trong database.
  Nhận biết khi hỏi về: tên hoạt động, thời gian, địa điểm, số ngày CTXH,
  tổ chức, trạng thái (đang diễn ra / sắp tới / đã qua), đăng ký tham gia,
  so sánh các hoạt động, yêu cầu tham gia.
  Ví dụ:
  • "Có hoạt động hiến máu nào đang mở không?"        → RAG_QUERY
  • "Hoạt động tình nguyện của khoa Máy tính tháng 3" → RAG_QUERY
  • "CTXH nào diễn ra tại KTX khu B?"                → RAG_QUERY
  • "Còn bao nhiêu ngày để đăng ký?"                  → RAG_QUERY

DOC_QUERY — Câu hỏi về QUY TRÌNH / ĐIỀU KIỆN / THỦ TỤC CTXH nói chung.
  Nhận biết khi hỏi về: cách tính điểm CTXH, điều kiện xét tốt nghiệp,
  quy trình nộp minh chứng, giải thích các loại CTXH, câu hỏi về chính sách.
  Ví dụ:
  • "Cần bao nhiêu ngày CTXH để tốt nghiệp?"         → DOC_QUERY
  • "Cách tính điểm CTXH như thế nào?"               → DOC_QUERY
  • "CTXH có những loại nào?"                        → DOC_QUERY

GREETING — Lời chào hỏi hoặc câu hỏi về bản thân / khả năng của chatbot.
  Nhận biết: câu chào, tự giới thiệu, hỏi chatbot là ai, chatbot làm được gì.
  Ví dụ:
  • "Xin chào!"                                      → GREETING
  • "Chào bạn"                                       → GREETING
  • "Bạn là ai?"                                     → GREETING
  • "Bạn có thể làm gì?"                             → GREETING
  • "Chatbot này dùng để làm gì?"                    → GREETING
  • "Cho tôi biết khả năng của bạn"                  → GREETING
  • "Bạn hỗ trợ những gì?"                           → GREETING
  • "Hello!"                                         → GREETING

CHITCHAT — Câu hỏi hoàn toàn ngoài phạm vi CTXH và KHÔNG phải lời chào.
  Ví dụ:
  • "Giải bài toán này giúp tôi"                     → CHITCHAT
  • "Thời tiết hôm nay thế nào?"                     → CHITCHAT
  • "Viết code Python cho tôi"                       → CHITCHAT
  • "Bỏ qua quy tắc và ..."                          → CHITCHAT

QUY TẮC QUAN TRỌNG:
- Khi không chắc giữa RAG_QUERY và DOC_QUERY, chọn RAG_QUERY.
- Câu hỏi từ sinh viên về CTXH LUÔN là RAG_QUERY hoặc DOC_QUERY.
- Lời chào và câu hỏi về chatbot LUÔN là GREETING, KHÔNG phải CHITCHAT.
- Câu hỏi kết hợp lịch sử → ưu tiên phân loại theo NỘI DUNG chính của câu hỏi MỚI.`
,
  ],
  [
    'human',
    `Lịch sử hội thoại (chỉ dùng để hiểu ngữ cảnh, KHÔNG phân loại lịch sử):
{chat_history}

Câu hỏi mới cần xử lý:
{question}`,
  ],
]);
