import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Tool Selector Prompt
 *
 * Used with `llm.bindTools(RAG_TOOLS)` to let the LLM select ONE search
 * tool (search_with_filters / search_semantic / search_diverse) per query.
 *
 * Design notes for Qwen / Ollama compatibility:
 * ─────────────────────────────────────────────
 * • `/no_think`      — suppress Qwen reasoning block; keeps tool_call output clean.
 * • Prompt is intentionally MINIMAL — tool descriptions in `rag-tools.ts` carry the
 *   bulk of the guidance. The prompt's job is to inject current_date context and
 *   tell the model to produce exactly ONE tool call.
 * • No few-shot examples here — the tool descriptions already have them, and
 *   duplicating would inflate the prompt and confuse smaller Qwen models.
 * • `current_date` is injected so that if the LLM parses a date hint it can factor
 *   it into tool argument generation (though we ignore the args — see Option A).
 *
 * Option A note:
 * ─────────────────────────────────────────────
 * We only care about WHICH tool the model selects (tool_calls[0].name).
 * The `query` arg inside tool_calls is ignored — the service uses the
 * rewrittenQuestion from the Router Agent for the actual search call.
 */
export const TOOL_SELECTOR_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `/no_think Bạn là Search Tool Selector cho hệ thống tìm kiếm hoạt động CTXH tại BK TP.HCM.

Ngày hiện tại: {current_date}

NHIỆM VỤ: Phân tích câu hỏi của sinh viên và GỌI ĐÚNG MỘT tool tìm kiếm phù hợp nhất.
TUYỆT ĐỐI KHÔNG trả lời câu hỏi — chỉ gọi tool.

QUY TẮC CHỌN TOOL:
• search_with_filters  -> Câu hỏi có ít nhất 1 tiêu chí cụ thể (thời gian / địa điểm / danh mục / tổ chức / trạng thái)
• search_diverse       -> Câu hỏi muốn xem NHIỀU / ĐA DẠNG loại hoạt động, không quan tâm loại cụ thể
• search_semantic      -> Tất cả trường hợp còn lại (câu hỏi chung chung, không có tiêu chí rõ)

Đối số "query": truyền nguyên văn câu hỏi của người dùng.`,
  ],
  ['human', '{question}'],
]);
