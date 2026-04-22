# Kế hoạch Triển khai Model Context Protocol (MCP) — Hệ thống Quản lý CTXH

> **Trạng thái**: Bản thiết kế — Không chỉnh sửa source code  
> **Ngày**: 2026-04-18  
> **Phiên bản SDK**: `@modelcontextprotocol/sdk` + `zod` (đã cài sẵn)

---

## 1. Phân tích Cấu trúc Dự án Hiện tại

### 1.1 Kiến trúc tổng quan

```
backend/src/
├── ctxh/                        # Business logic chính
│   └── activity/
│       ├── activities.controller.ts   # REST API
│       ├── services/
│       │   ├── activities.service.ts
│       │   └── participation.service.ts  ← registerSelf(), approveParticipation()
│       └── dto/                         # CreateActivityDto, etc.
├── ctxh-chat/                   # RAG Chatbot (LangChain)
│   ├── services/
│   │   ├── langchain-rag-chain.service.ts   ← Router agent, intent detection
│   │   ├── langchain-vector-store.service.ts
│   │   ├── ctxh-filter-extraction.service.ts ← Zod-based LLM filter extraction
│   │   └── user-context.service.ts
│   ├── dto/
│   │   ├── filter-extraction.dto.ts  ← MetadataFilterSchema (Zod)
│   │   └── router-output.dto.ts      ← IntentEnum, RouterOutputSchema (Zod)
│   └── tools/rag-tools.ts
├── roles/
│   └── roles.service.ts         ← getUserPermissions(), checkPermission()
└── entities/
    ├── ctxh-activity.entity.ts  ← ActivityStatus enum
    ├── ctxh-participation.entity.ts ← ParticipationStatus enum
    ├── user.entity.ts           ← UserType (STUDENT/STAFF)
    ├── role.entity.ts           ← Role → Permission (M2M)
    └── permission.entity.ts     ← code: "ctxh.activities.create"
```

### 1.2 Các Service có thể tái sử dụng cho MCP

| Service | Method quan trọng | MCP Tool sử dụng |
|---|---|---|
| `ParticipationService` | `registerSelf(activityId, userId)` | Student: register_activity |
| `ParticipationService` | `approveParticipation(activityId, participationId, approvedBy)` | Staff: auto_approve_notify |
| `ActivitiesService` | `create(dto, createdBy)` | Staff: create_activity |
| `ActivitiesService` | `findAll({ created_by, ... })` | Staff: query_managed_activities |
| `CtxhFilterExtractionService` | `extractFilters(question, currentDate)` | Student: extract_filters |
| `LangChainVectorStoreService` | `similaritySearchWithMetadataFilters()` | Student: search_activities |
| `RolesService` | `getUserPermissions(userId, orgId)` | Guard: check_ctxh_permission |

---

## 2. Vị trí Đặt MCP Server

### Quyết định kiến trúc

Tạo module riêng **`backend/src/ctxh-mcp/`** (không đặt trong `ctxh-chat/`) vì:
- MCP là **transport/protocol layer**, khác với RAG chatbot pipeline
- Tránh phình to module `ctxh-chat` vốn đã phức tạp
- Dễ bật/tắt độc lập mà không ảnh hưởng RAG pipeline
- Sử dụng chung các service từ cả `ctxh` lẫn `ctxh-chat` qua DI

### Cấu trúc thư mục đề xuất

```
backend/src/ctxh-mcp/
│
├── ctxh-mcp.module.ts              # NestJS module, import tất cả dependencies
│
├── controllers/
│   ├── student-mcp.controller.ts   # POST /api/mcp/student  (StreamableHTTP)
│   └── staff-mcp.controller.ts     # POST /api/mcp/staff    (StreamableHTTP)
│
├── servers/
│   ├── student.server.ts           # McpServer instance cho sinh viên
│   └── staff.server.ts             # McpServer instance cho cán bộ
│
├── tools/
│   ├── student/
│   │   ├── extract-filters.tool.ts       # Tool 1: extract_activity_filters
│   │   ├── search-activities.tool.ts     # Tool 2: search_activities
│   │   └── register-activity.tool.ts     # Tool 3: register_activity
│   └── staff/
│       ├── query-managed-activities.tool.ts  # Tool 1: query_managed_activities
│       ├── create-activity.tool.ts           # Tool 2: create_activity
│       └── auto-approve-notify.tool.ts       # Tool 3: auto_approve_and_notify
│
├── guards/
│   └── ctxh-permission.helper.ts   # Helper kiểm tra permission từ UserRole
│
├── notifications/
│   └── nodemailer.service.ts       # Nodemailer wrapper (install: nodemailer)
│
└── types/
    └── mcp-context.types.ts        # Interface McpRequestContext { userId, orgId }
```

---

## 3. Thiết kế MCP Tools Chi tiết

### 3.1 Student MCP Server (`/api/mcp/student`)

#### Tool 1: `extract_activity_filters`

**Mục đích**: Nhận diện intent và trích xuất tham số tìm kiếm từ ngôn ngữ tự nhiên.

**Input Schema** (Zod):
```typescript
z.object({
  query: z.string().describe("Câu hỏi tự nhiên của sinh viên (tiếng Việt)"),
  current_date: z.string().optional()
    .describe("Ngày hiện tại YYYY-MM-DD, dùng để giải nghĩa 'hôm nay', 'tuần này'"),
})
```

**Output Schema** — Tái sử dụng `MetadataFilterSchema` từ `filter-extraction.dto.ts`:
```typescript
// Re-export MetadataFilterSchema từ ctxh-chat/dto/filter-extraction.dto.ts
// Giữ nguyên các field: status, organizationKeywords, organizationLevel,
//                       locationRaw, dateRange (isToday/isThisWeek/isThisMonth/startDate/endDate)
```

**Logic**:
```
1. Gọi CtxhFilterExtractionService.extractFilters(query, current_date)
2. Gọi CtxhFilterExtractionService.resolveDateRange(filters, current_date)
   → Chuyển isToday/isThisWeek/isThisMonth thành startDate/endDate cụ thể
3. Trả về MetadataFilters đã resolved
```

---

#### Tool 2: `search_activities`

**Mục đích**: Tìm kiếm hoạt động theo filters đã trích xuất.

**Input Schema** (Zod):
```typescript
z.object({
  semantic_query: z.string()
    .describe("Câu tìm kiếm ngữ nghĩa để embedding lookup"),
  filters: MetadataFilterSchema.optional()
    .describe("Filters từ tool extract_activity_filters"),
  limit: z.number().min(1).max(20).default(5)
    .describe("Số lượng kết quả tối đa"),
})
```

**Output Schema** (Zod):
```typescript
z.object({
  activities: z.array(z.object({
    activityId: z.string(),
    activityName: z.string(),
    organizationName: z.string(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    location: z.string().nullable(),
    status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
    totalDays: z.number().nullable(),
    maxParticipants: z.number().nullable(),
    requiresApproval: z.boolean(),
    similarityScore: z.number(),
    snippet: z.string().describe("200 ký tự đầu của content_text"),
  })),
  total_found: z.number(),
})
```

**Logic**:
```
1. Nếu filters không rỗng (CtxhFilterExtractionService.isEmpty() = false):
   → LangChainVectorStoreService.similaritySearchWithMetadataFilters(
       semantic_query, filters, limit
     )
2. Ngược lại:
   → LangChainVectorStoreService.similaritySearchWithDateFilter(
       semantic_query, currentDate, limit
     )
3. Map kết quả Document[] sang output schema
4. Loại bỏ hoạt động có status = DRAFT
```

---

#### Tool 3: `register_activity`

**Mục đích**: Đăng ký sinh viên (người đang chat) vào một hoạt động.

**Input Schema** (Zod):
```typescript
z.object({
  activity_id: z.string().uuid()
    .describe("UUID của hoạt động cần đăng ký"),
})
```

**Output Schema** (Zod):
```typescript
z.object({
  success: z.boolean(),
  participation_id: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REGISTERED']).optional()
    .describe("PENDING nếu requires_approval=true, APPROVED ngay nếu không cần duyệt"),
  message: z.string()
    .describe("Thông báo kết quả (tiếng Việt)"),
})
```

**Logic**:
```
1. Lấy userId từ McpRequestContext (JWT đã verify ở controller)
2. Gọi ParticipationService.registerSelf(activity_id, userId)
3. Nếu thành công:
   → { success: true, participation_id, status, message: "Đăng ký thành công!" }
4. Nếu lỗi (đã đăng ký, hết chỗ, đã kết thúc...):
   → { success: false, message: err.message }
```

---

### 3.2 Staff MCP Server (`/api/mcp/staff`)

> **Lưu ý**: Tất cả staff tools đều phải xác thực permission trước khi thực thi.

#### Helper: `checkCtxhPermission`

Không phải MCP Tool mà là helper nội bộ dùng cho các tools bên dưới.

```typescript
// guards/ctxh-permission.helper.ts
async function checkCtxhPermission(
  userId: string,
  requiredPermission: string,  // e.g., "ctxh.activities.create"
  organizationId?: string,
): Promise<boolean> {
  // Query: UserRole → Role → Permission
  // JOIN user_roles ur ON ur.userId = userId
  // JOIN role_permissions rp ON rp.roleId = ur.roleId
  // JOIN permissions p ON p.id = rp.permissionId
  // WHERE p.code = requiredPermission
  //   AND (ur.organizationId = organizationId OR ur.organizationId IS NULL)
  //   AND ur.isActive = true
  //   AND p.isActive = true
}
```

**Danh sách permission codes CTXH** (từ yêu cầu dự án):
```
ctxh.access                        ← Truy cập module CTXH
ctxh.categories.view               ← Xem danh mục
ctxh.categories.create             ← Tạo danh mục
ctxh.categories.update             ← Sửa danh mục
ctxh.categories.delete             ← Xóa danh mục
ctxh.activities.view               ← Xem hoạt động
ctxh.activities.create             ← Tạo hoạt động
ctxh.activities.update             ← Cập nhật hoạt động
ctxh.activities.delete             ← Xóa hoạt động
ctxh.activities.manage_participants ← Duyệt/quản lý danh sách tham gia
ctxh.reports.export                ← Xuất báo cáo
ctxh.import.old_system             ← Import dữ liệu hệ thống cũ
ctxh.config.manage                 ← Cấu hình hệ thống CTXH
```

---

#### Tool 1: `query_managed_activities`

**Mục đích**: Cán bộ truy vấn danh sách hoạt động mà họ tạo/quản lý.

**Permission cần**: `ctxh.activities.view`

**Input Schema** (Zod):
```typescript
z.object({
  status: z.array(z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']))
    .optional()
    .describe("Lọc theo trạng thái, để trống = tất cả"),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
  organization_id: z.string().uuid().optional()
    .describe("Lọc theo tổ chức (nếu cán bộ quản lý nhiều đơn vị)"),
})
```

**Output Schema** (Zod):
```typescript
z.object({
  activities: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    total_days: z.number().nullable(),
    max_participants: z.number().nullable(),
    current_participants: z.number()
      .describe("Số lượng đang APPROVED/REGISTERED/COMPLETED"),
    organization_name: z.string(),
    requires_approval: z.boolean(),
    created_at: z.string(),
  })),
  total: z.number(),
  page: z.number(),
  total_pages: z.number(),
})
```

**Logic**:
```
1. checkCtxhPermission(userId, 'ctxh.activities.view', organizationId)
2. ActivitiesService.findAll({
     created_by: userId,         ← Lọc theo người tạo
     status: input.status,
     organization_id: input.organization_id,
     page, limit,
   })
3. Với mỗi activity, đếm participations có status IN (APPROVED, REGISTERED, COMPLETED)
4. Trả về kết quả phân trang
```

---

#### Tool 2: `create_activity`

**Mục đích**: Cán bộ tạo hoạt động CTXH mới.

**Permission cần**: `ctxh.activities.create`

**Input Schema** (Zod) — Tương đương `CreateActivityDto`:
```typescript
z.object({
  name: z.string().min(1).max(255)
    .describe("Tên hoạt động CTXH"),
  description: z.string().optional()
    .describe("Mô tả chi tiết hoạt động"),
  category_id: z.string().uuid()
    .describe("UUID của danh mục hoạt động"),
  organization_id: z.string().uuid()
    .describe("UUID của đơn vị tổ chức"),
  start_date: z.string()
    .describe("Ngày bắt đầu ISO 8601 (YYYY-MM-DDTHH:mm:ss)"),
  end_date: z.string()
    .describe("Ngày kết thúc ISO 8601"),
  total_days: z.number().positive()
    .describe("Số ngày CTXH được công nhận"),
  location: z.string().max(500).optional()
    .describe("Địa điểm tổ chức"),
  max_participants: z.number().int().positive().optional()
    .describe("Giới hạn số lượng người tham gia (null = không giới hạn)"),
  requires_approval: z.boolean().default(false)
    .describe("Đăng ký cần được duyệt thủ công không?"),
})
```

**Output Schema** (Zod):
```typescript
z.object({
  success: z.boolean(),
  activity: z.object({
    id: z.string().uuid(),
    name: z.string(),
    status: z.literal('DRAFT'),
    created_at: z.string(),
  }).optional(),
  message: z.string(),
})
```

**Logic**:
```
1. checkCtxhPermission(userId, 'ctxh.activities.create', input.organization_id)
   → Kiểm tra cán bộ có quyền với TỔ CHỨC được chỉ định
2. Validate input.start_date < input.end_date
3. ActivitiesService.create({
     ...input,
     status: ActivityStatus.DRAFT,  ← Mặc định tạo ở trạng thái DRAFT
     created_by: userId,
   })
4. Trả về activity vừa tạo
```

---

#### Tool 3: `auto_approve_and_notify`

**Mục đích**: Tự động duyệt danh sách BCC (Biên Bản Chấm) và gửi email xác nhận cho sinh viên.

**Permission cần**: `ctxh.activities.manage_participants`

**Input Schema** (Zod):
```typescript
z.object({
  activity_id: z.string().uuid()
    .describe("UUID của hoạt động cần duyệt"),
  participation_ids: z.array(z.string().uuid())
    .min(1).max(200)
    .describe("Danh sách participation ID cần duyệt"),
  send_email_notification: z.boolean().default(true)
    .describe("Có gửi email thông báo cho sinh viên được duyệt không?"),
  email_custom_message: z.string().optional()
    .describe("Nội dung bổ sung trong email (tùy chọn)"),
})
```

**Output Schema** (Zod):
```typescript
z.object({
  total_requested: z.number(),
  approved_count: z.number(),
  failed_count: z.number(),
  emails_sent: z.number(),
  failed_details: z.array(z.object({
    participation_id: z.string(),
    reason: z.string(),
  })).optional(),
  message: z.string(),
})
```

**Logic** (xem pseudocode chi tiết ở mục 5):
```
1. checkCtxhPermission(userId, 'ctxh.activities.manage_participants')
2. Lấy thông tin activity để validate ownership (created_by === userId)
3. Batch approve: Promise.allSettled(participation_ids.map(approve))
4. Collect approved participations với student.email
5. Nếu send_email_notification = true: gửi email qua NodemailerService
6. Trả về summary
```

---

## 4. Lộ trình Triển khai

### Giai đoạn 1 — Thiết lập SDK & Cấu trúc Cơ bản (Tuần 1)

**Mục tiêu**: MCP servers chạy được, kết nối được từ MCP client.

**Bước 1.1 — Cài đặt dependencies**
```bash
cd backend
npm install @modelcontextprotocol/sdk nodemailer
npm install --save-dev @types/nodemailer
```

**Bước 1.2 — Tạo module skeleton**

Tạo các file sau (nội dung rỗng/stub):
```
backend/src/ctxh-mcp/
├── ctxh-mcp.module.ts
├── controllers/student-mcp.controller.ts
├── controllers/staff-mcp.controller.ts
├── servers/student.server.ts
├── servers/staff.server.ts
├── types/mcp-context.types.ts
└── guards/ctxh-permission.helper.ts
```

**Bước 1.3 — Định nghĩa `mcp-context.types.ts`**
```typescript
export interface McpRequestContext {
  userId: string;       // UUID từ JWT payload
  userType: 'student' | 'staff';
  organizationId?: string;  // Optional: org context từ header/token
}
```

**Bước 1.4 — Thiết lập McpServer cơ bản**

`servers/student.server.ts`:
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function createStudentMcpServer(): McpServer {
  const server = new McpServer({
    name: 'ctxh-student-agent',
    version: '1.0.0',
  });
  // Tools sẽ được đăng ký ở Phase 2 và 3
  return server;
}
```

**Bước 1.5 — Thiết lập Controller với StreamableHTTP transport**

`controllers/student-mcp.controller.ts`:
```typescript
import { Controller, All, Req, Res } from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createStudentMcpServer } from '../servers/student.server';

@Controller('mcp/student')
export class StudentMcpController {
  @All()
  async handleMcp(@Req() req: Request, @Res() res: Response) {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = createStudentMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
}
```

**Bước 1.6 — Đăng ký vào `AppModule`**
```typescript
// app.module.ts — thêm vào imports array:
CtxhMcpModule,
```

**Bước 1.7 — Thêm env variables**
```env
# .env.example (thêm section mới)
# ─── Nodemailer ────────────────────────────────
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=no-reply@example.com
MAIL_PASSWORD=your-app-password
MAIL_FROM_NAME=Hệ thống CTXH BK
```

---

### Giai đoạn 2 — Phát triển Tools Read-Only (Tuần 2)

**Mục tiêu**: Sinh viên tìm được hoạt động qua MCP; cán bộ truy vấn được danh sách hoạt động.

**Bước 2.1 — Tích hợp DI vào McpServer**

Cần inject services vào server factory. Giải pháp: sử dụng NestJS `ModuleRef` hoặc truyền service qua factory function:

```typescript
// ctxh-mcp.module.ts
@Module({
  imports: [
    forwardRef(() => CtxhChatModule),   // UniversalLLMService, CtxhFilterExtractionService
    forwardRef(() => ActivitiesModule), // ActivitiesService, ParticipationService
    forwardRef(() => RolesModule),      // RolesService
    TypeOrmModule.forFeature([User, CtxhParticipation]),
  ],
  controllers: [StudentMcpController, StaffMcpController],
  providers: [NodemailerService],
})
export class CtxhMcpModule {}
```

**Bước 2.2 — Implement `extract-filters.tool.ts`**

Tool đơn giản nhất vì tái sử dụng hoàn toàn `CtxhFilterExtractionService`:

```typescript
// tools/student/extract-filters.tool.ts
export function registerExtractFiltersTool(
  server: McpServer,
  filterService: CtxhFilterExtractionService,
) {
  server.tool(
    'extract_activity_filters',
    'Trích xuất bộ lọc tìm kiếm hoạt động CTXH từ câu hỏi tiếng Việt',
    {
      query: z.string().describe('Câu hỏi của sinh viên'),
      current_date: z.string().optional(),
    },
    async ({ query, current_date }) => {
      const date = current_date ?? new Date().toISOString().split('T')[0];
      const rawFilters = await filterService.extractFilters(query, date);
      const resolvedFilters = filterService.resolveDateRange(rawFilters, date);
      return {
        content: [{ type: 'text', text: JSON.stringify(resolvedFilters, null, 2) }],
      };
    },
  );
}
```

**Bước 2.3 — Implement `search-activities.tool.ts`**

Kết nối với vector store, tương tự pipeline hiện tại trong `langchain-rag-chain.service.ts`.

**Bước 2.4 — Implement `query-managed-activities.tool.ts`**

Query DB qua `ActivitiesService.findAll({ created_by: userId, ... })`.

**Bước 2.5 — Implement `ctxh-permission.helper.ts`**

Query trực tiếp DB:
```typescript
async function checkCtxhPermission(
  dataSource: DataSource,
  userId: string,
  permissionCode: string,
  organizationId?: string,
): Promise<boolean> {
  const result = await dataSource.query(`
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp."roleId" = ur."roleId"
    JOIN permissions p ON p.id = rp."permissionId"
    WHERE ur."userId" = $1
      AND p.code = $2
      AND ur."isActive" = true
      AND p."isActive" = true
      AND (
        ur."organizationId" IS NULL
        OR ur."organizationId" = $3
      )
    LIMIT 1
  `, [userId, permissionCode, organizationId ?? null]);
  return result.length > 0;
}
```

---

### Giai đoạn 3 — Tools Write + Tích hợp Nodemailer (Tuần 3)

**Mục tiêu**: Sinh viên đăng ký hoạt động; cán bộ tạo hoạt động và duyệt danh sách.

**Bước 3.1 — Implement `register-activity.tool.ts`**

Gọi `ParticipationService.registerSelf()`, bắt lỗi và trả về message tiếng Việt.

**Bước 3.2 — Implement `create-activity.tool.ts`**

Validate permission, map Zod input → `CreateActivityDto`, gọi `ActivitiesService.create()`.

**Bước 3.3 — Implement `NodemailerService`**

Xem pseudocode chi tiết ở mục 5.

**Bước 3.4 — Implement `auto-approve-notify.tool.ts`**

Tool phức tạp nhất, kết hợp batch approve + email.

---

### Giai đoạn 4 — Kiểm thử & Xử lý Lỗi (Tuần 4)

**Bước 4.1 — Unit tests cho mỗi tool** (Jest)
- Mock service dependencies
- Test happy path + edge cases
- Test permission denied scenarios

**Bước 4.2 — Integration tests với MCP Inspector**
```bash
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp/student
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp/staff
```

**Bước 4.3 — Agentic workflow E2E test**

Kịch bản sinh viên:
```
User: "Tôi muốn tham gia hoạt động hiến máu tuần này"
→ Agent gọi: extract_activity_filters({ query, current_date })
→ Agent gọi: search_activities({ semantic_query: "hiến máu", filters: {...} })
→ Agent trả kết quả, hỏi confirm
→ User: "Đăng ký cho tôi vào hoạt động đầu tiên"
→ Agent gọi: register_activity({ activity_id: "..." })
→ Agent trả: "Đăng ký thành công!"
```

Kịch bản cán bộ:
```
User: "Duyệt tất cả sinh viên đang chờ trong hoạt động X và gửi email thông báo"
→ Agent gọi: query_managed_activities({ status: ['ACTIVE'] })
→ Agent xác định activity_id và lấy participation_ids có status PENDING
→ Agent gọi: auto_approve_and_notify({ activity_id, participation_ids, send_email: true })
→ Agent trả: "Đã duyệt 23 sinh viên, gửi 23 email thành công"
```

**Bước 4.4 — Error handling matrix**

| Lỗi | Xử lý |
|---|---|
| Token expired/invalid | Controller middleware reject trước khi vào MCP |
| Permission denied | Tool trả `{ isError: true, content: [{ type: 'text', text: 'Bạn không có quyền...' }] }` |
| Activity đã hết chỗ | Trả message cụ thể: "Hoạt động đã đủ X/X người tham gia" |
| Email gửi thất bại | Log error, không rollback approval, trả `emails_sent: 0` trong response |
| LLM timeout (filter extraction) | Graceful fallback: trả empty filters, search semantic |
| DB connection error | Throw lên NestJS exception handler, MCP transport trả 500 |

---

## 5. Pseudocode NodemailerService + Tool `auto_approve_and_notify`

### 5.1 `NodemailerService` (`notifications/nodemailer.service.ts`)

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface ApprovalEmailData {
  to: string;            // student email
  studentName: string;
  activityName: string;
  activityStartDate: Date;
  activityLocation: string | null;
  totalDays: number;
  customMessage?: string;
}

@Injectable()
export class NodemailerService implements OnModuleInit {
  private readonly logger = new Logger(NodemailerService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<boolean>('MAIL_SECURE'),
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
    this.logger.log('✅ Nodemailer transporter initialized');
  }

  /**
   * Gửi email xác nhận duyệt tham gia hoạt động CTXH.
   */
  async sendApprovalEmail(data: ApprovalEmailData): Promise<boolean> {
    const {
      to, studentName, activityName,
      activityStartDate, activityLocation, totalDays, customMessage,
    } = data;

    // Format ngày giờ theo múi giờ Việt Nam
    const formattedDate = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(activityStartDate));

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #1a73e8;">✅ Xác nhận Đăng ký Hoạt động CTXH</h2>
        <p>Chào <strong>${studentName}</strong>,</p>
        <p>
          Đăng ký của bạn vào hoạt động <strong>"${activityName}"</strong>
          đã được <strong>CHẤP THUẬN</strong>.
        </p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Hoạt động</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${activityName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Thời gian bắt đầu</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Địa điểm</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${activityLocation ?? 'Chưa cập nhật'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Số ngày CTXH</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${totalDays} ngày</td>
          </tr>
        </table>
        ${customMessage ? `<p style="margin-top: 16px;"><em>${customMessage}</em></p>` : ''}
        <hr style="margin: 24px 0;" />
        <p style="font-size: 12px; color: #666;">
          Email này được gửi tự động từ Hệ thống Quản lý CTXH.
          Vui lòng không reply trực tiếp vào email này.
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get('MAIL_FROM_NAME')}" <${this.configService.get('MAIL_USER')}>`,
        to,
        subject: `[CTXH] Đăng ký hoạt động "${activityName}" đã được duyệt`,
        html: htmlBody,
      });
      this.logger.log(`Email sent to ${to} for activity "${activityName}"`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;  // Không throw — lỗi email không nên block business logic
    }
  }
}
```

### 5.2 Pseudocode Tool `auto_approve_and_notify`

```typescript
// tools/staff/auto-approve-notify.tool.ts
export function registerAutoApproveNotifyTool(
  server: McpServer,
  services: {
    participationService: ParticipationService;
    participationRepo: Repository<CtxhParticipation>;
    activityRepo: Repository<CtxhActivity>;
    mailerService: NodemailerService;
    dataSource: DataSource;
  },
) {
  server.tool(
    'auto_approve_and_notify',
    'Tự động duyệt danh sách sinh viên đăng ký và gửi email xác nhận',
    {
      activity_id: z.string().uuid(),
      participation_ids: z.array(z.string().uuid()).min(1).max(200),
      send_email_notification: z.boolean().default(true),
      email_custom_message: z.string().optional(),
    },
    async (input, extra) => {
      // extra.meta.userId được inject từ controller (JWT context)
      const userId = (extra.meta as any).userId as string;

      // ── STEP 1: Kiểm tra permission ─────────────────────────────────
      const hasPermission = await checkCtxhPermission(
        services.dataSource,
        userId,
        'ctxh.activities.manage_participants',
      );
      if (!hasPermission) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Bạn không có quyền quản lý danh sách tham gia.' }],
        };
      }

      // ── STEP 2: Validate activity tồn tại và thuộc quyền cán bộ này ─
      const activity = await services.activityRepo.findOne({
        where: { id: input.activity_id, created_by: userId },
      });
      if (!activity) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Hoạt động không tồn tại hoặc bạn không có quyền quản lý.' }],
        };
      }

      // ── STEP 3: Batch approve tất cả participation IDs ──────────────
      const approvalResults = await Promise.allSettled(
        input.participation_ids.map(pid =>
          services.participationService.approveParticipation(
            input.activity_id, pid, userId,
          ),
        ),
      );

      const successfulIds: string[] = [];
      const failedDetails: { participation_id: string; reason: string }[] = [];

      input.participation_ids.forEach((pid, idx) => {
        const result = approvalResults[idx];
        if (result.status === 'fulfilled') {
          successfulIds.push(pid);
        } else {
          failedDetails.push({
            participation_id: pid,
            reason: (result.reason as Error)?.message ?? 'Unknown error',
          });
        }
      });

      // ── STEP 4: Gửi email nếu được yêu cầu ─────────────────────────
      let emailsSent = 0;

      if (input.send_email_notification && successfulIds.length > 0) {
        // Lấy thông tin sinh viên + email cho các participation đã approved
        const participations = await services.participationRepo.find({
          where: { id: In(successfulIds) },
          relations: ['student'],  // Eager load User entity
        });

        // Gửi email song song (tối đa 10 cùng lúc để tránh rate limit SMTP)
        const BATCH_SIZE = 10;
        for (let i = 0; i < participations.length; i += BATCH_SIZE) {
          const batch = participations.slice(i, i + BATCH_SIZE);
          const emailResults = await Promise.allSettled(
            batch.map(p => {
              if (!p.student?.email) return Promise.resolve(false);
              return services.mailerService.sendApprovalEmail({
                to: p.student.email,
                studentName: `${p.student.familyName} ${p.student.givenName}`.trim(),
                activityName: activity.name,
                activityStartDate: activity.start_date,
                activityLocation: activity.location,
                totalDays: Number(activity.total_days),
                customMessage: input.email_custom_message,
              });
            }),
          );
          emailsSent += emailResults.filter(
            r => r.status === 'fulfilled' && r.value === true,
          ).length;
        }
      }

      // ── STEP 5: Trả về summary ───────────────────────────────────────
      const summaryLines = [
        `✅ Đã duyệt: ${successfulIds.length}/${input.participation_ids.length} sinh viên`,
        input.send_email_notification
          ? `📧 Email đã gửi: ${emailsSent}/${successfulIds.length}`
          : '📧 Không gửi email (send_email_notification = false)',
        failedDetails.length > 0
          ? `⚠️ Thất bại: ${failedDetails.length} (xem failed_details)`
          : '',
      ].filter(Boolean).join('\n');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            total_requested: input.participation_ids.length,
            approved_count: successfulIds.length,
            failed_count: failedDetails.length,
            emails_sent: emailsSent,
            failed_details: failedDetails,
            message: summaryLines,
          }, null, 2),
        }],
      };
    },
  );
}
```

---

## 6. Tóm tắt Kiến trúc & Checklist

### 6.1 Files cần tạo mới

| File | Giai đoạn |
|---|---|
| `backend/src/ctxh-mcp/ctxh-mcp.module.ts` | Phase 1 |
| `backend/src/ctxh-mcp/types/mcp-context.types.ts` | Phase 1 |
| `backend/src/ctxh-mcp/guards/ctxh-permission.helper.ts` | Phase 1 & 2 |
| `backend/src/ctxh-mcp/servers/student.server.ts` | Phase 1 |
| `backend/src/ctxh-mcp/servers/staff.server.ts` | Phase 1 |
| `backend/src/ctxh-mcp/controllers/student-mcp.controller.ts` | Phase 1 |
| `backend/src/ctxh-mcp/controllers/staff-mcp.controller.ts` | Phase 1 |
| `backend/src/ctxh-mcp/notifications/nodemailer.service.ts` | Phase 3 |
| `backend/src/ctxh-mcp/tools/student/extract-filters.tool.ts` | Phase 2 |
| `backend/src/ctxh-mcp/tools/student/search-activities.tool.ts` | Phase 2 |
| `backend/src/ctxh-mcp/tools/student/register-activity.tool.ts` | Phase 3 |
| `backend/src/ctxh-mcp/tools/staff/query-managed-activities.tool.ts` | Phase 2 |
| `backend/src/ctxh-mcp/tools/staff/create-activity.tool.ts` | Phase 3 |
| `backend/src/ctxh-mcp/tools/staff/auto-approve-notify.tool.ts` | Phase 3 |

### 6.2 Files cần sửa đổi nhỏ

| File | Thay đổi |
|---|---|
| `backend/src/app.module.ts` | Thêm `CtxhMcpModule` vào imports |
| `backend/.env.example` | Thêm `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM_NAME` |

### 6.3 Dependencies cần cài thêm

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "nodemailer": "lastest" // 8.0.5
  },
  "devDependencies": {
    "@types/nodemailer": "lastest" // 8.0.5
  }
}
```

### 6.4 Luồng dữ liệu tổng thể

```
MCP Client (AI Agent)
    │
    ▼
POST /api/mcp/student   POST /api/mcp/staff
    │                       │
    ▼                       ▼
StudentMcpController    StaffMcpController
(JWT verify → userId)   (JWT verify + userType=STAFF)
    │                       │
    ▼                       ▼
StreamableHTTPServerTransport
    │
    ▼
McpServer (student / staff)
    │
    ├── extract_activity_filters ──→ CtxhFilterExtractionService
    ├── search_activities ─────────→ LangChainVectorStoreService
    ├── register_activity ─────────→ ParticipationService
    │
    ├── query_managed_activities ──→ ActivitiesService (filtered by created_by)
    ├── create_activity ───────────→ ActivitiesService + checkPermission
    └── auto_approve_and_notify ───→ ParticipationService + NodemailerService
```

---

*Tài liệu này là bản thiết kế — không có thay đổi source code nào được thực hiện.*
