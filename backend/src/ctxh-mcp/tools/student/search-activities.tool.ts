import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { LangChainVectorStoreService } from '../../../ctxh-chat/services/langchain-vector-store.service';
import { CtxhFilterExtractionService } from '../../../ctxh-chat/services/ctxh-filter-extraction.service';
import { MetadataFilters } from '../../../ctxh-chat/dto/filter-extraction.dto';

export function registerSearchActivitiesTool(
  server: McpServer,
  vectorStoreService: LangChainVectorStoreService,
  filterService: CtxhFilterExtractionService,
): void {
  server.tool(
    'search_activities',
    'Tìm kiếm hoạt động CTXH theo bộ lọc đã trích xuất và câu tìm kiếm ngữ nghĩa',
    {
      semantic_query: z.string().describe('Câu tìm kiếm ngữ nghĩa'),
      filters: z
        .object({
          status: z.array(z.enum(['ongoing', 'upcoming', 'ended'])).optional(),
          organizationKeywords: z.array(z.string()).optional(),
          organizationLevel: z.enum(['parent', 'child']).optional(),
          locationRaw: z.array(z.string()).optional(),
          dateRange: z
            .object({
              isToday: z.boolean().optional(),
              isThisWeek: z.boolean().optional(),
              isThisMonth: z.boolean().optional(),
              startDate: z.string().optional(),
              endDate: z.string().optional(),
            })
            .optional(),
        })
        .optional()
        .describe('Filters từ extract_activity_filters'),
      limit: z.number().min(1).max(20).default(5),
      current_date: z.string().optional().describe('Ngày hiện tại YYYY-MM-DD'),
    },
    async ({ semantic_query, filters, limit, current_date }) => {
      const date = current_date ?? new Date().toISOString().split('T')[0];
      const safeFilters: MetadataFilters = filters ?? {};

      const docs = filterService.isEmpty(safeFilters)
        ? await vectorStoreService.similaritySearchWithDateFilter(semantic_query, limit, date, 'all')
        : await vectorStoreService.similaritySearchWithMetadataFilters(semantic_query, safeFilters, limit, date);

      const activities = docs.map((doc) => {
        const m = doc.metadata ?? {};
        return {
          activityId: m.activityId ?? null,
          activityName: m.activityName ?? null,
          organizationName: m.organizationName ?? null,
          startDate: m.startDate ?? null,
          endDate: m.endDate ?? null,
          location: m.location ?? null,
          status: m.status ?? null,
          totalDays: m.totalDays ?? null,
          maxParticipants: m.maxParticipants ?? null,
          requiresApproval: m.requiresApproval ?? false,
          similarityScore: typeof m.score === 'number' ? m.score : null,
          snippet: typeof doc.pageContent === 'string' ? doc.pageContent.slice(0, 200) : '',
        };
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ activities, total_found: activities.length }, null, 2),
        }],
      };
    },
  );
}
