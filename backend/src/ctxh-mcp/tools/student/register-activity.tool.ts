import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ParticipationService } from '../../../ctxh/activity/services/participation.service';

export function registerRegisterActivityTool(
  server: McpServer,
  participationService: ParticipationService,
  userId: string,
): void {
  server.tool(
    'register_activity',
    'Đăng ký sinh viên (người đang chat) vào một hoạt động CTXH',
    {
      activity_id: z.string().uuid().describe('UUID của hoạt động cần đăng ký'),
    },
    async ({ activity_id }) => {
      try {
        const result = await participationService.registerSelf(activity_id, userId);

        const message =
          result.status === 'PENDING'
            ? 'Đăng ký thành công! Đang chờ cán bộ xét duyệt.'
            : 'Đăng ký thành công!';

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              participation_id: result.id,
              status: result.status,
              message,
            }, null, 2),
          }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: err.message ?? 'Đăng ký thất bại.' }],
        };
      }
    },
  );
}
