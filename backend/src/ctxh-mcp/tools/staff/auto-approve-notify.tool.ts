import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ParticipationService } from '../../../ctxh/activity/services/participation.service';
import { DataSource } from 'typeorm';
import { NodemailerService } from '../../notifications/nodemailer.service';
import { checkCtxhPermission } from '../../guards/ctxh-permission.helper';

export function registerAutoApproveNotifyTool(
  server: McpServer,
  participationService: ParticipationService,
  mailerService: NodemailerService,
  dataSource: DataSource,
  userId: string,
): void {
  server.tool(
    'auto_approve_and_notify',
    'Tự động duyệt danh sách sinh viên đăng ký hoạt động và gửi email xác nhận qua Nodemailer. Yêu cầu quyền ctxh.activities.manage_participants',
    {
      activity_id: z.string().uuid().describe('UUID hoạt động'),
      participation_ids: z
        .array(z.string().uuid())
        .min(1)
        .max(200)
        .describe('Danh sách participation ID cần duyệt'),
      send_email_notification: z.boolean().default(true).describe('Gửi email thông báo cho sinh viên được duyệt'),
      email_custom_message: z.string().optional().describe('Nội dung bổ sung trong email'),
    },
    async ({ activity_id, participation_ids, send_email_notification = true, email_custom_message }) => {
      // 1. Fetch activity info
      const activityRows = await dataSource.query<any[]>(
        `SELECT id, name, start_date, location, total_days, organization_id, requires_approval
         FROM ctxh_activities
         WHERE id = $1 AND deleted_at IS NULL`,
        [activity_id],
      );

      if (!activityRows.length) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Không tìm thấy hoạt động.' }],
        };
      }

      const activity = activityRows[0];

      if (!activity.requires_approval) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Hoạt động này không bật chế độ xét duyệt đăng ký. Không có đăng ký PENDING nào cần duyệt.' }],
        };
      }

      // 2. Check permission
      const hasPermission = await checkCtxhPermission(
        dataSource, userId, 'ctxh.activities.manage_participants', activity.organization_id,
      );
      if (!hasPermission) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Bạn không có quyền duyệt đăng ký cho hoạt động này.' }],
        };
      }

      // 3. Batch approve
      const batchResult = await participationService.approveParticipationsBatch(
        activity_id, participation_ids, userId,
      );

      // 4. Send single BCC email to all approved students
      let emailsSent = 0;
      let emailsFailed = 0;

      if (send_email_notification && batchResult.successful.length > 0) {
        const successfulIds = batchResult.successful.map((s) => s.participation_id);

        const studentRows = await dataSource.query<any[]>(
          `SELECT p.id AS participation_id, u.email
           FROM ctxh_participations p
           JOIN users u ON u.id = p.student_id
           WHERE p.id = ANY($1::uuid[])
             AND u.email IS NOT NULL`,
          [successfulIds],
        );

        const emails = studentRows.map((r) => r.email as string);
        const bccList = emails.join(', ');

        if (bccList) {
          const sent = await mailerService.sendApprovalEmail({
            bcc: bccList,
            activityName: activity.name,
            activityStartDate: activity.start_date ? new Date(activity.start_date) : null,
            activityLocation: activity.location ?? null,
            totalDays: activity.total_days !== null ? Number(activity.total_days) : 0,
            customMessage: email_custom_message,
          });
          if (sent) emailsSent = emails.length;
          else emailsFailed = emails.length;
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            activity_id,
            activity_name: activity.name,
            approved: batchResult.successful.length,
            failed: batchResult.failed.length,
            total_processed: batchResult.total,
            emails_sent: emailsSent,
            emails_failed: emailsFailed,
            failed_details: batchResult.failed,
          }, null, 2),
        }],
      };
    },
  );
}
