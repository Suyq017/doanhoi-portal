import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * RAG Tool Name Constants (Option A — Lightweight Tool Binding)
 *
 * These string literals are used both as tool `name` properties (so the LLM can
 * reference them in its tool_calls) and as switch-case keys in the service
 * that manually routes to the appropriate VectorStore search method.
 */
export const RAG_TOOL_NAMES = {
  FILTERED_SEARCH: 'search_with_filters',
  SEMANTIC_SEARCH: 'search_semantic',
  DIVERSE_SEARCH:  'search_diverse',
  LIST_SQL:        'list_activities_sql',
} as const;

export type RagToolName = typeof RAG_TOOL_NAMES[keyof typeof RAG_TOOL_NAMES];

/**
 * Shared minimal input schema for all RAG search tools.
 * Only the rewritten query is required — the service resolves currentDate and k
 * from its own context, so we don't burden the LLM with parameter inference.
 */
const SearchToolSchema = z.object({
  query: z
    .string()
    .describe('Câu tìm kiếm để truy vấn vector database hoạt động CTXH'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool 1: Filtered Search
// When to use: question mentions specific time / location / category / org / status
// Effect:      LLM filter extraction -> similaritySearchWithMetadataFilters (SQL WHERE)
// ─────────────────────────────────────────────────────────────────────────────
export const filteredSearchTool = new DynamicStructuredTool({
  name: RAG_TOOL_NAMES.FILTERED_SEARCH,
  description:
    'Tìm kiếm hoạt động CTXH khi câu hỏi có ÍT NHẤT MỘT điều kiện lọc cụ thể: ' +
    'thời gian ("hôm nay", "tuần này", "tháng 3", "04/2026"), ' +
    'địa điểm ("cơ sở 1", "KTX khu B", "hội trường A4"), ' +
    'danh mục ("hiến máu", "tình nguyện", "hội trại"), ' +
    'tổ chức ("khoa Máy tính", "Đoàn trường", "Liên chi đoàn"), ' +
    'hoặc trạng thái ("đang diễn ra", "sắp tới", "đã kết thúc"). ' +
    'Sử dụng khi người dùng muốn LỌC kết quả theo tiêu chí cụ thể.',
  schema: SearchToolSchema,
  // Option A: func is a placeholder — the service executes the actual search manually.
  func: async () => '[]',
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool 2: Semantic Search
// When to use: vague or general question without specific filter criteria
// Effect:      similaritySearchWithDateFilter (no LLM filter extraction step)
// Faster than filtered search — skips the filter extraction LLM call entirely.
// ─────────────────────────────────────────────────────────────────────────────
export const semanticSearchTool = new DynamicStructuredTool({
  name: RAG_TOOL_NAMES.SEMANTIC_SEARCH,
  description:
    'Tìm kiếm ngữ nghĩa khi câu hỏi KHÔNG có bộ lọc cụ thể hoặc câu hỏi mang tính tổng quát. ' +
    'Ví dụ: "tôi muốn tham gia CTXH", "có hoạt động nào phù hợp không?", "hoạt động gì hay?". ' +
    'Nhanh hơn search_with_filters vì không cần bước trích xuất filter.',
  schema: SearchToolSchema,
  func: async () => '[]',
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool 3: Diverse Search (MMR)
// When to use: user wants a broad overview of many/all activities
// Effect:      maxMarginalRelevanceSearch -> diverse, non-redundant results
// ─────────────────────────────────────────────────────────────────────────────
export const diverseSearchTool = new DynamicStructuredTool({
  name: RAG_TOOL_NAMES.DIVERSE_SEARCH,
  description:
    'Tìm kiếm đa dạng hoá kết quả (Maximum Marginal Relevance) khi người dùng ' +
    'muốn xem NHIỀU LOẠI hoạt động khác nhau, không cần loại cụ thể. ' +
    'Ví dụ: "liệt kê tất cả các hoạt động", "có những loại CTXH nào?", ' +
    '"cho tôi xem nhiều hoạt động". Kết quả đa dạng, không trùng lặp.',
  schema: SearchToolSchema,
  func: async () => '[]',
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool 4: List Activities SQL
// When to use: user wants to list/see all activities (upcoming, ongoing, all)
// Effect:      McpSqlFallbackService.listActivities() — pure SQL, no embedding
// ─────────────────────────────────────────────────────────────────────────────
export const listActivitiesSqlTool = new DynamicStructuredTool({
  name: RAG_TOOL_NAMES.LIST_SQL,
  description:
    'Liệt kê hoạt động CTXH trực tiếp từ database qua SQL. ' +
    'Dùng khi user muốn XEM TẤT CẢ / DANH SÁCH hoạt động (sắp tới, đang diễn ra, hoặc toàn bộ). ' +
    'Chính xác hơn search_semantic vì không phụ thuộc embedding. ' +
    'Ví dụ: "liệt kê", "có gì", "tất cả hoạt động", "hoạt động nào còn mở", ' +
    '"hoạt động nào sẽ diễn ra", "trong tương lai", "sắp tới".',
  schema: SearchToolSchema,
  func: async () => '[]',
});

/**
 * The full tool array to pass to `llm.bindTools()`.
 * Order matters — the LLM may default to the first tool when uncertain.
 * filteredSearchTool is listed first as the most commonly needed strategy.
 */
export const RAG_TOOLS = [
  filteredSearchTool,
  semanticSearchTool,
  diverseSearchTool,
  listActivitiesSqlTool,
] as const;
