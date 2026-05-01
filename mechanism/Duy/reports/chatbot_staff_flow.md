# Luồng hoạt động Chatbot dành cho Cán bộ (Staff)

## Tổng quan kiến trúc

```
HTTP POST /ctxh-chat/message
         │
         ▼
   CtxhChatController
         │  • Xác thực JWT
         │  • Kiểm tra userType === 'staff'
         │
    [userType !== 'staff'] ──► LangChainRagChainService (luồng sinh viên)
         │
    [userType === 'staff']
         │
         ▼
  StaffAgentService.invoke()
```

---

## Luồng chi tiết `invoke()`

Khác với luồng sinh viên (RAG pipeline cố định), Staff Agent sử dụng **ReAct loop** — LLM tự quyết định gọi tool nào, bao nhiêu lần, theo thứ tự nào để hoàn thành yêu cầu.

```
┌──────────────────────────────────────────────────────────────────┐
│ Khởi tạo message array                                           │
│                                                                  │
│  messages = [                                                    │
│    SystemMessage(STAFF_AGENT_SYSTEM_PROMPT)                      │
│      • Ngày hiện tại                                             │
│      • Danh sách hoạt động đang chờ duyệt từ session cache       │
│    ...historyMessages  (từ LangChainMemoryService)               │
│    HumanMessage(message)                                         │
│  ]                                                               │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│ ReAct Loop (tối đa 10 vòng)                                      │
│                                                                  │
│  llmWithTools.invoke(messages)                                   │
│       │                                                          │
│       ├─► tool_calls == [] (LLM không gọi tool)                  │
│       │     → Lấy response.content làm finalText                 │
│       │     → BREAK                                              │
│       │                                                          │
│       └─► tool_calls != [] (LLM yêu cầu gọi tool)               │
│             → Thực thi từng tool trong tool_calls                │
│             → Append ToolMessage(result) vào messages            │
│             → Tiếp tục vòng lặp tiếp theo                        │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│ Lưu lịch sử hội thoại                                            │
│  memoryService.addMessages(sessionId, newMessages)               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Danh sách Tools

Staff Agent có **9 custom tools** + **MCP tools** (allowlist):

| # | Tool | Mục đích |
|---|------|----------|
| 1 | `search_activities` | Tìm hoạt động theo từ khóa, trạng thái, đang diễn ra hôm nay |
| 2 | `get_pending_participants` | Lấy danh sách sinh viên PENDING của một hoạt động |
| 3 | `approve_and_notify` | Duyệt hàng loạt PENDING + gửi email xác nhận |
| 4 | `create_activity` | Tạo 1 hoạt động CTXH mới |
| 5 | `batch_create_activities` | Tạo 2–3 hoạt động cùng lúc |
| 6 | `manage_activity` | Cập nhật thông tin / trạng thái / xoá mềm hoạt động |
| 7 | `get_pending_overview` | Tổng quan hoạt động có sinh viên chờ duyệt (lưu cache session) |
| 8 | `lookup_category` | Tra cứu tên danh mục chính xác trong DB |
| 9 | `lookup_organization` | Tra cứu tên tổ chức chính xác trong DB |
| MCP | `mcp_execute_sql` | Truy vấn SQL trực tiếp qua MCP Postgres |
| MCP | `mcp_list_schemas` | Liệt kê schemas trong DB |
| MCP | `mcp_list_objects` | Liệt kê tables/views |
| MCP | `mcp_get_object_details` | Lấy schema chi tiết của một table |

---

## Quy trình theo use case

### Use case 1 — Xem hoạt động đang chờ duyệt

```
Cán bộ: "Hoạt động nào đang có sinh viên chờ duyệt?"
    │
    ▼
LLM gọi: get_pending_overview()
    │  • MCP SQL: JOIN ctxh_activity + ctxh_participation (status='PENDING')
    │  • Lọc: requires_approval=true, status IN ('ACTIVE','DRAFT')
    │  • Ưu tiên: hoạt động do cán bộ hiện tại tạo (created_by = userId)
    │  • Giới hạn: tối đa 10 hoạt động
    │  • Lưu kết quả vào sessionActivityCache (Map<sessionId, ActivitySummary[]>)
    │
    ▼
LLM trình bày danh sách:
    "Tìm thấy N hoạt động có sinh viên chờ duyệt:
     1. Tên HĐ — Đơn vị: X | Đang chờ: Y sinh viên
     ..."
```

**Session Cache:** Kết quả `get_pending_overview` được cache theo sessionId. Các lượt hội thoại sau trong cùng session, khi cán bộ nhắc đến tên hoặc số thứ tự hoạt động, LLM dùng ID từ cache — **không gọi lại DB**.

---

### Use case 2 — Duyệt đăng ký (2 bước bắt buộc)

```
Cán bộ: "Duyệt hoạt động hiến máu đi"
    │
    ▼
── Bước 1: Tìm hoạt động + hiển thị danh sách chờ ──

    [Có trong session cache?]
         │ Có → dùng activity_id từ cache
         │      LLM gọi: get_pending_participants(activity_id)
         │
         │ Không → LLM gọi: search_activities(keyword="hiến máu")
         │          → lấy activity_id từ kết quả
         │          → LLM gọi: get_pending_participants(activity_id)
         │
    get_pending_participants trả về:
        { participation_id, student_name, student_code, email, registered_at }[]
    │
    ▼
LLM hỏi xác nhận:
    "Hoạt động X có N sinh viên chờ duyệt: [danh sách]
     Bạn có muốn duyệt N sinh viên này không?"

── Bước 2: Duyệt sau khi xác nhận ──

Cán bộ: "Có" / "Duyệt đi" / "Ok"
    │
    ▼
LLM gọi: approve_and_notify(
    activity_id,
    participation_ids: [...],    ← toàn bộ IDs từ bước 1
    send_email_notification: true,
    email_custom_message?: "..."
)
    │
    ├─► checkCtxhPermission(userId, 'ctxh.activities.manage_participants', organization_id)
    ├─► participationService.approve(participation_id) × N
    └─► mailerService.sendEmail() × N (nếu send_email_notification=true)
    │
    ▼
LLM báo kết quả:
    "Đã duyệt X/N sinh viên thành công. Đã gửi X email xác nhận."
```

---

### Use case 3 — Tạo hoạt động (3 bước bắt buộc)

```
Cán bộ: "Tạo hoạt động dọn dẹp văn phòng khoa KTMT ngày 30/4"
    │
    ▼
── Bước 1: Kiểm tra & xác minh thông tin ──

    [Thiếu thông tin bắt buộc?]
        → Hỏi bổ sung (tên, danh mục, tổ chức, ngày, số ngày CTXH)

    LLM gọi song song (hoặc tuần tự):
        lookup_category(name="dọn dẹp")
            → { id, name }[]
        lookup_organization(name="KTMT")
            → { id, name, type, code }[]

    Kết quả lookup:
        • 1 kết quả  → dùng tên đó
        • 0 kết quả  → báo không tìm thấy, hỏi tên khác
        • N kết quả  → liệt kê, hỏi cán bộ chọn (không tự đoán)

── Bước 2: Trình bày xác nhận ──

LLM trình bày tóm tắt:
    ---
    Xác nhận tạo hoạt động:
    • Tên: Dọn dẹp văn phòng Khoa KTMT
    • Danh mục: Dọn dẹp vệ sinh
    • Tổ chức: Liên chi đoàn Khoa Khoa học và Kỹ thuật Máy tính
    • Thời gian: 30/04/2026 08:00 → 30/04/2026 17:00
    • Số ngày CTXH: 1
    Bạn có muốn tạo hoạt động này không?
    ---

── Bước 3: Tạo sau khi xác nhận ──

Cán bộ: "Có" / "Tạo đi" / "Ok"
    │
    ▼
    [1 hoạt động] → LLM gọi: create_activity(...)
    [2-3 hoạt động] → LLM gọi: batch_create_activities({ activities: [...] })
    │
    create_activity / batch_create_activities:
        ├─► SQL: tìm category_id theo category_name (ILIKE)
        ├─► SQL: tìm organization_id theo organization_name (ILIKE)
        ├─► checkCtxhPermission(userId, 'ctxh.activities.create', organization_id)
        └─► activitiesService.create({ ...fields, category_id, organization_id }, userId)
    │
    ▼
LLM báo kết quả:
    [Thành công] "Tạo hoạt động 'X' thành công! ID: <uuid>"
    [Lỗi quyền] "Bạn không có quyền tạo hoạt động cho đơn vị này."
    [Batch] "Tạo 2/3 hoạt động thành công. 1 thất bại: <lý do>"
```

---

### Use case 4 — Cập nhật / Xoá hoạt động

```
Cán bộ: "Đổi trạng thái hoạt động X thành COMPLETED"
         hoặc "Xoá hoạt động Y"
    │
    ▼
LLM gọi: search_activities(keyword="X") nếu chưa có ID
    │
    ▼
LLM hỏi xác nhận (đặc biệt với action=delete):
    "Bạn có chắc muốn xoá hoạt động 'Y' không?"

Cán bộ xác nhận
    │
    ▼
LLM gọi: manage_activity(action, activity_id, ...fields)
    │
    manage_activity:
        ├─► MCP SQL: SELECT activity để lấy organization_id
        ├─► checkCtxhPermission(userId,
        │     action='update' → 'ctxh.activities.update'
        │     action='delete' → 'ctxh.activities.delete',
        │     organization_id)
        │
        ├─► [action='update'] MCP SQL: UPDATE ctxh_activity SET ...
        └─► [action='delete'] MCP SQL: UPDATE ctxh_activity SET deleted_at=NOW()
    │
    ▼
LLM báo kết quả: "Đã cập nhật / xoá hoạt động 'X' thành công."
```

---

## Cơ chế bảo vệ (Guardrails)

### 1. Giới hạn vòng lặp
ReAct loop tối đa **10 vòng**. Nếu LLM liên tục gọi tool mà không kết thúc, agent dừng và trả về thông báo lỗi mặc định.

### 2. Xác nhận bắt buộc trước hành động ghi
Prompt hệ thống (`STAFF_AGENT_SYSTEM_PROMPT`) quy định:
- **KHÔNG** gọi `approve_and_notify`, `create_activity`, `batch_create_activities`, `manage_activity(delete)` trước khi cán bộ xác nhận rõ ràng.
- Chỉ chấp nhận xác nhận dạng: "đồng ý", "tạo đi", "ok", "có", "yes", v.v.

### 3. Kiểm tra quyền (Permission check)
Mỗi tool ghi đều gọi `checkCtxhPermission(dataSource, userId, permission, organization_id)`:

| Tool | Permission required |
|------|---------------------|
| `create_activity` | `ctxh.activities.create` |
| `batch_create_activities` | `ctxh.activities.create` (mỗi tổ chức) |
| `approve_and_notify` | `ctxh.activities.manage_participants` |
| `manage_activity` (update) | `ctxh.activities.update` |
| `manage_activity` (delete) | `ctxh.activities.delete` |

### 4. Giới hạn MCP SQL (DDL Injection prevention)
`PostgresMcpClientService` có guard chặn các keyword nguy hiểm:
```
DROP | TRUNCATE | ALTER | GRANT | REVOKE | CREATE ROLE | pg_read_file
```

### 5. Giới hạn số hoạt động tạo
- `batch_create_activities`: tối đa **3 hoạt động** / lần
- Nếu cán bộ yêu cầu > 3, prompt hướng dẫn LLM từ chối ngay lập tức

---

## Session Cache

```
Map<sessionId, ActivitySummary[]>
    │
    ├─► Populate: khi gọi get_pending_overview() thành công
    ├─► Inject: vào SystemMessage mỗi lượt invoke (STAFF_AGENT_SYSTEM_PROMPT)
    └─► Expire: khi session kết thúc (in-memory, không persist)
```

Mục đích: LLM không cần gọi lại DB khi cán bộ nhắc đến "hoạt động số 1" hay "hoạt động hiến máu" đã được liệt kê trước đó trong cùng phiên.

---

## Sơ đồ tổng hợp

```
Tin nhắn cán bộ
        │
        ▼
  [Load history + Build system prompt với session cache]
        │
        ▼
  ReAct Loop (max 10 vòng)
        │
        ├── LLM không gọi tool ──────────────────────► Trả lời text
        │
        └── LLM gọi tool(s)
                │
                ├── search_activities         → activitiesService.findAll()
                │                              + participationService.findPendingByActivity()
                │
                ├── get_pending_overview      → MCP SQL (JOIN query)
                │                              → sessionActivityCache.set()
                │
                ├── get_pending_participants  → participationService.findPendingByActivity()
                │
                ├── approve_and_notify        → [Permission check]
                │                              → participationService.approve() × N
                │                              → mailerService.sendEmail() × N
                │
                ├── create_activity           → [Lookup category + org]
                │                              → [Permission check]
                │                              → activitiesService.create()
                │
                ├── batch_create_activities   → [Lookup + Permission] × N hoạt động
                │                              → activitiesService.create() × N
                │
                ├── manage_activity           → [MCP SQL SELECT để lấy org_id]
                │                              → [Permission check]
                │                              → MCP SQL UPDATE / soft DELETE
                │
                ├── lookup_category           → SQL ILIKE trên ctxh_category
                ├── lookup_organization       → SQL ILIKE trên organizations
                │
                └── mcp_execute_sql           → MCP Postgres (DDL guard)
                    mcp_list_schemas/objects
                    mcp_get_object_details
```

---

## So sánh với luồng sinh viên

| Tiêu chí | Sinh viên (RAG) | Cán bộ (Staff Agent) |
|---|---|---|
| Kiến trúc | Pipeline cố định (Router → Retrieve → Generate) | ReAct loop linh hoạt (LLM tự chọn tool) |
| Intent routing | Router Agent LLM (GREETING / CHITCHAT / RAG_QUERY / REGISTER_ACTIVITY) | Không có routing — LLM tự suy luận |
| Nguồn dữ liệu | pgvector (embeddings) + MCP SQL fallback | SQL trực tiếp qua service/MCP |
| Hành động ghi | Chỉ đăng ký hoạt động | Tạo / cập nhật / xoá hoạt động, duyệt đăng ký, gửi email |
| Xác nhận | Không cần (đăng ký tự động) | Bắt buộc trước mọi hành động ghi |
| Kiểm tra quyền | Không | Có (mỗi tool ghi đều check permission) |
| Session memory | MentionedActivities (track hoạt động đã đề cập) | sessionActivityCache (cache pending overview) |
