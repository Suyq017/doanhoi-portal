import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import { LangChainConfig } from '../config/langchain.config';
import { LangChainMemoryService } from './langchain-memory.service';
import { ActivitiesService } from '../../ctxh/activity/activities.service';
import { ParticipationService } from '../../ctxh/activity/services/participation.service';
import { NodemailerService } from '../../ctxh-mcp/notifications/nodemailer.service';
import { checkCtxhPermission } from '../../ctxh-mcp/guards/ctxh-permission.helper';
import { STAFF_AGENT_SYSTEM_PROMPT } from '../prompts/staff-agent.prompt';

@Injectable()
export class StaffAgentService implements OnModuleInit {
  private readonly logger = new Logger(StaffAgentService.name);
  private llm: BaseChatModel;

  constructor(
    private readonly configService: ConfigService,
    private readonly memoryService: LangChainMemoryService,
    private readonly activitiesService: ActivitiesService,
    private readonly participationService: ParticipationService,
    private readonly mailerService: NodemailerService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    this.llm = LangChainConfig.getLLM(this.configService);
    this.logger.log('StaffAgentService initialized');
  }

  async invoke(
    message: string,
    sessionId: string,
    userId: string,
    options: { currentDate: string },
  ): Promise<string> {
    const { currentDate } = options;

    const historyMessages = await this.memoryService.getMessages(sessionId);
    const tools = this.buildTools(userId);
    const toolMap = new Map(tools.map((t) => [t.name, t]));
    const llmWithTools = this.llm.bindTools(tools);

    const messages: any[] = [
      new SystemMessage(STAFF_AGENT_SYSTEM_PROMPT(currentDate)),
      ...historyMessages,
      new HumanMessage(message),
    ];

    let finalText = 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.';

    for (let i = 0; i < 10; i++) {
      const response = (await llmWithTools.invoke(messages)) as AIMessage;
      messages.push(response);

      const toolCalls = (response as any).tool_calls ?? [];
      if (!toolCalls.length) {
        const content = response.content;
        finalText = typeof content === 'string' ? content : JSON.stringify(content);
        break;
      }

      for (const tc of toolCalls) {
        const tool = toolMap.get(tc.name);
        let result: string;
        if (tool) {
          try {
            result = await tool.func(tc.args);
          } catch (err: any) {
            result = `Lỗi: ${err?.message ?? String(err)}`;
          }
        } else {
          result = `Tool "${tc.name}" không tồn tại.`;
        }
        messages.push(new ToolMessage({ content: result, tool_call_id: tc.id ?? '' }));
      }
    }

    await this.memoryService.saveInteraction(sessionId, message, finalText);
    return finalText;
  }

  // ─── Tool builders ────────────────────────────────────────────────────────

  private buildTools(userId: string): DynamicStructuredTool[] {
    return [
      this.buildSearchMyActivitiesTool(userId),
      this.buildGetPendingParticipantsTool(userId),
      this.buildApproveAndNotifyTool(userId),
      this.buildCreateActivityTool(userId),
    ];
  }

  // ── Tool 1: search_my_activities ──────────────────────────────────────────

  private buildSearchMyActivitiesTool(userId: string): DynamicStructuredTool {
    const dataSource = this.dataSource;
    return new DynamicStructuredTool({
      name: 'search_my_activities',
      description:
        'Tìm kiếm danh sách hoạt động CTXH do cán bộ này tạo. ' +
        'Có thể lọc theo tên (từ khóa) và trạng thái. ' +
        'Dùng trước khi duyệt đăng ký để xác nhận đúng hoạt động.',
      schema: z.object({
        keyword: z.string().optional().describe('Từ khóa tìm trong tên hoạt động'),
        status: z
          .array(z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']))
          .optional()
          .describe('Lọc theo trạng thái (để trống = tất cả)'),
        limit: z.number().int().min(1).max(20).default(10).describe('Số kết quả tối đa'),
      }),
      func: async ({ keyword, status, limit }) => {
        try {
          const statusList = status?.length ? status : ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
          const placeholders = statusList.map((_, i) => `$${i + 3}`).join(', ');

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
               o.name AS organization_name,
               COUNT(p.id) FILTER (WHERE p.status = 'PENDING')  AS pending_count,
               COUNT(p.id) FILTER (WHERE p.status = 'APPROVED') AS approved_count
             FROM ctxh_activities a
             LEFT JOIN organizations o ON o.id = a.organization_id
             LEFT JOIN ctxh_participations p ON p.activity_id = a.id
             WHERE a.created_by = $1
               AND a.deleted_at IS NULL
               AND ($2::text IS NULL OR a.name ILIKE '%' || $2 || '%')
               AND a.status = ANY(ARRAY[${placeholders}]::text[])
             GROUP BY a.id, o.name
             ORDER BY a.created_at DESC
             LIMIT ${Math.min(limit ?? 10, 20)}`,
            [userId, keyword ?? null, ...statusList],
          );

          return JSON.stringify({
            found: rows.length,
            activities: rows.map((r) => ({
              activity_id: r.id,
              name: r.name,
              status: r.status,
              start_date: r.start_date,
              end_date: r.end_date,
              total_days: r.total_days,
              organization_name: r.organization_name,
              requires_approval: r.requires_approval,
              pending_count: Number(r.pending_count),
              approved_count: Number(r.approved_count),
            })),
          });
        } catch (err: any) {
          return JSON.stringify({ error: err?.message ?? 'Lỗi truy vấn hoạt động.' });
        }
      },
    });
  }

  // ── Tool 2: get_pending_participants ──────────────────────────────────────

  private buildGetPendingParticipantsTool(_userId: string): DynamicStructuredTool {
    const dataSource = this.dataSource;
    return new DynamicStructuredTool({
      name: 'get_pending_participants',
      description:
        'Lấy danh sách sinh viên đang chờ duyệt (PENDING) của một hoạt động cụ thể. ' +
        'Trả về participation_id, tên sinh viên, mã số, ngày đăng ký.',
      schema: z.object({
        activity_id: z.string().uuid().describe('UUID của hoạt động cần lấy danh sách PENDING'),
      }),
      func: async ({ activity_id }) => {
        try {
          const rows = await dataSource.query<any[]>(
            `SELECT
               p.id   AS participation_id,
               u."familyName" || ' ' || u."givenName" AS student_name,
               u."studentId" AS student_code,
               u.email,
               p.created_at AS registered_at
             FROM ctxh_participations p
             JOIN users u ON u.id = p.student_id
             WHERE p.activity_id = $1
               AND p.status = 'PENDING'
             ORDER BY p.created_at ASC`,
            [activity_id],
          );

          return JSON.stringify({
            activity_id,
            pending_count: rows.length,
            participants: rows.map((r) => ({
              participation_id: r.participation_id,
              student_name: r.student_name,
              student_code: r.student_code ?? null,
              email: r.email,
              registered_at: r.registered_at,
            })),
          });
        } catch (err: any) {
          return JSON.stringify({ error: err?.message ?? 'Lỗi truy vấn danh sách sinh viên.' });
        }
      },
    });
  }

  // ── Tool 3: approve_and_notify ────────────────────────────────────────────

  private buildApproveAndNotifyTool(userId: string): DynamicStructuredTool {
    const dataSource = this.dataSource;
    const participationService = this.participationService;
    const mailerService = this.mailerService;

    return new DynamicStructuredTool({
      name: 'approve_and_notify',
      description:
        'Duyệt hàng loạt đăng ký PENDING và gửi email xác nhận cho sinh viên được duyệt. ' +
        'Yêu cầu quyền ctxh.activities.manage_participants.',
      schema: z.object({
        activity_id: z.string().uuid().describe('UUID hoạt động'),
        participation_ids: z
          .array(z.string().uuid())
          .min(1)
          .max(200)
          .describe('Danh sách participation_id cần duyệt'),
        send_email_notification: z.boolean().default(true).describe('Gửi email xác nhận cho sinh viên'),
        email_custom_message: z.string().optional().describe('Nội dung bổ sung trong email'),
      }),
      func: async ({ activity_id, participation_ids, send_email_notification, email_custom_message }) => {
        try {
          // 1. Fetch activity
          const activityRows = await dataSource.query<any[]>(
            `SELECT id, name, start_date, location, total_days, organization_id, requires_approval
             FROM ctxh_activities
             WHERE id = $1 AND deleted_at IS NULL`,
            [activity_id],
          );

          if (!activityRows.length) {
            return JSON.stringify({ error: 'Không tìm thấy hoạt động.' });
          }

          const activity = activityRows[0];

          if (!activity.requires_approval) {
            return JSON.stringify({
              error: 'Hoạt động này không bật chế độ xét duyệt. Không có đăng ký PENDING nào cần duyệt.',
            });
          }

          // 2. Permission check
          const hasPermission = await checkCtxhPermission(
            dataSource,
            userId,
            'ctxh.activities.manage_participants',
            activity.organization_id,
          );
          if (!hasPermission) {
            return JSON.stringify({ error: 'Bạn không có quyền duyệt đăng ký cho hoạt động này.' });
          }

          // 3. Batch approve
          const batchResult = await participationService.approveParticipationsBatch(
            activity_id,
            participation_ids,
            userId,
          );

          // 4. Send emails
          let emailsSent = 0;
          let emailsFailed = 0;

          if (send_email_notification && batchResult.successful.length > 0) {
            const successfulIds = batchResult.successful.map((s) => s.participation_id);

            const studentRows = await dataSource.query<any[]>(
              `SELECT p.id AS participation_id,
                      u.email,
                      u."familyName" || ' ' || u."givenName" AS student_name
               FROM ctxh_participations p
               JOIN users u ON u.id = p.student_id
               WHERE p.id = ANY($1::uuid[])
                 AND u.email IS NOT NULL`,
              [successfulIds],
            );

            const studentMap = new Map<string, { email: string; student_name: string }>(
              studentRows.map((r) => [r.participation_id, { email: r.email, student_name: r.student_name }]),
            );

            for (const item of batchResult.successful) {
              const student = studentMap.get(item.participation_id);
              if (!student) continue;

              const sent = await mailerService.sendApprovalEmail({
                to: student.email,
                studentName: student.student_name,
                activityName: activity.name,
                activityStartDate: activity.start_date ? new Date(activity.start_date) : null,
                activityLocation: activity.location ?? null,
                totalDays: activity.total_days !== null ? Number(activity.total_days) : 0,
                customMessage: email_custom_message,
              });

              if (sent) emailsSent++;
              else emailsFailed++;
            }
          }

          return JSON.stringify({
            success: true,
            activity_id,
            activity_name: activity.name,
            approved: batchResult.successful.length,
            failed: batchResult.failed.length,
            total_processed: batchResult.total,
            emails_sent: emailsSent,
            emails_failed: emailsFailed,
            failed_details: batchResult.failed,
          });
        } catch (err: any) {
          return JSON.stringify({ error: err?.message ?? 'Duyệt đăng ký thất bại.' });
        }
      },
    });
  }

  // ── Tool 4: create_activity ───────────────────────────────────────────────

  private buildCreateActivityTool(userId: string): DynamicStructuredTool {
    const dataSource = this.dataSource;
    const activitiesService = this.activitiesService;

    return new DynamicStructuredTool({
      name: 'create_activity',
      description:
        'Tạo hoạt động CTXH mới. Yêu cầu quyền ctxh.activities.create cho đơn vị tổ chức.',
      schema: z.object({
        name: z.string().min(1).max(255).describe('Tên hoạt động CTXH'),
        description: z.string().optional().describe('Mô tả chi tiết'),
        category_id: z.string().uuid().describe('UUID danh mục hoạt động'),
        organization_id: z.string().uuid().describe('UUID đơn vị tổ chức'),
        start_date: z.string().describe('Ngày bắt đầu ISO 8601'),
        end_date: z.string().describe('Ngày kết thúc ISO 8601'),
        total_days: z.number().min(1).describe('Số ngày CTXH được công nhận'),
        location: z.string().max(500).optional().describe('Địa điểm tổ chức'),
        max_participants: z.number().int().min(1).optional().describe('Giới hạn số người tham gia'),
        requires_approval: z.boolean().default(false).describe('Đăng ký cần duyệt thủ công?'),
      }),
      func: async (args) => {
        try {
          const hasPermission = await checkCtxhPermission(
            dataSource,
            userId,
            'ctxh.activities.create',
            args.organization_id,
          );
          if (!hasPermission) {
            return JSON.stringify({ error: 'Bạn không có quyền tạo hoạt động cho đơn vị này.' });
          }

          const activity = await activitiesService.create(args, userId);

          return JSON.stringify({
            success: true,
            activity_id: activity.id,
            name: activity.name,
            status: activity.status,
            message: `Tạo hoạt động "${activity.name}" thành công!`,
          });
        } catch (err: any) {
          return JSON.stringify({ error: err?.message ?? 'Tạo hoạt động thất bại.' });
        }
      },
    });
  }
}
