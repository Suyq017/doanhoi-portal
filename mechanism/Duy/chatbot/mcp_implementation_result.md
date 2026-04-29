# MCP Implementation — Kết quả hiện thực

## Tổng quan

Module `ctxh-mcp` hiện thực Model Context Protocol (MCP) trên nền NestJS, cho phép LLM agent gọi các công cụ có cấu trúc để tương tác với hệ thống CTXH. Có hai server độc lập: một cho sinh viên, một cho cán bộ. Mỗi request HTTP tạo một `McpServer` mới (stateless) để `userId` được bind an toàn qua closure.

---

## Cấu trúc module

```
backend/src/ctxh-mcp/
├── ctxh-mcp.module.ts                  # NestJS module
├── controllers/
│   ├── student-mcp.controller.ts       # POST/GET /api/mcp/student
│   └── staff-mcp.controller.ts         # POST/GET /api/mcp/staff
├── servers/
│   ├── student.server.ts               # buildStudentServer()
│   └── staff.server.ts                 # buildStaffServer()
├── tools/
│   ├── student/
│   │   ├── extract-filters.tool.ts     # extract_activity_filters
│   │   ├── search-activities.tool.ts   # search_activities
│   │   └── register-activity.tool.ts   # register_activity
│   └── staff/
│       ├── query-managed-activities.tool.ts  # query_managed_activities
│       ├── create-activity.tool.ts           # create_activity
│       └── auto-approve-notify.tool.ts       # auto_approve_and_notify
├── guards/
│   └── ctxh-permission.helper.ts       # checkCtxhPermission()
├── notifications/
│   └── nodemailer.service.ts           # sendApprovalEmail()
└── types/
    └── mcp-context.types.ts            # McpRequestContext
```

---

## HTTP Endpoints

| Endpoint | Method | Mô tả |
|---|---|---|
| `POST /api/mcp/student` | ALL | MCP over StreamableHTTP cho sinh viên |
| `POST /api/mcp/staff` | ALL | MCP over StreamableHTTP cho cán bộ |

Cả hai endpoint đều yêu cầu JWT Bearer token (`JwtAuthGuard`). Endpoint staff thêm hai guard cấp controller:
1. `userType === 'staff'` — từ chối nếu là tài khoản sinh viên
2. `checkCtxhPermission(..., 'ctxh.access')` — cần quyền truy cập CTXH cơ bản

Transport sử dụng `StreamableHTTPServerTransport` với `sessionIdGenerator: undefined` (stateless — không lưu session giữa các request).

---

## Kiến trúc server-per-request

```
HTTP request → Controller
  → extract userId từ JWT
  → buildStudentServer(userId, deps) / buildStaffServer(userId, deps)
      → new McpServer(...)
      → register tools (userId bind qua closure)
  → new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  → server.connect(transport)
  → transport.handleRequest(req, res, body)
```

Mỗi request tạo mới hoàn toàn `McpServer` và `transport`. Không có shared state giữa các request.

---

## Hệ thống phân quyền

`checkCtxhPermission(dataSource, userId, permissionCode, organizationId?)` — raw SQL:

```sql
SELECT 1 FROM user_roles ur
JOIN role_permissions rp ON rp."roleId" = ur."roleId"
JOIN permissions p ON p.id = rp."permissionId"
WHERE ur."userId" = $1
  AND p.code = $2
  AND ur."isActive" = true
  AND p."isActive" = true
  AND (ur."organizationId" IS NULL OR ur."organizationId" = $3)
LIMIT 1
```

`organizationId = null` → kiểm tra quyền toàn cục hoặc quyền trong bất kỳ tổ chức nào.

---

## Tools — Student Server

### 1. `extract_activity_filters`

**Mục đích:** Trích xuất bộ lọc tìm kiếm từ câu hỏi tiếng Việt.

**Input:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `query` | `string` | Câu hỏi của sinh viên |
| `current_date` | `string?` | Ngày hiện tại YYYY-MM-DD (mặc định: hôm nay) |

**Output:** JSON của `MetadataFilters`:
```json
{
  "status": ["ongoing"],
  "organizationKeywords": ["đoàn"],
  "locationRaw": ["hội trường A1"],
  "dateRange": {
    "startDate": "2026-04-18",
    "endDate": "2026-04-18"
  }
}
```

**Phụ thuộc:** `CtxhFilterExtractionService.extractFilters()` + `resolveDateRange()`

---

### 2. `search_activities`

**Mục đích:** Tìm kiếm hoạt động CTXH bằng vector similarity search, có hoặc không có metadata filter.

**Input:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `semantic_query` | `string` | Câu tìm kiếm ngữ nghĩa |
| `filters` | `object?` | Filters từ `extract_activity_filters` |
| `limit` | `number` | Số kết quả tối đa (1–20, default 5) |
| `current_date` | `string?` | Ngày hiện tại YYYY-MM-DD |

**Logic phân nhánh:**
- Nếu `filters` rỗng → `similaritySearchWithDateFilter(query, limit, date, 'all')`
- Nếu có filter → `similaritySearchWithMetadataFilters(query, filters, limit, date)`

**Output:**
```json
{
  "activities": [
    {
      "activityId": "uuid",
      "activityName": "Mùa Hè Xanh 2024",
      "organizationName": "Đoàn trường",
      "startDate": "2024-06-01",
      "endDate": "2024-06-07",
      "location": "Hội trường A1",
      "status": "upcoming",
      "totalDays": 5,
      "maxParticipants": 200,
      "requiresApproval": true,
      "similarityScore": 0.92,
      "snippet": "..."
    }
  ],
  "total_found": 3
}
```

**Phụ thuộc:** `LangChainVectorStoreService`, `CtxhFilterExtractionService.isEmpty()`

---

### 3. `register_activity`

**Mục đích:** Đăng ký sinh viên đang chat vào một hoạt động CTXH.

**Input:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `activity_id` | `string (UUID)` | UUID của hoạt động |

**Output (thành công):**
```json
{
  "success": true,
  "participation_id": "uuid",
  "status": "PENDING",
  "message": "Đăng ký thành công! Đang chờ cán bộ xét duyệt."
}
```

Status = `PENDING` nếu hoạt động bật `requires_approval`, ngược lại = `APPROVED`.

**Output (lỗi):** `isError: true`, message từ service (vd: hoạt động đã kết thúc, đã đăng ký rồi, hết chỗ...).

**Phụ thuộc:** `ParticipationService.registerSelf(activityId, userId)`

---

## Tools — Staff Server

### 4. `query_managed_activities`

**Mục đích:** Truy vấn danh sách hoạt động do cán bộ này tạo, có phân trang và lọc.

**Quyền yêu cầu:** `ctxh.activities.view`

**Input:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `status` | `enum[]?` | DRAFT, ACTIVE, COMPLETED, CANCELLED |
| `page` | `number` | Trang (default 1) |
| `limit` | `number` | Số dòng mỗi trang (1–50, default 10) |
| `organization_id` | `string?` | Lọc theo đơn vị |

**Output:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "name": "Mùa Hè Xanh",
      "status": "ACTIVE",
      "start_date": "2024-06-01T00:00:00.000Z",
      "end_date": "2024-06-07T00:00:00.000Z",
      "total_days": 5,
      "max_participants": 200,
      "current_participants": 43,
      "organization_name": "Đoàn trường",
      "requires_approval": true,
      "created_at": "2024-05-01T00:00:00.000Z"
    }
  ],
  "total": 12,
  "page": 1,
  "total_pages": 2
}
```

**Ghi chú:** Dùng raw SQL (`DataSource.query`) thay vì `ActivitiesService.findAll()` vì service không hỗ trợ filter `created_by`.

---

### 5. `create_activity`

**Mục đích:** Tạo hoạt động CTXH mới.

**Quyền yêu cầu:** `ctxh.activities.create` (scoped theo `organization_id`)

**Input:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `name` | `string` | Tên hoạt động (1–255 ký tự) |
| `description` | `string?` | Mô tả chi tiết |
| `category_id` | `string (UUID)` | Danh mục hoạt động |
| `organization_id` | `string (UUID)` | Đơn vị tổ chức |
| `start_date` | `string` | Ngày bắt đầu ISO 8601 |
| `end_date` | `string` | Ngày kết thúc ISO 8601 |
| `total_days` | `number` | Số ngày CTXH được công nhận |
| `location` | `string?` | Địa điểm (tối đa 500 ký tự) |
| `max_participants` | `number?` | Giới hạn số người (nguyên dương) |
| `requires_approval` | `boolean` | Cần xét duyệt đăng ký (default false) |

**Output (thành công):**
```json
{
  "success": true,
  "activity_id": "uuid",
  "name": "Mùa Hè Xanh 2024",
  "status": "DRAFT",
  "message": "Tạo hoạt động \"Mùa Hè Xanh 2024\" thành công!"
}
```

**Phụ thuộc:** `ActivitiesService.create(dto, createdBy)` — service xử lý kiểm tra trùng tên, category tồn tại, cấu hình giới hạn.

---

### 6. `auto_approve_and_notify`

**Mục đích:** Duyệt hàng loạt đăng ký PENDING và gửi email thông báo cho sinh viên.

**Quyền yêu cầu:** `ctxh.activities.manage_participants` (scoped theo org của hoạt động)

**Input:**
| Tham số | Kiểu | Mô tả |
|---|---|---|
| `activity_id` | `string (UUID)` | Hoạt động cần duyệt |
| `participation_ids` | `string[] (UUID)` | Danh sách participation ID (1–200) |
| `send_email_notification` | `boolean` | Gửi email (default true) |
| `email_custom_message` | `string?` | Nội dung bổ sung trong email |

**Luồng xử lý:**
```
1. Fetch activity từ DB (name, start_date, location, total_days, org, requires_approval)
2. Kiểm tra requires_approval === true (không có PENDING nếu false → early error)
3. checkCtxhPermission(ctxh.activities.manage_participants)
4. ParticipationService.approveParticipationsBatch(activity_id, ids[], userId)
   → Mỗi id gọi approveParticipation(), lỗi được ghi vào failed[]
5. Nếu send_email_notification:
   → SQL: ctxh_participation JOIN users → email + tên sinh viên cho approved ids
   → Gửi NodemailerService.sendApprovalEmail() cho từng người (không throw)
6. Trả về summary
```

**Output:**
```json
{
  "success": true,
  "activity_id": "uuid",
  "activity_name": "Mùa Hè Xanh 2024",
  "approved": 18,
  "failed": 2,
  "total_processed": 20,
  "emails_sent": 18,
  "emails_failed": 0,
  "failed_details": [
    { "participation_id": "uuid-1", "error": "Đăng ký không ở trạng thái PENDING" },
    { "participation_id": "uuid-2", "error": "Không tìm thấy đăng ký" }
  ]
}
```

---

## Email — NodemailerService

`sendApprovalEmail(data: ApprovalEmailData): Promise<boolean>` — không bao giờ throw (lỗi SMTP chỉ log và trả về `false`).

```typescript
interface ApprovalEmailData {
  to: string;
  studentName: string;
  activityName: string;
  activityStartDate: Date | null;
  activityLocation: string | null;
  totalDays: number;
  customMessage?: string;
}
```

Cấu hình qua biến môi trường:
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your@email.com
MAIL_PASSWORD=your-app-password
MAIL_FROM_NAME=Hệ thống CTXH
```

---

## Dependencies

| Package | Phiên bản | Mục đích |
|---|---|---|
| `@modelcontextprotocol/sdk` | `^1.29.0` | MCP server, transport |
| `zod` | `^3.25.76` | Schema validation (yêu cầu ≥3.25 cho Standard Schema) |
| `nodemailer` | `^6.x` | Gửi email SMTP |
| `@types/nodemailer` | dev | TypeScript types |

---

## Luồng gọi điển hình từ LLM

### Sinh viên tìm kiếm và đăng ký hoạt động

```
1. LLM → extract_activity_filters(query="hoạt động mùa hè tuần này")
   ← { status: ["upcoming"], dateRange: { startDate: "...", endDate: "..." } }

2. LLM → search_activities(semantic_query="mùa hè tình nguyện", filters={...}, limit=5)
   ← { activities: [...], total_found: 3 }

3. LLM → register_activity(activity_id="uuid-của-hoạt-động-được-chọn")
   ← { success: true, participation_id: "uuid", status: "PENDING", message: "..." }
```

### Cán bộ tạo hoạt động và duyệt đăng ký

```
1. LLM → create_activity(name="...", category_id="...", organization_id="...", ...)
   ← { success: true, activity_id: "uuid", status: "DRAFT" }

2. LLM → query_managed_activities(status=["ACTIVE"], page=1, limit=10)
   ← { activities: [...], total: 5 }

3. LLM → auto_approve_and_notify(
     activity_id="uuid",
     participation_ids=["id1","id2","id3"],
     send_email_notification=true,
     email_custom_message="Vui lòng có mặt đúng giờ."
   )
   ← { approved: 3, emails_sent: 3, ... }
```
