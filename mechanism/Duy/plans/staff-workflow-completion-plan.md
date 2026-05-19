# KẾ HOẠCH: Hoàn thiện Workflow Duyệt & Quản lý Hoạt động (Staff Chatbot)

> **Scope**: 2 improvements cho Staff Agent tools
> 1. **Workflow 1**: Thêm tool từ chối đăng ký + duyệt chọn lọc
> 2. **Workflow 3**: Fix `manage_activity` — dùng service layer thay raw SQL

---

## MỤC LỤC

1. [Tổng quan thay đổi](#1-tổng-quan-thay-đổi)
2. [Task 1: Tool `reject_registration`](#2-task-1-tool-reject_registration)
3. [Task 2: Nâng cấp `approve_and_notify` — duyệt chọn lọc](#3-task-2-nâng-cấp-approve_and_notify--duyệt-chọn-lọc)
4. [Task 3: Fix `manage_activity` — dùng service layer](#4-task-3-fix-manage_activity--dùng-service-layer)
5. [Task 4: Update Staff Agent prompt](#5-task-4-update-staff-agent-prompt)
6. [Task 5: Test scenarios](#6-task-5-test-scenarios)
7. [Checklist hoàn thành](#7-checklist-hoàn-thành)

---

## 1. TỔNG QUAN THAY ĐỔI

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `backend/src/ctxh-chat/services/staff-agent.service.ts` | Thêm `reject_registration`, sửa `manage_activity` |
| `backend/src/ctxh-chat/prompts/staff-agent.prompt.ts` | Update prompt mô tả tools mới |
| `backend/src/ctxh/activity/services/participation.service.ts` | Thêm method `rejectParticipation()` + `rejectParticipationsBatch()` |

### Files KHÔNG cần sửa

| File | Lý do |
|------|-------|
| `activities.service.ts` | Đã có `update()`, `remove()` đầy đủ — chỉ cần tool gọi đúng |
| `ctxh-vector-sync.service.ts` | Đã listen events — khi gọi service layer, events tự emit |
| `ctxh-participation.entity.ts` | Status CANCELLED đã có trong enum — dùng cho reject |
| MCP servers | Không liên quan — tools này là LangChain tools |

### Trước vs Sau

| Workflow | Trước | Sau |
|----------|-------|-----|
| Từ chối đăng ký | ❌ Không có | ✅ `reject_registration` (single + batch) |
| Duyệt chọn lọc | ❌ Chỉ batch all | ✅ `approve_and_notify` hỗ trợ chọn theo tên/MSSV |
| Update hoạt động | ⚠️ Raw SQL (bypass logic) | ✅ Gọi `activitiesService.update()` (trigger events + validation) |
| Delete hoạt động | ⚠️ Raw SQL (bypass logic) | ✅ Gọi `activitiesService.remove()` (check participants + trigger events) |

---

## 2. TASK 1: Tool `reject_registration`

### 2.1. Thêm method vào ParticipationService

**File**: `backend/src/ctxh/activity/services/participation.service.ts`

**Thêm 2 methods mới:**

```typescript
/**
 * Từ chối 1 đăng ký PENDING → đổi status sang CANCELLED + ghi lý do
 */
async rejectParticipation(
  participationId: string,
  rejectedBy: string,
  reason?: string,
): Promise<void> {
  const participation = await this.participationRepo.findOne({
    where: { id: participationId, deleted_at: IsNull() },
    relations: ['activity'],
  });

  if (!participation) {
    throw new NotFoundException(`Không tìm thấy đăng ký với id="${participationId}".`);
  }

  if (participation.status !== ParticipationStatus.PENDING) {
    throw new BadRequestException(
      `Chỉ có thể từ chối đăng ký đang ở trạng thái PENDING. Hiện tại: ${participation.status}`,
    );
  }

  participation.status = ParticipationStatus.CANCELLED;
  participation.note = reason ?? 'Bị từ chối bởi nhân viên';
  participation.updated_by = rejectedBy;

  await this.participationRepo.save(participation);
}

/**
 * Từ chối hàng loạt
 */
async rejectParticipationsBatch(
  activityId: string,
  participationIds: string[],
  rejectedBy: string,
  reason?: string,
): Promise<{ successful: string[]; failed: { id: string; error: string }[]; total: number }> {
  const successful: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const pid of participationIds) {
    try {
      await this.rejectParticipation(pid, rejectedBy, reason);
      successful.push(pid);
    } catch (err: any) {
      failed.push({ id: pid, error: err.message });
    }
  }

  return { successful, failed, total: participationIds.length };
}
```

**Lý do dùng status CANCELLED** (không phải soft delete):
- `removeParticipant()` hiện tại soft delete (set `deleted_at`) → record biến mất khỏi queries
- "Từ chối" nên giữ record visible (status=CANCELLED) để staff/SV biết đã bị reject
- Entity enum đã có `CANCELLED` → không cần migration
- SV xem lại thấy "CANCELLED" + lý do → UX tốt hơn "biến mất không nói gì"

### 2.2. Thêm tool vào StaffAgentService

**File**: `backend/src/ctxh-chat/services/staff-agent.service.ts`

**Thêm method `buildRejectRegistrationTool()`:**

```typescript
private buildRejectRegistrationTool(userId: string): DynamicStructuredTool {
  const participationService = this.participationService;
  const activitiesService = this.activitiesService;
  const dataSource = this.dataSource;
  const mailerService = this.mailerService;

  return new DynamicStructuredTool({
    name: 'reject_registration',
    description:
      'Từ chối đăng ký CTXH của sinh viên đang ở trạng thái PENDING. ' +
      'Hỗ trợ từ chối 1 hoặc nhiều sinh viên cùng lúc. ' +
      'Có thể ghi lý do từ chối và gửi email thông báo. ' +
      'Dùng get_pending_participants để lấy danh sách participation_ids trước.',
    schema: z.object({
      activity_id: z.string().uuid().describe('UUID hoạt động'),
      participation_ids: z
        .array(z.string().uuid())
        .min(1)
        .max(200)
        .describe('Danh sách participation IDs cần từ chối'),
      reason: z
        .string()
        .optional()
        .describe('Lý do từ chối (sẽ ghi vào note của participation)'),
      send_email_notification: z
        .boolean()
        .default(true)
        .describe('Gửi email thông báo từ chối cho sinh viên'),
    }),
    func: async ({ activity_id, participation_ids, reason, send_email_notification }) => {
      try {
        // 1. Fetch activity
        const activity = await activitiesService.findOne(activity_id);

        // 2. Permission check
        const hasPermission = await checkCtxhPermission(
          dataSource, userId, 'ctxh.activities.manage_participants', activity.organization_id,
        );
        if (!hasPermission) {
          return JSON.stringify({ error: 'Bạn không có quyền từ chối đăng ký cho hoạt động này.' });
        }

        // 3. Collect emails BEFORE rejecting
        let emailSet = new Set<string>();
        if (send_email_notification) {
          const pending = await participationService.findPendingByActivity(activity_id);
          emailSet = new Set(
            pending
              .filter((p: any) => participation_ids.includes(p.id) && p.student?.email)
              .map((p: any) => p.student.email as string),
          );
        }

        // 4. Batch reject
        const result = await participationService.rejectParticipationsBatch(
          activity_id, participation_ids, userId, reason,
        );

        // 5. Send rejection email
        let emailsSent = 0;
        if (send_email_notification && result.successful.length > 0) {
          const emails = Array.from(emailSet);
          if (emails.length > 0) {
            const sent = await mailerService.sendRejectionEmail({
              bcc: emails.join(', '),
              activityName: activity.name,
              reason: reason ?? 'Không đủ điều kiện tham gia',
            });
            if (sent) emailsSent = emails.length;
          }
        }

        return JSON.stringify({
          success: true,
          activity_id,
          activity_name: activity.name,
          rejected: result.successful.length,
          failed: result.failed.length,
          reason: reason ?? null,
          emails_sent: emailsSent,
          failed_details: result.failed,
        });
      } catch (err: any) {
        return JSON.stringify({ error: err?.message ?? 'Từ chối đăng ký thất bại.' });
      }
    },
  });
}
```

**Register tool** — thêm vào `buildTools()`:

```typescript
private buildTools(userId: string, sessionId: string) {
  const customTools = [
    this.buildSearchActivitiesTool(userId),
    this.buildGetPendingParticipantsTool(),
    this.buildApproveAndNotifyTool(userId),
    this.buildRejectRegistrationTool(userId),     // ← THÊM
    this.buildCreateActivityTool(userId),
    // ... rest
  ];
}
```

### 2.3. Thêm `sendRejectionEmail` vào MailerService

**Check**: Xem `mailerService` đã có method gửi email từ chối chưa.

- Nếu **CÓ** `sendRejectionEmail` → dùng luôn
- Nếu **KHÔNG CÓ** → thêm method mới (tương tự `sendApprovalEmail` nhưng đổi template):

```typescript
async sendRejectionEmail(params: {
  bcc: string;
  activityName: string;
  reason: string;
}): Promise<boolean> {
  return this.sendMail({
    bcc: params.bcc,
    subject: `[Đoàn Hội] Thông báo từ chối đăng ký hoạt động "${params.activityName}"`,
    html: `
      <p>Xin chào,</p>
      <p>Đăng ký của bạn cho hoạt động <strong>${params.activityName}</strong> 
         đã bị từ chối.</p>
      <p><strong>Lý do:</strong> ${params.reason}</p>
      <p>Nếu có thắc mắc, vui lòng liên hệ nhân viên phụ trách.</p>
    `,
  });
}
```

---

## 3. TASK 2: Nâng cấp `approve_and_notify` — Duyệt chọn lọc

### Vấn đề hiện tại

Tool `approve_and_notify` yêu cầu `participation_ids` → LLM phải truyền list IDs.
Nhưng staff thường nói: **"Duyệt sinh viên Nguyễn Văn A"** chứ không nói ID.

### Giải pháp: Thêm field `filter_by_name` / `filter_by_student_code`

**Thay đổi schema** của `approve_and_notify`:

```typescript
schema: z.object({
  activity_id: z.string().uuid(),
  // Option 1: Truyền IDs trực tiếp (giữ nguyên)
  participation_ids: z.array(z.string().uuid()).optional()
    .describe('Danh sách participation IDs cần duyệt. Dùng khi đã biết IDs.'),
  // Option 2: Duyệt theo tên sinh viên (MỚI)
  student_names: z.array(z.string()).optional()
    .describe('Tên sinh viên cần duyệt (tìm gần đúng). VD: ["Nguyễn Văn A", "Trần B"]'),
  // Option 3: Duyệt theo MSSV (MỚI)
  student_codes: z.array(z.string()).optional()
    .describe('Mã số sinh viên cần duyệt. VD: ["2012345", "2012678"]'),
  // Option 4: Duyệt tất cả (MỚI)
  approve_all: z.boolean().optional().default(false)
    .describe('Duyệt TẤT CẢ sinh viên PENDING. Cẩn thận!'),
  send_email_notification: z.boolean().default(true),
  email_custom_message: z.string().optional(),
}),
```

**Logic mới trong func:**

```typescript
func: async ({ activity_id, participation_ids, student_names, student_codes, approve_all, ... }) => {
  // 1. Fetch all pending
  const allPending = await participationService.findPendingByActivity(activity_id);
  
  let targetIds: string[];

  if (participation_ids && participation_ids.length > 0) {
    // Option 1: Direct IDs
    targetIds = participation_ids;
  } else if (approve_all) {
    // Option 4: All pending
    targetIds = allPending.map(p => p.id);
  } else if (student_names && student_names.length > 0) {
    // Option 2: Filter by name (fuzzy)
    targetIds = allPending
      .filter(p => student_names.some(name => 
        p.student?.fullName?.toLowerCase().includes(name.toLowerCase())
      ))
      .map(p => p.id);
    
    if (targetIds.length === 0) {
      return JSON.stringify({ 
        error: `Không tìm thấy sinh viên nào khớp tên: ${student_names.join(', ')}`,
        pending_students: allPending.map(p => ({ 
          id: p.id, name: p.student?.fullName, code: p.student_code 
        })),
      });
    }
  } else if (student_codes && student_codes.length > 0) {
    // Option 3: Filter by MSSV
    targetIds = allPending
      .filter(p => student_codes.includes(p.student_code))
      .map(p => p.id);
    
    if (targetIds.length === 0) {
      return JSON.stringify({ 
        error: `Không tìm thấy MSSV nào trong danh sách PENDING: ${student_codes.join(', ')}`,
      });
    }
  } else {
    return JSON.stringify({ error: 'Cần cung cấp participation_ids, student_names, student_codes, hoặc approve_all=true.' });
  }

  // 2. Proceed with approval (existing logic)
  const batchResult = await participationService.approveParticipationsBatch(activity_id, targetIds, userId);
  // ... email logic giữ nguyên
}
```

**Tương tự cho `reject_registration`** — cũng hỗ trợ filter by name/code.

### Conversation flow mới

```
Staff: "Duyệt sinh viên Nguyễn Văn A và Trần Thị B trong hoạt động hiến máu"
→ LLM calls: approve_and_notify({ 
    activity_id: "...", 
    student_names: ["Nguyễn Văn A", "Trần Thị B"] 
  })
→ Tool tìm trong pending list → match → approve 2 người → email

Staff: "Từ chối MSSV 2012345 vì chưa đủ điều kiện"
→ LLM calls: reject_registration({
    activity_id: "...",
    student_codes: ["2012345"],
    reason: "Chưa đủ điều kiện tham gia"
  })
```

---

## 4. TASK 3: Fix `manage_activity` — Dùng Service Layer

### Vấn đề hiện tại

```typescript
// ❌ HIỆN TẠI: Raw SQL qua MCP
await mcpClient.executeSqlRows(
  `UPDATE ctxh_activity SET ${updateFields.join(', ')} WHERE id = '${activity_id}'`,
);
// Hậu quả:
// - KHÔNG trigger ActivityUpdatedEvent → vector stale
// - KHÔNG validate business rules
// - KHÔNG check org day limits
// - KHÔNG check duplicate name
// - SQL injection risk (string interpolation)
```

### Giải pháp: Gọi `activitiesService.update()` và `activitiesService.remove()`

**Rewrite `buildManageActivityTool()`:**

```typescript
private buildManageActivityTool(userId: string): DynamicStructuredTool {
  const activitiesService = this.activitiesService;
  const dataSource = this.dataSource;

  return new DynamicStructuredTool({
    name: 'manage_activity',
    description:
      'Cập nhật thông tin, thay đổi trạng thái, hoặc xoá hoạt động CTXH. ' +
      'action="update": cập nhật các trường được cung cấp (bao gồm status). ' +
      'action="delete": xoá mềm hoạt động (kiểm tra không còn SV tham gia trước khi xoá). ' +
      'Yêu cầu activity_id (UUID). Tra cứu bằng search_activities nếu chưa có ID.',
    schema: z.object({
      action: z
        .enum(['update', 'delete'])
        .describe('"update" cập nhật trường, "delete" xoá mềm'),
      activity_id: z.string().uuid().describe('UUID của hoạt động'),
      // Update fields (chỉ khi action = 'update')
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
      start_date: z.string().optional().describe('ISO 8601, ví dụ: 2026-04-23T08:00:00'),
      end_date: z.string().optional().describe('ISO 8601, ví dụ: 2026-04-25T17:00:00'),
      location: z.string().max(500).optional(),
      total_days: z.number().min(0).optional(),
      max_participants: z.number().int().min(1).optional(),
      requires_approval: z.boolean().optional(),
    }),
    func: async ({ action, activity_id, ...fields }) => {
      try {
        // 1. Permission check (giữ nguyên logic cũ)
        const activity = await activitiesService.findOne(activity_id);
        const requiredPermission = action === 'delete'
          ? 'ctxh.activities.delete'
          : 'ctxh.activities.update';

        const hasPermission = await checkCtxhPermission(
          dataSource, userId, requiredPermission, activity.organization_id,
        );
        if (!hasPermission) {
          return JSON.stringify({
            error: `Bạn không có quyền "${requiredPermission}" cho hoạt động này.`,
          });
        }

        // 2. Execute action VIA SERVICE LAYER (không dùng raw SQL)
        if (action === 'delete') {
          // ✅ activitiesService.remove() sẽ:
          // - Check active participants (throw ConflictException nếu có)
          // - Soft delete (set deleted_at, deleted_by)
          // - Emit ACTIVITY_EVENTS.DELETED → vector sync xóa embedding
          await activitiesService.remove(activity_id, userId);
          return JSON.stringify({
            success: true,
            action: 'delete',
            activity_id,
            activity_name: activity.name,
            message: `Đã xoá hoạt động "${activity.name}".`,
          });
        }

        // action === 'update'
        // Lọc chỉ các field có giá trị
        const updateDto: Record<string, any> = {};
        for (const [key, value] of Object.entries(fields)) {
          if (value !== undefined) updateDto[key] = value;
        }

        if (Object.keys(updateDto).length === 0) {
          return JSON.stringify({ error: 'Không có trường nào để cập nhật.' });
        }

        // ✅ activitiesService.update() sẽ:
        // - Validate category nếu đổi
        // - Check duplicate name nếu đổi
        // - Validate org day limit nếu đổi total_days
        // - Emit ACTIVITY_EVENTS.STATUS_CHANGED nếu đổi status
        // - Emit ACTIVITY_EVENTS.UPDATED → vector sync re-embed
        // - Set updated_by, updated_at tự động
        const updated = await activitiesService.update(activity_id, updateDto, userId);

        return JSON.stringify({
          success: true,
          action: 'update',
          activity_id,
          activity_name: updated.name,
          updated_fields: Object.keys(updateDto),
          message: `Đã cập nhật hoạt động "${updated.name}" thành công.`,
        });
      } catch (err: any) {
        return JSON.stringify({ error: err?.message ?? 'Thao tác thất bại.' });
      }
    },
  });
}
```

### Lợi ích sau khi fix

| Trước (Raw SQL) | Sau (Service Layer) |
|---|---|
| ❌ Không trigger events | ✅ Events emit → vector auto-sync |
| ❌ Không validate business rules | ✅ Validate duplicate name, org limits, category |
| ❌ Không set updated_by | ✅ Audit trail tự động |
| ❌ Cho đổi COMPLETED → ACTIVE | ✅ Service validate status transitions |
| ❌ Xóa khi còn SV tham gia | ✅ Throw ConflictException |
| ❌ SQL injection risk | ✅ TypeORM parameterized queries |
| ❌ Phụ thuộc MCP connection | ✅ Direct service call — no external dependency |

### Breaking change

- `manage_activity` **KHÔNG CÒN phụ thuộc `PostgresMcpClientService`** → bỏ inject `mcpClient` trong tool builder
- Error messages có thể khác (từ service exceptions thay vì SQL errors)
- Status transition validation có thể strict hơn → staff cần biết rules

---

## 5. TASK 4: Update Staff Agent Prompt

**File**: `backend/src/ctxh-chat/prompts/staff-agent.prompt.ts`

### Thêm mô tả tool mới vào system prompt

```typescript
export function STAFF_AGENT_SYSTEM_PROMPT(currentDate: string, cachedActivities?: string): string {
  return `...
Ngày hiện tại: ${currentDate}

Các công cụ có sẵn:
1. **search_activities** — Tìm kiếm hoạt động CTXH
2. **get_pending_overview** — Xem hoạt động có SV chờ duyệt
3. **get_pending_participants** — Xem chi tiết DS pending 1 HĐ
4. **approve_and_notify** — Duyệt đăng ký (chọn lọc theo tên/MSSV hoặc tất cả) + email
5. **reject_registration** — Từ chối đăng ký (chọn lọc) + email với lý do    ← MỚI
6. **create_activity** — Tạo hoạt động mới
7. **batch_create_activities** — Tạo 2-3 HĐ cùng lúc
8. **manage_activity** — Cập nhật/xóa hoạt động (qua service layer)
9. **lookup_category** — Tra cứu danh mục
10. **lookup_organization** — Tra cứu tổ chức

QUY TẮC DUYỆT/TỪ CHỐI:
- Khi staff nói "duyệt hết" → dùng approve_and_notify với approve_all=true
- Khi staff nói "duyệt [tên SV]" → dùng approve_and_notify với student_names
- Khi staff nói "từ chối [tên SV]" → dùng reject_registration với student_names + reason
- LUÔN xác nhận trước khi duyệt/từ chối hàng loạt (> 5 người)
- LUÔN hỏi lý do khi từ chối nếu staff chưa nói

QUY TẮC QUẢN LÝ HOẠT ĐỘNG:
- manage_activity giờ validate business rules (duplicate name, org limits, status transitions)
- Không thể xóa hoạt động đang có sinh viên tham gia
- Thay đổi status: DRAFT→ACTIVE→COMPLETED/CANCELLED (không quay ngược)
...`;
}
```

---

## 6. TASK 5: Test Scenarios

### Scenario 1: Từ chối đăng ký

```
Staff: "Hoạt động nào có sinh viên chờ duyệt?"
Bot:   → get_pending_overview → "Hiến máu nhân đạo: 15 SV pending..."

Staff: "Cho xem DS hoạt động hiến máu"
Bot:   → get_pending_participants → "1. Nguyễn Văn A, 2. Trần Thị B, ..."

Staff: "Từ chối Nguyễn Văn A vì chưa đủ 18 tuổi"
Bot:   → reject_registration({ student_names: ["Nguyễn Văn A"], reason: "Chưa đủ 18 tuổi" })
       → "Đã từ chối đăng ký của Nguyễn Văn A. Email thông báo đã gửi."

Staff: "Duyệt 3 người còn lại"
Bot:   → approve_and_notify({ approve_all: true })
       → "Đã duyệt 14 sinh viên. Email xác nhận đã gửi."
```

### Scenario 2: Duyệt chọn lọc

```
Staff: "Duyệt sinh viên có MSSV 2012345 và 2012678"
Bot:   → approve_and_notify({ student_codes: ["2012345", "2012678"] })
       → "Đã duyệt 2 sinh viên."
```

### Scenario 3: Cập nhật hoạt động (qua service layer)

```
Staff: "Đổi địa điểm hoạt động hiến máu sang CS2"
Bot:   → search_activities → tìm activity_id
       → manage_activity({ action: "update", activity_id: "...", location: "CS2" })
       → activitiesService.update() → emit ActivityUpdatedEvent → vector sync
       → "Đã cập nhật địa điểm sang CS2."

Staff: "Chuyển hoạt động sang trạng thái hoàn thành"
Bot:   → manage_activity({ action: "update", activity_id: "...", status: "COMPLETED" })
       → activitiesService.update() → validate transition → emit StatusChangedEvent
       → "Đã chuyển trạng thái sang COMPLETED."
```

### Scenario 4: Xóa hoạt động (validation)

```
Staff: "Xóa hoạt động dọn vệ sinh"
Bot:   → manage_activity({ action: "delete", activity_id: "..." })
       → activitiesService.remove() → check participants → ConflictException
       → "Không thể xóa: hoạt động đang có 5 sinh viên tham gia."
```

### Edge cases cần test

| Case | Expected |
|------|----------|
| Từ chối SV đã APPROVED | Error: "Chỉ từ chối được PENDING" |
| Duyệt tên SV không khớp ai | Error + danh sách pending để staff chọn lại |
| Update hoạt động đã CANCELLED | Error từ service validation |
| Xóa hoạt động có SV | ConflictException |
| Từ chối khi không có quyền | Error: "Không có quyền" |
| Duyệt 0 IDs + approve_all=false + no names | Error: "Cần cung cấp..." |

---

## 7. CHECKLIST HOÀN THÀNH

### Implementation

- [ ] **Task 1.1**: Thêm `rejectParticipation()` + `rejectParticipationsBatch()` vào `participation.service.ts`
- [ ] **Task 1.2**: Thêm `buildRejectRegistrationTool()` vào `staff-agent.service.ts`
- [ ] **Task 1.3**: Register tool trong `buildTools()`
- [ ] **Task 1.4**: Thêm `sendRejectionEmail()` vào mailer service (nếu chưa có)
- [ ] **Task 2.1**: Nâng cấp schema `approve_and_notify` (thêm student_names, student_codes, approve_all)
- [ ] **Task 2.2**: Cập nhật logic func để hỗ trợ filter by name/code
- [ ] **Task 2.3**: Áp dụng tương tự cho `reject_registration`
- [ ] **Task 3.1**: Rewrite `manage_activity` func — gọi `activitiesService.update()` thay raw SQL
- [ ] **Task 3.2**: Rewrite delete logic — gọi `activitiesService.remove()` thay raw SQL
- [ ] **Task 3.3**: Bỏ dependency `mcpClient` trong `buildManageActivityTool()`
- [ ] **Task 4**: Update `STAFF_AGENT_SYSTEM_PROMPT` mô tả tools mới + quy tắc duyệt/từ chối

### Testing

- [ ] Test scenario 1: Từ chối đăng ký (single + batch)
- [ ] Test scenario 2: Duyệt chọn lọc theo tên
- [ ] Test scenario 3: Update hoạt động → verify vector sync triggered
- [ ] Test scenario 4: Xóa hoạt động có SV → verify ConflictException
- [ ] Test edge cases (wrong status, no permission, name mismatch)

### Thứ tự thực hiện khuyến nghị

```
1. Task 1.1 (participation.service.ts — thêm reject methods)
2. Task 3.1-3.3 (fix manage_activity — quan trọng nhất, fix bug)
3. Task 1.2-1.4 (thêm reject tool + email)
4. Task 2.1-2.3 (nâng cấp approve selective)
5. Task 4 (update prompt)
6. Task 5 (test tất cả)
```

**Estimated effort**: ~6-8 giờ tổng cộng
