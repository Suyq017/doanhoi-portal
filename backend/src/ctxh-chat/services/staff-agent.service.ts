import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
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
import { PostgresMcpClientService, ALLOWED_MCP_TOOLS } from './postgres-mcp-client.service';

interface ActivitySummary {
  activity_id: string;
  activity_name: string;
  organization_name: string | null;
  pending_count: number;
}

@Injectable()
export class StaffAgentService implements OnModuleInit {
  private readonly logger = new Logger(StaffAgentService.name);
  private llm: BaseChatModel;

  /** Session-scoped cache: activity name + UUID từ get_pending_overview */
  private readonly sessionActivityCache = new Map<string, ActivitySummary[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly memoryService: LangChainMemoryService,
    private readonly activitiesService: ActivitiesService,
    private readonly participationService: ParticipationService,
    private readonly mailerService: NodemailerService,
    private readonly postgresMcpClient: PostgresMcpClientService,
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
    const tools = this.buildTools(userId, sessionId);
    const toolMap = new Map(tools.map((t) => [t.name, t]));
    const llmWithTools = this.llm.bindTools(tools);

    const cachedActivities = this.sessionActivityCache.get(sessionId) ?? [];
    const messages: any[] = [
      new SystemMessage(STAFF_AGENT_SYSTEM_PROMPT(currentDate, cachedActivities)),
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
            // DynamicTool (MCP) expects string input; DynamicStructuredTool expects object
            const input = tool instanceof DynamicTool
              ? JSON.stringify(tc.args)
              : tc.args;
            result = await (tool as any).func(input);
          } catch (err: any) {
            result = `Lỗi: ${err?.message ?? String(err)}`;
          }
        } else {
          result = `Tool "${tc.name}" không tồn tại.`;
        }
        messages.push(new ToolMessage({ content: result, tool_call_id: tc.id ?? '' }));
      }
    }

    await this.memoryService.addMessages(sessionId, messages.slice(1 + historyMessages.length));
    return finalText;
  }

  // ─── Tool builders ────────────────────────────────────────────────────────

  private buildTools(userId: string, sessionId: string): (DynamicStructuredTool | DynamicTool)[] {
    const customTools: (DynamicStructuredTool | DynamicTool)[] = [
      this.buildSearchActivitiesTool(userId),
      this.buildGetPendingParticipantsTool(),
      this.buildApproveAndNotifyTool(userId),
      this.buildCreateActivityTool(userId),
      this.buildBatchCreateActivitiesTool(userId),
      this.buildManageActivityTool(userId),
      this.buildGetPendingOverviewTool(userId, sessionId),
      this.buildLookupCategoryTool(),
      this.buildLookupOrganizationTool(),
    ];

    const mcpTools = this.postgresMcpClient
      .getLangChainTools()
      .filter((t) => ALLOWED_MCP_TOOLS.has(t.name));

    return [...customTools, ...mcpTools];
  }

  // ── Tool 1: search_activities ─────────────────────────────────────────────

  private buildSearchActivitiesTool(userId: string): DynamicStructuredTool {
    const activitiesService = this.activitiesService;
    const participationService = this.participationService;
    return new DynamicStructuredTool({
      name: 'search_activities',
      description:
        'Tìm kiếm hoạt động CTXH trong hệ thống. ' +
        'Có thể lọc theo từ khóa tên, trạng thái, và chỉ lấy hoạt động đang diễn ra theo ngày. ' +
        'Dùng để trả lời câu hỏi về hoạt động (đang diễn ra, sắp tới, đã kết thúc...) ' +
        'và để xác nhận đúng hoạt động trước khi duyệt đăng ký.',
      schema: z.object({
        keyword: z.string().optional().describe('Từ khóa tìm trong tên, mô tả, địa điểm hoạt động'),
        status: z
          .enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
          .optional()
          .describe('Lọc theo một trạng thái cụ thể (để trống = tất cả trạng thái)'),
        ongoing_only: z
          .boolean()
          .optional()
          .describe('true = chỉ lấy hoạt động đang diễn ra hôm nay (start_date <= hôm nay <= end_date)'),
        current_date: z.string().optional().describe('Ngày hiện tại YYYY-MM-DD để lọc time-based'),
        limit: z.number().int().min(1).max(20).default(10).describe('Số kết quả tối đa'),
      }),
      func: async ({ keyword, status, ongoing_only, current_date, limit }) => {
        try {
          const today = current_date ?? new Date().toISOString().split('T')[0];

          const result = await activitiesService.findAll({
            search: keyword,
            status: status,
            // ongoing_only: activity overlaps [today, today] => start_date <= today AND end_date >= today
            start_date: ongoing_only ? today : undefined,
            end_date: ongoing_only ? today : undefined,
            limit: limit ?? 10,
            page: 1,
            user_id: userId,
          });

          // Fetch pending participants in parallel for all returned activities
          const pendingLists = await Promise.all(
            result.data.map((a: any) =>
              participationService.findPendingByActivity(a.id).catch(() => []),
            ),
          );

          return JSON.stringify({
            found: result.data.length,
            activities: result.data.map((a: any, i: number) => ({
              activity_id: a.id,
              name: a.name,
              status: a.status,
              start_date: a.start_date,
              end_date: a.end_date,
              total_days: a.total_days,
              location: a.location ?? null,
              organization_name: a.organization?.name ?? null,
              requires_approval: a.requires_approval,
              max_participants: a.max_participants ?? null,
              pending_count: pendingLists[i].length,
              pending_participants: pendingLists[i].map((p: any) => ({
                participation_id: p.id,
                student_name: p.student?.full_name ?? null,
                student_code: p.student_code ?? null,
                registered_at: p.created_at,
              })),
            })),
          });
        } catch (err: any) {
          return JSON.stringify({ error: err?.message ?? 'Lỗi truy vấn hoạt động.' });
        }
      },
    });
  }

  // ── Tool 2: get_pending_participants ──────────────────────────────────────

  private buildGetPendingParticipantsTool(): DynamicStructuredTool {
    const participationService = this.participationService;
    return new DynamicStructuredTool({
      name: 'get_pending_participants',
      description:
        'Lấy danh sách sinh viên đang chờ duyệt (PENDING) của một hoạt động cụ thể. ' +
        'Trả về participation_id, tên sinh viên, mã số, ngày đăng ký.',
      schema: z.object({
        activity_id: z.string().describe('UUID của hoạt động cần lấy danh sách PENDING'),
      }),
      func: async ({ activity_id }) => {
        try {
          const participants = await participationService.findPendingByActivity(activity_id);
          return JSON.stringify({
            activity_id,
            pending_count: participants.length,
            participants: participants.map((p: any) => ({
              participation_id: p.id,
              student_name: p.student?.full_name ?? null,
              student_code: p.student_code ?? null,
              email: p.student?.email ?? null,
              registered_at: p.created_at,
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
    const activitiesService = this.activitiesService;
    const participationService = this.participationService;
    const mailerService = this.mailerService;

    return new DynamicStructuredTool({
      name: 'approve_and_notify',
      description:
        'Duyệt hàng loạt đăng ký PENDING và gửi email xác nhận cho sinh viên được duyệt. ' +
        'Yêu cầu quyền ctxh.activities.manage_participants.',
      schema: z.object({
        activity_id: z.string().describe('UUID hoạt động'),
        participation_ids: z
          .array(z.string())
          .min(1)
          .max(200)
          .describe('Danh sách participation_id cần duyệt'),
        send_email_notification: z.boolean().default(true).describe('Gửi email xác nhận cho sinh viên'),
        email_custom_message: z.string().optional().describe('Nội dung bổ sung trong email'),
      }),
      func: async ({ activity_id, participation_ids, send_email_notification, email_custom_message }) => {
        try {
          // 1. Fetch activity via service
          const activity = await activitiesService.findOne(activity_id);

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

          // 3. Collect email addresses before approving (status changes to APPROVED after)
          let emailSet = new Set<string>();
          if (send_email_notification) {
            const pending = await participationService.findPendingByActivity(activity_id);
            emailSet = new Set(
              pending
                .filter((p: any) => participation_ids.includes(p.id) && p.student?.email)
                .map((p: any) => p.student.email as string),
            );
          }

          // 4. Batch approve
          const batchResult = await participationService.approveParticipationsBatch(
            activity_id,
            participation_ids,
            userId,
          );

          // 5. Send single BCC email to all approved students
          let emailsSent = 0;
          let emailsFailed = 0;

          if (send_email_notification && batchResult.successful.length > 0) {
            const emails = Array.from(emailSet);
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
        'Tạo hoạt động CTXH mới. Nhận tên danh mục và tên tổ chức (không cần UUID). ' +
        'Nếu chưa rõ tên chính xác, hãy dùng lookup_category hoặc lookup_organization trước. ' +
        'Yêu cầu quyền ctxh.activities.create cho đơn vị tổ chức.',
      schema: z.object({
        name: z.string().min(1).max(255).describe('Tên hoạt động CTXH'),
        description: z.string().optional().describe('Mô tả chi tiết'),
        category_name: z.string().describe('Tên danh mục hoạt động (sẽ tự động tìm UUID)'),
        organization_name: z.string().describe('Tên đơn vị tổ chức (sẽ tự động tìm UUID)'),
        start_date: z.string().describe('Ngày giờ bắt đầu ISO 8601 (24h), ví dụ: 2026-04-23T08:00:00'),
        end_date: z.string().describe('Ngày giờ kết thúc ISO 8601 (24h), ví dụ: 2026-04-25T17:00:00'),
        total_days: z.number().min(1).describe('Số ngày CTXH được công nhận'),
        location: z.string().max(500).optional().describe('Địa điểm tổ chức'),
        max_participants: z.number().int().min(1).optional().describe('Giới hạn số người tham gia'),
        requires_approval: z.boolean().default(false).describe('Đăng ký cần duyệt thủ công?'),
      }),
      func: async (args) => {
        try {
          // Resolve category by name
          const categories = await dataSource.query(
            `SELECT id, name FROM ctxh_category WHERE name ILIKE $1 AND deleted_at IS NULL LIMIT 5`,
            [`%${args.category_name}%`],
          );
          if (categories.length === 0) {
            return JSON.stringify({
              error: `Không tìm thấy danh mục nào khớp với "${args.category_name}". Dùng lookup_category để xem danh sách.`,
            });
          }
          if (categories.length > 1) {
            return JSON.stringify({
              error: `Tìm thấy ${categories.length} danh mục khớp với "${args.category_name}". Hãy chỉ định tên chính xác hơn.`,
              matches: categories.map((c: any) => ({ id: c.id, name: c.name })),
            });
          }
          const category_id: string = categories[0].id;

          // Resolve organization by name
          const organizations = await dataSource.query(
            `SELECT id, name, type, code FROM organizations WHERE name ILIKE $1 AND "isActive" = true LIMIT 5`,
            [`%${args.organization_name}%`],
          );
          if (organizations.length === 0) {
            return JSON.stringify({
              error: `Không tìm thấy tổ chức nào khớp với "${args.organization_name}". Dùng lookup_organization để xem danh sách.`,
            });
          }
          if (organizations.length > 1) {
            return JSON.stringify({
              error: `Tìm thấy ${organizations.length} tổ chức khớp với "${args.organization_name}". Hãy chỉ định tên chính xác hơn.`,
              matches: organizations.map((o: any) => ({ id: o.id, name: o.name, type: o.type, code: o.code })),
            });
          }
          const organization_id: string = organizations[0].id;

          // Permission check
          const hasPermission = await checkCtxhPermission(
            dataSource,
            userId,
            'ctxh.activities.create',
            organization_id,
          );
          if (!hasPermission) {
            return JSON.stringify({ error: 'Bạn không có quyền tạo hoạt động cho đơn vị này.' });
          }

          const { category_name, organization_name, ...rest } = args;
          const activity = await activitiesService.create({ ...rest, category_id, organization_id }, userId);

          return JSON.stringify({
            success: true,
            activity_id: activity.id,
            name: activity.name,
            status: activity.status,
            category: categories[0].name,
            organization: organizations[0].name,
            message: `Tạo hoạt động "${activity.name}" thành công!`,
          });
        } catch (err: any) {
          return JSON.stringify({ error: err?.message ?? 'Tạo hoạt động thất bại.' });
        }
      },
    });
  }

  // ── Tool 5: batch_create_activities (tạo tối đa 3 hoạt động cùng lúc) ──────

  private buildBatchCreateActivitiesTool(userId: string): DynamicStructuredTool {
    const dataSource = this.dataSource;
    const activitiesService = this.activitiesService;

    const ActivityItemSchema = z.object({
      name: z.string().min(1).max(255).describe('Tên hoạt động'),
      description: z.string().optional().describe('Mô tả chi tiết'),
      category_name: z.string().describe('Tên danh mục (tự động tìm UUID)'),
      organization_name: z.string().describe('Tên đơn vị tổ chức (tự động tìm UUID)'),
      start_date: z.string().describe('Ngày giờ bắt đầu ISO 8601 (24h), ví dụ: 2026-04-23T08:00:00'),
      end_date: z.string().describe('Ngày giờ kết thúc ISO 8601 (24h), ví dụ: 2026-04-25T17:00:00'),
      total_days: z.number().min(1).describe('Số ngày CTXH được công nhận'),
      location: z.string().max(500).optional().describe('Địa điểm'),
      max_participants: z.number().int().min(1).optional().describe('Giới hạn số người tham gia'),
      requires_approval: z.boolean().default(false).describe('Đăng ký cần duyệt?'),
    });

    return new DynamicStructuredTool({
      name: 'batch_create_activities',
      description:
        'Tạo nhiều hoạt động CTXH cùng lúc (tối đa 3). ' +
        'Dùng khi người dùng muốn tạo 2-3 hoạt động trong một yêu cầu. ' +
        'Mỗi hoạt động có thể có tổ chức, danh mục và thông tin khác nhau. ' +
        'Nếu chưa rõ tên chính xác của danh mục/tổ chức, hãy dùng lookup_category hoặc lookup_organization trước. ' +
        'Yêu cầu quyền ctxh.activities.create cho từng đơn vị tổ chức.',
      schema: z.object({
        activities: z
          .array(ActivityItemSchema)
          .min(2)
          .max(3)
          .describe('Danh sách 2-3 hoạt động cần tạo'),
      }),
      func: async ({ activities }) => {
        const results: any[] = [];

        for (const item of activities) {
          try {
            // Resolve category
            const categories = await dataSource.query(
              `SELECT id, name FROM ctxh_category WHERE name ILIKE $1 AND deleted_at IS NULL LIMIT 5`,
              [`%${item.category_name}%`],
            );
            if (categories.length === 0) {
              results.push({
                name: item.name,
                success: false,
                error: `Không tìm thấy danh mục khớp với "${item.category_name}".`,
              });
              continue;
            }
            if (categories.length > 1) {
              results.push({
                name: item.name,
                success: false,
                error: `Tìm thấy ${categories.length} danh mục khớp "${item.category_name}". Hãy chỉ định chính xác hơn.`,
                matches: categories.map((c: any) => c.name),
              });
              continue;
            }
            const category_id: string = categories[0].id;

            // Resolve organization
            const organizations = await dataSource.query(
              `SELECT id, name, type, code FROM organizations WHERE name ILIKE $1 AND "isActive" = true LIMIT 5`,
              [`%${item.organization_name}%`],
            );
            if (organizations.length === 0) {
              results.push({
                name: item.name,
                success: false,
                error: `Không tìm thấy tổ chức khớp với "${item.organization_name}".`,
              });
              continue;
            }
            if (organizations.length > 1) {
              results.push({
                name: item.name,
                success: false,
                error: `Tìm thấy ${organizations.length} tổ chức khớp "${item.organization_name}". Hãy chỉ định chính xác hơn.`,
                matches: organizations.map((o: any) => o.name),
              });
              continue;
            }
            const organization_id: string = organizations[0].id;

            // Permission check
            const hasPermission = await checkCtxhPermission(
              dataSource,
              userId,
              'ctxh.activities.create',
              organization_id,
            );
            if (!hasPermission) {
              results.push({
                name: item.name,
                success: false,
                error: `Bạn không có quyền tạo hoạt động cho đơn vị "${organizations[0].name}".`,
              });
              continue;
            }

            const { category_name, organization_name, ...rest } = item;
            const activity = await activitiesService.create(
              { ...rest, category_id, organization_id },
              userId,
            );

            results.push({
              name: item.name,
              success: true,
              activity_id: activity.id,
              status: activity.status,
              organization: organizations[0].name,
              category: categories[0].name,
            });
          } catch (err: any) {
            results.push({
              name: item.name,
              success: false,
              error: err?.message ?? 'Tạo hoạt động thất bại.',
            });
          }
        }

        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        return JSON.stringify({
          total: activities.length,
          succeeded,
          failed,
          results,
          message:
            failed === 0
              ? `Tạo thành công ${succeeded}/${activities.length} hoạt động.`
              : `Tạo ${succeeded}/${activities.length} hoạt động thành công, ${failed} thất bại.`,
        });
      },
    });
  }

  // ── Tool 6: manage_activity (update / delete) via MCP SQL ─────────────────

  private buildManageActivityTool(userId: string): DynamicStructuredTool {
    const dataSource = this.dataSource;
    const mcpClient = this.postgresMcpClient;

    return new DynamicStructuredTool({
      name: 'manage_activity',
      description:
        'Cập nhật thông tin, thay đổi trạng thái, hoặc xoá hoạt động CTXH qua MCP Postgres. ' +
        'action="update": cập nhật các trường được cung cấp (bao gồm status). ' +
        'action="delete": xoá mềm hoạt động (đặt deleted_at). ' +
        'Yêu cầu activity_id (UUID). Tra cứu bằng search_activities nếu chưa có ID.',
      schema: z.object({
        action: z
          .enum(['update', 'delete'])
          .describe('"update" cập nhật trường (kể cả status), "delete" xoá mềm'),
        activity_id: z.string().uuid().describe('UUID của hoạt động cần thao tác'),
        // Fields chỉ dùng khi action = 'update'
        name: z.string().min(1).max(255).optional().describe('Tên mới'),
        description: z.string().optional().describe('Mô tả mới'),
        status: z
          .enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
          .optional()
          .describe('Trạng thái mới: DRAFT | ACTIVE | COMPLETED | CANCELLED'),
        start_date: z.string().optional().describe('Ngày giờ bắt đầu mới ISO 8601 (24h), ví dụ: 2026-04-23T08:00:00'),
        end_date: z.string().optional().describe('Ngày giờ kết thúc mới ISO 8601 (24h), ví dụ: 2026-04-25T17:00:00'),
        location: z.string().max(500).optional().describe('Địa điểm mới'),
        total_days: z.number().min(0).optional().describe('Số ngày CTXH mới'),
        max_participants: z.number().int().min(1).optional().describe('Giới hạn người tham gia mới'),
        requires_approval: z.boolean().optional().describe('Bật/tắt xét duyệt đăng ký'),
      }),
      func: async ({ action, activity_id, ...fields }) => {
        try {
          if (!mcpClient.isConnected()) {
            return JSON.stringify({ error: 'MCP Postgres không kết nối được. Vui lòng thử lại sau.' });
          }

          // 1. Fetch activity to get organization_id for permission check
          const rows = await mcpClient.executeSqlRows(
            `SELECT id, name, status, organization_id, deleted_at
             FROM ctxh_activity
             WHERE id = '${activity_id.replace(/'/g, "''")}'
             LIMIT 1`,
          );

          if (!Array.isArray(rows) || rows.length === 0) {
            return JSON.stringify({ error: `Không tìm thấy hoạt động với id="${activity_id}".` });
          }

          const activity = rows[0];

          if (activity.deleted_at) {
            return JSON.stringify({ error: 'Hoạt động này đã bị xoá.' });
          }

          // 2. Permission check
          const requiredPermission =
            action === 'delete' ? 'ctxh.activities.delete' : 'ctxh.activities.update';

          const hasPermission = await checkCtxhPermission(
            dataSource,
            userId,
            requiredPermission,
            activity.organization_id,
          );
          if (!hasPermission) {
            return JSON.stringify({
              error: `Bạn không có quyền "${requiredPermission}" cho hoạt động này.`,
            });
          }

          // 3. Execute action via MCP SQL
          if (action === 'delete') {
            await mcpClient.executeSqlRows(
              `UPDATE ctxh_activity SET deleted_at = NOW(), updated_at = NOW()
               WHERE id = '${activity_id.replace(/'/g, "''")}'`,
            );
            return JSON.stringify({
              success: true,
              action: 'delete',
              activity_id,
              activity_name: activity.name,
              message: `Đã xoá hoạt động "${activity.name}".`,
            });
          }

          // action === 'update'
          const updateFields: string[] = [];
          const safe = (v: string) => v.replace(/'/g, "''");

          if (fields.name !== undefined) updateFields.push(`name = '${safe(fields.name)}'`);
          if (fields.description !== undefined) updateFields.push(`description = '${safe(fields.description)}'`);
          if (fields.status !== undefined) updateFields.push(`status = '${fields.status}'`);
          if (fields.start_date !== undefined) updateFields.push(`start_date = '${safe(fields.start_date)}'`);
          if (fields.end_date !== undefined) updateFields.push(`end_date = '${safe(fields.end_date)}'`);
          if (fields.location !== undefined) updateFields.push(`location = '${safe(fields.location)}'`);
          if (fields.total_days !== undefined) updateFields.push(`total_days = ${fields.total_days}`);
          if (fields.max_participants !== undefined) updateFields.push(`max_participants = ${fields.max_participants}`);
          if (fields.requires_approval !== undefined) updateFields.push(`requires_approval = ${fields.requires_approval}`);

          if (updateFields.length === 0) {
            return JSON.stringify({ error: 'Không có trường nào được cung cấp để cập nhật.' });
          }

          updateFields.push(`updated_by = '${userId}'`, 'updated_at = NOW()');

          await mcpClient.executeSqlRows(
            `UPDATE ctxh_activity SET ${updateFields.join(', ')}
             WHERE id = '${activity_id.replace(/'/g, "''")}'`,
          );

          return JSON.stringify({
            success: true,
            action: 'update',
            activity_id,
            activity_name: fields.name ?? activity.name,
            updated_fields: Object.keys(fields).filter((k) => (fields as any)[k] !== undefined),
            message: `Đã cập nhật hoạt động "${activity.name}" thành công.`,
          });
        } catch (err: any) {
          return JSON.stringify({ error: err?.message ?? 'Thao tác thất bại.' });
        }
      },
    });
  }

  // ── Tool 7 (new): get_pending_overview ────────────────────────────────────

  private buildGetPendingOverviewTool(userId: string, sessionId: string): DynamicStructuredTool {
    const mcpClient = this.postgresMcpClient;
    const cache = this.sessionActivityCache;

    return new DynamicStructuredTool({
      name: 'get_pending_overview',
      description:
        'Lấy danh sách tối đa 10 hoạt động gần nhất có sinh viên đang chờ duyệt (PENDING). ' +
        'Chỉ trả về hoạt động có requires_approval = true. ' +
        'Ưu tiên hiển thị hoạt động do người dùng hiện tại tạo. ' +
        'Có thể lọc theo tên đơn vị tổ chức hoặc danh mục. ' +
        'Kết quả được lưu vào bộ nhớ phiên để tham chiếu khi duyệt sau.',
      schema: z.object({
        organization_keyword: z
          .string()
          .optional()
          .describe('Lọc theo tên đơn vị tổ chức (tìm gần đúng, để trống = tất cả)'),
        category_keyword: z
          .string()
          .optional()
          .describe('Lọc theo tên danh mục (tìm gần đúng, để trống = tất cả)'),
      }),
      func: async ({ organization_keyword, category_keyword }) => {
        try {
          if (!mcpClient.isConnected()) {
            return JSON.stringify({ error: 'MCP Postgres không kết nối được. Vui lòng thử lại sau.' });
          }

          const safe = (v: string) => v.replace(/'/g, "''");
          const extraClauses: string[] = [];

          if (organization_keyword?.trim()) {
            extraClauses.push(`AND org.name ILIKE '%${safe(organization_keyword.trim())}%'`);
          }
          if (category_keyword?.trim()) {
            extraClauses.push(`AND cat.name ILIKE '%${safe(category_keyword.trim())}%'`);
          }

          const sql = `
            SELECT
              ca.id AS activity_id,
              ca.name AS activity_name,
              ca.status,
              ca.start_date,
              ca.end_date,
              ca.location,
              ca.created_by,
              org.name AS organization_name,
              cat.name AS category_name,
              pending.pending_count
            FROM ctxh_activity ca
            INNER JOIN (
              SELECT activity_id, COUNT(*) AS pending_count
              FROM ctxh_participation
              WHERE status = 'PENDING' AND deleted_at IS NULL
              GROUP BY activity_id
            ) pending ON pending.activity_id = ca.id
            LEFT JOIN organizations org ON org.id = ca.organization_id
            LEFT JOIN ctxh_category cat ON cat.id = ca.category_id
            WHERE ca.deleted_at IS NULL
              AND ca.requires_approval = true
              AND ca.status IN ('ACTIVE', 'DRAFT')
              ${extraClauses.join(' ')}
            ORDER BY
              CASE WHEN ca.created_by = '${userId.replace(/'/g, "''")}' THEN 0 ELSE 1 END ASC,
              ca.created_at DESC
            LIMIT 10
          `;

          const rows: any[] = await mcpClient.executeSqlRows(sql);

          if (!Array.isArray(rows) || rows.length === 0) {
            cache.delete(sessionId);
            return JSON.stringify({
              found: 0,
              activities: [],
              message: 'Không có hoạt động nào đang chờ duyệt.',
            });
          }

          // Persist to session cache
          const summaries: ActivitySummary[] = rows.map((r) => ({
            activity_id: r.activity_id,
            activity_name: r.activity_name,
            organization_name: r.organization_name ?? null,
            pending_count: Number(r.pending_count),
          }));
          cache.set(sessionId, summaries);

          return JSON.stringify({
            found: rows.length,
            activities: rows.map((r) => ({
              activity_id: r.activity_id,
              activity_name: r.activity_name,
              status: r.status,
              start_date: r.start_date,
              end_date: r.end_date,
              location: r.location ?? null,
              organization_name: r.organization_name ?? null,
              category_name: r.category_name ?? null,
              pending_count: Number(r.pending_count),
              is_mine: r.created_by === userId,
            })),
            message: `Tìm thấy ${rows.length} hoạt động có sinh viên chờ duyệt.`,
          });
        } catch (err: any) {
          return JSON.stringify({ error: err?.message ?? 'Lỗi truy vấn danh sách chờ duyệt.' });
        }
      },
    });
  }

  // ── Tool 8: lookup_category ───────────────────────────────────────────────

  private buildLookupCategoryTool(): DynamicStructuredTool {
    const dataSource = this.dataSource;

    return new DynamicStructuredTool({
      name: 'lookup_category',
      description:
        'Tìm kiếm danh mục hoạt động CTXH theo tên (tìm gần đúng). ' +
        'Dùng trước khi tạo hoạt động để xác nhận tên danh mục chính xác.',
      schema: z.object({
        name: z.string().optional().describe('Từ khóa tìm kiếm tên danh mục (để trống = lấy tất cả)'),
        limit: z.number().int().min(1).max(50).default(20).describe('Số kết quả tối đa'),
      }),
      func: async ({ name, limit }) => {
        try {
          const search = name?.trim() ? `%${name.trim()}%` : '%';
          const rows = await dataSource.query(
            `SELECT id, name, description FROM ctxh_category WHERE name ILIKE $1 AND deleted_at IS NULL ORDER BY name ASC LIMIT $2`,
            [search, limit ?? 20],
          );
          return JSON.stringify({
            found: rows.length,
            categories: rows.map((r: any) => ({ id: r.id, name: r.name, description: r.description ?? null })),
          });
        } catch (err: any) {
          return JSON.stringify({ error: err?.message ?? 'Lỗi tra cứu danh mục.' });
        }
      },
    });
  }

  // ── Tool 9: lookup_organization ──────────────────────────────────────────

  private buildLookupOrganizationTool(): DynamicStructuredTool {
    const dataSource = this.dataSource;

    return new DynamicStructuredTool({
      name: 'lookup_organization',
      description:
        'Tìm kiếm tổ chức theo tên (tìm gần đúng). ' +
        'Dùng trước khi tạo hoạt động để xác nhận tên tổ chức chính xác.',
      schema: z.object({
        name: z.string().optional().describe('Từ khóa tìm kiếm tên tổ chức (để trống = lấy tất cả)'),
        limit: z.number().int().min(1).max(50).default(20).describe('Số kết quả tối đa'),
      }),
      func: async ({ name, limit }) => {
        try {
          const search = name?.trim() ? `%${name.trim()}%` : '%';
          const rows = await dataSource.query(
            `SELECT id, name, type, code FROM organizations WHERE name ILIKE $1 AND "isActive" = true ORDER BY name ASC LIMIT $2`,
            [search, limit ?? 20],
          );
          return JSON.stringify({
            found: rows.length,
            organizations: rows.map((r: any) => ({ id: r.id, name: r.name, type: r.type, code: r.code })),
          });
        } catch (err: any) {
          return JSON.stringify({ error: err?.message ?? 'Lỗi tra cứu tổ chức.' });
        }
      },
    });
  }
}
