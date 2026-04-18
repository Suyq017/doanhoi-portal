import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ActivitiesService } from '../../../ctxh/activity/activities.service';
import { DataSource } from 'typeorm';
import { checkCtxhPermission } from '../../guards/ctxh-permission.helper';

export function registerCreateActivityTool(
  server: McpServer,
  activitiesService: ActivitiesService,
  dataSource: DataSource,
  userId: string,
): void {
  server.tool(
    'create_activity',
    'Tạo hoạt động CTXH mới. Yêu cầu quyền ctxh.activities.create cho đơn vị tổ chức được chỉ định',
    {
      name: z.string().min(1).max(255).describe('Tên hoạt động CTXH'),
      description: z.string().optional().describe('Mô tả chi tiết'),
      category_id: z.string().uuid().describe('UUID danh mục hoạt động'),
      organization_id: z.string().uuid().describe('UUID đơn vị tổ chức'),
      start_date: z.string().describe('Ngày bắt đầu ISO 8601'),
      end_date: z.string().describe('Ngày kết thúc ISO 8601'),
      total_days: z.number().positive().describe('Số ngày CTXH được công nhận'),
      location: z.string().max(500).optional().describe('Địa điểm tổ chức'),
      max_participants: z.number().int().positive().optional().describe('Giới hạn số lượng người tham gia'),
      requires_approval: z.boolean().default(false).describe('Đăng ký cần được duyệt thủ công không?'),
    },
    async ({ name, description, category_id, organization_id, start_date, end_date, total_days, location, max_participants, requires_approval }) => {
      const hasPermission = await checkCtxhPermission(
        dataSource, userId, 'ctxh.activities.create', organization_id,
      );
      if (!hasPermission) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Bạn không có quyền tạo hoạt động cho đơn vị này.' }],
        };
      }

      try {
        const activity = await activitiesService.create(
          { name, description, category_id, organization_id, start_date, end_date, total_days, location, max_participants, requires_approval },
          userId,
        );

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              activity_id: activity.id,
              name: activity.name,
              status: activity.status,
              message: `Tạo hoạt động "${activity.name}" thành công!`,
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: err.message ?? 'Tạo hoạt động thất bại.' }],
        };
      }
    },
  );
}
