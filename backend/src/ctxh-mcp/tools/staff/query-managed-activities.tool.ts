import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DataSource } from 'typeorm';
import { checkCtxhPermission } from '../../guards/ctxh-permission.helper';

export function registerQueryManagedActivitiesTool(
  server: McpServer,
  dataSource: DataSource,
  userId: string,
): void {
  server.tool(
    'query_managed_activities',
    'Truy vấn danh sách hoạt động CTXH do cán bộ này tạo/quản lý. Yêu cầu quyền ctxh.activities.view',
    {
      status: z
        .array(z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']))
        .optional()
        .describe('Lọc theo trạng thái, để trống = tất cả'),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(10),
      organization_id: z.string().uuid().optional().describe('Lọc theo đơn vị tổ chức'),
    },
    async ({ status, page, limit, organization_id }) => {
      const hasPermission = await checkCtxhPermission(
        dataSource, userId, 'ctxh.activities.view', organization_id,
      );
      if (!hasPermission) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Bạn không có quyền xem danh sách hoạt động.' }],
        };
      }

      const safePage = Math.max(1, page ?? 1);
      const safeLimit = Math.min(50, Math.max(1, limit ?? 10));
      const offset = (safePage - 1) * safeLimit;

      // Build dynamic WHERE conditions
      const conditions: string[] = ['a.deleted_at IS NULL', 'a.created_by = $1'];
      const params: any[] = [userId];
      let idx = 2;

      if (status && status.length > 0) {
        const placeholders = status.map(() => `$${idx++}`).join(', ');
        conditions.push(`a.status IN (${placeholders})`);
        params.push(...status);
      }

      if (organization_id) {
        conditions.push(`a.organization_id = $${idx++}`);
        params.push(organization_id);
      }

      const whereClause = conditions.join(' AND ');

      // Count total matching rows
      const countResult = await dataSource.query<{ total: string }[]>(
        `SELECT COUNT(*) AS total FROM ctxh_activities a WHERE ${whereClause}`,
        params,
      );
      const total = parseInt(countResult[0]?.total ?? '0', 10);

      // Fetch paginated results with participant counts
      const rows = await dataSource.query<any[]>(
        `SELECT
           a.id,
           a.name,
           a.status,
           a.start_date,
           a.end_date,
           a.total_days,
           a.max_participants,
           a.requires_approval,
           a.created_at,
           o.name AS organization_name,
           COUNT(p.id) FILTER (
             WHERE p.status IN ('APPROVED', 'REGISTERED', 'COMPLETED')
           )::int AS current_participants
         FROM ctxh_activities a
         LEFT JOIN organizations o ON o.id = a.organization_id
         LEFT JOIN ctxh_participation p ON p.activity_id = a.id
         WHERE ${whereClause}
         GROUP BY a.id, o.name
         ORDER BY a.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, safeLimit, offset],
      );

      const activities = rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        start_date: r.start_date ? new Date(r.start_date).toISOString() : null,
        end_date: r.end_date ? new Date(r.end_date).toISOString() : null,
        total_days: r.total_days !== null ? Number(r.total_days) : null,
        max_participants: r.max_participants !== null ? Number(r.max_participants) : null,
        current_participants: r.current_participants ?? 0,
        organization_name: r.organization_name ?? null,
        requires_approval: Boolean(r.requires_approval),
        created_at: new Date(r.created_at).toISOString(),
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            activities,
            total,
            page: safePage,
            total_pages: Math.ceil(total / safeLimit),
          }, null, 2),
        }],
      };
    },
  );
}
