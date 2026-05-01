import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Unified tool names for the CTXH agent.
 * Intent is inferred from which tool the LLM calls — no separate router needed.
 */
export const AGENT_TOOL_NAMES = {
  SEARCH: 'search_ctxh_activities',
  REGISTER: 'register_for_activity',
  RESPOND: 'respond_general',
} as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[keyof typeof AGENT_TOOL_NAMES];

/**
 * Schema for searching CTXH activities.
 * The LLM fills these parameters by reasoning about the user's question —
 * no hardcoded keyword tables needed.
 */
export const SearchCtxhActivitiesSchema = z.object({
  query: z
    .string()
    .describe(
      'Câu hỏi tìm kiếm ngữ nghĩa, đã viết lại thành câu độc lập không cần ngữ cảnh. ' +
        'Thay thế đại từ (nó, hoạt động đó, ...) bằng tên cụ thể từ lịch sử hội thoại.',
    ),

  status: z
    .array(z.enum(['ongoing', 'upcoming', 'ended']))
    .optional()
    .describe(
      'Trạng thái hoạt động, suy luận từ ngữ nghĩa câu hỏi:\n' +
        '  "đang diễn ra", "hôm nay", "hiện tại", "còn mở" → ongoing\n' +
        '  "sắp tới", "tương lai", "tuần tới", "chưa bắt đầu" → upcoming\n' +
        '  "đã qua", "đã kết thúc", "trước đây" → ended\n' +
        'Để trống nếu câu hỏi không đề cập đến trạng thái.',
    ),

  dateFrom: z
    .string()
    .optional()
    .describe(
      'Ngày bắt đầu khoảng tìm kiếm (ISO YYYY-MM-DD). ' +
        'Tự tính dựa trên ngày hôm nay được cung cấp trong prompt. ' +
        'Ví dụ: "tuần này" → thứ Hai của tuần này, "tháng 3" → 2025-03-01.',
    ),

  dateTo: z
    .string()
    .optional()
    .describe('Ngày kết thúc khoảng tìm kiếm (ISO YYYY-MM-DD).'),

  organizationName: z
    .string()
    .optional()
    .describe(
      'Tên tổ chức trích xuất từ câu hỏi. ' +
        'BỎ các từ chỉ loại hình đứng đầu như "khoa", "ban", "phòng", "bộ môn", "clb" — chỉ giữ tên riêng. ' +
        'Ví dụ: "khoa Máy tính" → "Máy tính", "khoa KHMT" → "KHMT", ' +
        '"Đoàn trường" → "Đoàn trường", "Hội Sinh viên" → "Hội Sinh viên".',
    ),

  location: z
    .string()
    .optional()
    .describe(
      'Địa điểm trích xuất nguyên văn từ câu hỏi. ' +
        'Ví dụ: "ở cơ sở 1" → "cơ sở 1", "tại KTX khu B" → "KTX khu B".',
    ),

  mode: z
    .enum(['filtered', 'semantic', 'diverse', 'list_all'])
    .default('semantic')
    .describe(
      'Chiến lược tìm kiếm:\n' +
        '  "filtered": có ít nhất 1 filter cụ thể (status/date/org/location) → SQL + vector\n' +
        '  "semantic": câu hỏi chung, không có filter rõ ràng → chỉ vector similarity\n' +
        '  "diverse": muốn xem nhiều loại hoạt động khác nhau → MMR search\n' +
        '  "list_all": muốn liệt kê tất cả hoạt động, không cần tìm kiếm ngữ nghĩa → SQL thuần',
    ),
});

export type SearchCtxhActivitiesArgs = z.infer<typeof SearchCtxhActivitiesSchema>;

/**
 * Schema for registering a student for a CTXH activity.
 */
export const RegisterActivitySchema = z.object({
  activityContext: z
    .string()
    .describe(
      'Mô tả hoạt động sinh viên muốn đăng ký. ' +
        'Trích từ câu hỏi hiện tại và lịch sử hội thoại. ' +
        'Dùng để tìm kiếm hoạt động phù hợp nếu chưa có activityId.',
    ),

  activityId: z
    .number()
    .optional()
    .describe('ID hoạt động nếu đã biết chính xác từ context hội thoại trước đó.'),
});

export type RegisterActivityArgs = z.infer<typeof RegisterActivitySchema>;

/**
 * Schema for general (non-CTXH) responses.
 */
export const RespondGeneralSchema = z.object({
  type: z
    .enum(['greeting', 'out_of_scope'])
    .describe(
      '"greeting": lời chào hỏi, hỏi về khả năng chatbot, hỏi chatbot là ai/làm được gì.\n' +
        '"out_of_scope": câu hỏi hoàn toàn ngoài phạm vi CTXH (toán học, thời tiết, lập trình, ...).',
    ),
});

export type RespondGeneralArgs = z.infer<typeof RespondGeneralSchema>;

// ---------------------------------------------------------------------------
// Tool instances (func is a placeholder — CtxhAgentService handles execution)
// ---------------------------------------------------------------------------

export const searchCtxhActivitiesTool = new DynamicStructuredTool({
  name: AGENT_TOOL_NAMES.SEARCH,
  description:
    'Tìm kiếm hoạt động Công tác Xã hội (CTXH) tại Đại học Bách Khoa TP.HCM. ' +
    'Dùng khi sinh viên hỏi về hoạt động, tìm kiếm, tra cứu thông tin.',
  schema: SearchCtxhActivitiesSchema,
  func: async () => '{}',
});

export const registerForActivityTool = new DynamicStructuredTool({
  name: AGENT_TOOL_NAMES.REGISTER,
  description:
    'Đăng ký sinh viên vào một hoạt động CTXH. ' +
    'Dùng khi sinh viên muốn đăng ký, tham gia, ghi danh, thêm bản thân vào hoạt động.',
  schema: RegisterActivitySchema,
  func: async () => '{}',
});

export const respondGeneralTool = new DynamicStructuredTool({
  name: AGENT_TOOL_NAMES.RESPOND,
  description:
    'Trả lời lời chào hỏi hoặc từ chối câu hỏi ngoài phạm vi CTXH một cách lịch sự.',
  schema: RespondGeneralSchema,
  func: async () => '{}',
});

/**
 * All agent tools — ordered so the most-used tool appears first.
 */
export const AGENT_TOOLS = [
  searchCtxhActivitiesTool,
  registerForActivityTool,
  respondGeneralTool,
] as const;
