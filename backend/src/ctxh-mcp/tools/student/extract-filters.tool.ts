import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CtxhFilterExtractionService } from '../../../ctxh-chat/services/ctxh-filter-extraction.service';

export function registerExtractFiltersTool(
  server: McpServer,
  filterService: CtxhFilterExtractionService,
): void {
  server.tool(
    'extract_activity_filters',
    'Trích xuất bộ lọc tìm kiếm hoạt động CTXH từ câu hỏi tiếng Việt (status, tổ chức, địa điểm, thời gian)',
    {
      query: z.string().describe('Câu hỏi của sinh viên (tiếng Việt)'),
      current_date: z.string().optional().describe('Ngày hiện tại YYYY-MM-DD (mặc định: hôm nay)'),
    },
    async ({ query, current_date }) => {
      const date = current_date ?? new Date().toISOString().split('T')[0];

      const rawFilters = await filterService.extractFilters(query, date);
      const resolvedFilters = filterService.resolveDateRange(rawFilters, date);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(resolvedFilters, null, 2) }],
      };
    },
  );
}
