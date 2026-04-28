# Kiến trúc Chatbot AI CTXH — Hướng dẫn cho người mới

> Tài liệu giải thích toàn bộ hệ thống chatbot AI tư vấn hoạt động Công tác xã hội (CTXH) trong dự án Đoàn Hội Portal. Dành cho developer mới tham gia dự án.
>
> **Cập nhật lần cuối:** 28/04/2026

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
3. [Frontend — Giao diện chat](#3-frontend--giao-diện-chat)
4. [Backend — RAG Pipeline (student)](#4-backend--rag-pipeline-student)
5. [Backend — Staff Agent](#5-backend--staff-agent)
6. [Backend — MCP (Model Context Protocol)](#6-backend--mcp-model-context-protocol)
7. [Backend — Postgres MCP Client & Enrichment](#7-backend--postgres-mcp-client--enrichment)
8. [Vector Embedding & Sync](#8-vector-embedding--sync)
9. [LLM & Embedding Provider](#9-llm--embedding-provider)
10. [Cây thư mục chi tiết](#10-cây-thư-mục-chi-tiết)
11. [Data Flow chi tiết](#11-data-flow-chi-tiết)
12. [Biến môi trường](#12-biến-môi-trường)
13. [Thuật ngữ](#13-thuật-ngữ)

---

## 1. Tổng quan hệ thống

### Chatbot này làm gì?

Chatbot AI giúp **sinh viên** và **cán bộ Đoàn Hội** tương tác với hệ thống hoạt động CTXH bằng ngôn ngữ tự nhiên (tiếng Việt):

| Người dùng | Có thể làm gì qua chatbot |
|-----------|---------------------------|
| **Sinh viên** | Hỏi về hoạt động CTXH (tìm kiếm, lọc theo thời gian/khoa/địa điểm), đăng ký tham gia |
| **Cán bộ** | Tìm hoạt động mình quản lý, xem danh sách chờ/đã duyệt, duyệt/từ chối đăng ký + gửi email, tạo/cập nhật/xóa hoạt động, tạo batch hoạt động, gửi email thông báo chung, tra cứu danh mục/tổ chức |

### Công nghệ chính

| Thành phần | Công nghệ |
|-----------|-----------|
| Frontend chat UI | `@assistant-ui/react` (v0.12), `remark-gfm` (GFM tables), `@tailwindcss/typography` |
| Backend framework | NestJS (TypeScript) |
| AI/LLM | LangChain.js — orchestration framework cho LLM |
| LLM provider | **Ollama** (local: Qwen) hoặc **Google Gemini** (cloud) — chuyển đổi qua env var |
| Vector database | PostgreSQL + **pgvector** extension |
| Embedding model | Ollama (BGE-M3) hoặc Gemini Embeddings |
| Queue | BullMQ (Redis-backed) — xử lý async embedding |
| Session memory | In-memory (Map) với TTL tự dọn |

---

## 2. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
│                                                                     │
│   ChatbotWidget (nút floating góc phải)                             │
│       └── ChatbotPopup (cửa sổ chat)                               │
│             └── @assistant-ui/react primitives                      │
│                   └── ctxh-chat.adapter.ts                          │
│                         │                                           │
│                         │  POST /ctxh-chat/message                  │
│                         ▼                                           │
├─────────────────────────────────────────────────────────────────────┤
│                         BACKEND (NestJS)                            │
│                                                                     │
│   CtxhChatController                                                │
│       │                                                             │
│       ├── userType === 'staff'?                                     │
│       │       └── StaffAgentService (tool-calling loop, 10 vòng)    │
│       │             └── 12 custom tools + MCP Postgres tools        │
│       │                                                             │
│       └── userType === 'student'?                                   │
│               └── LangChainRagChainService (RAG pipeline)           │
│                     │                                               │
│                     ├── Step 1: Load chat history                   │
│                     ├── Step 2: Router Agent (intent detection)     │
│                     ├── Step 3-4: GREETING/CHITCHAT → trả lời ngay │
│                     ├── Step 4.5: REGISTER_ACTIVITY → đăng ký      │
│                     ├── Step 5: Tool selection + Retrieval          │
│                     ├── Step 6: Format context                      │
│                     ├── Step 7: Generate response (LLM)             │
│                     └── Step 8: Save memory + return                │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Supporting Services (14 service classes)                    │   │
│   │  ├── UniversalLLMService (Ollama ↔ Gemini)                  │   │
│   │  ├── UniversalEmbeddingsService (Ollama ↔ Gemini)           │   │
│   │  ├── LangChainVectorStoreService (pgvector search)          │   │
│   │  ├── LangChainMemoryService (session history + activity     │   │
│   │  │   tracking per turn)                                      │   │
│   │  ├── LangChainAdvancedRetrieverService (multi-query, hybrid)│   │
│   │  ├── CtxhFilterExtractionService (NLU filter parsing)       │   │
│   │  ├── LangChainIngestionService (activity → embedding)       │   │
│   │  ├── UserContextService (org/department info)               │   │
│   │  ├── PostgresMcpClientService (MCP Postgres client - SSE)   │   │
│   │  ├── McpSqlFallbackService (SQL fallback khi vector = 0)    │   │
│   │  └── McpMetadataEnricherService (enrich documents)          │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Embedding Sync Pipeline (event-driven)                      │   │
│   │  Activity CRUD → EventEmitter → CtxhVectorSyncService       │   │
│   │       → BullMQ queue → VectorIngestionProcessor              │   │
│   │       → LangChainIngestionService → pgvector upsert          │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         DATABASE                                    │
│                                                                     │
│   PostgreSQL                                                        │
│   ├── ctxh_activity     (hoạt động CTXH)                           │
│   ├── ctxh_participation (đăng ký tham gia)                        │
│   ├── ctxh_embeddings   (vector embeddings - pgvector)             │
│   └── ...                                                           │
│                                                                     │
│   Redis                                                             │
│   ├── BullMQ queues     (embedding jobs)                            │
│   └── Rate limiting     (request throttle)                          │
│                                                                     │
│   Postgres MCP Server (crystaldba/postgres-mcp via SSE)             │
│   └── Staff Agent queries SQL trực tiếp qua MCP                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend — Giao diện chat

### 3.1 Cấu trúc file

```
frontend/src/features/ctxh-chat/
├── components/
│   ├── ChatbotWidget.tsx      ← Nút floating + quản lý mở/đóng popup
│   ├── ChatbotPopup.tsx       ← Cửa sổ chat dạng popup (compact)
│   ├── CtxhThread.tsx         ← Thread chat full-page (larger, dùng cho CtxhChatPage)
│   ├── SourceCard.tsx         ← Card hiển thị nguồn tham khảo
│   └── SourceList.tsx         ← Danh sách source cards (collapsible)
├── runtime/
│   └── ctxh-chat.adapter.ts   ← Adapter kết nối backend với @assistant-ui/react
├── types/
│   └── chat.types.ts           ← TypeScript interfaces (CtxhChatResponse, CtxhSource, ...)
├── pages/
│   └── CtxhChatPage.tsx        ← Trang chat full-screen (dùng CtxhThread)
└── index.ts                    ← Barrel export (3 public exports)
```

### 3.2 Cách hoạt động

**ChatbotWidget** là component được render trên **mọi trang** trong portal (App.tsx). Nó hiển thị nút tròn ở góc dưới bên phải với animation chuyển đổi icon:

```
Bấm nút → isOpen = true → render ChatbotPopup
  Icon MessageCircle xoay ra (rotate-90 + scale-0 + opacity-0)
  Icon X xoay vào (rotate-0 + scale-100 + opacity-100)
Bấm lại → isOpen = false → ẩn popup
  Icon ngược lại
```

**Hai giao diện chat (2 thread UIs):**

| Component | Dùng trong | Kích thước | Avatar |
|-----------|-----------|-----------|--------|
| **ChatbotPopup** | ChatbotWidget (popup floating) | Responsive: 33vw → 50vw → full-screen | HCMCUT.png |
| **CtxhThread** | CtxhChatPage (full-page) | `calc(100vh - 64px)` | Graduation cap icon (doan-500) |

Cả hai đều sử dụng `@assistant-ui/react` primitives nhưng khác layout và kích thước.

**Markdown rendering:**

Cả hai component đều dùng `MarkdownTextPrimitive` từ `@assistant-ui/react-markdown` (sử dụng `react-markdown` bên dưới). Để hỗ trợ **bảng GFM** (GitHub Flavored Markdown), cần truyền `remarkPlugins={[remarkGfm]}` vào component (package `remark-gfm`). Nếu thiếu plugin này, bảng markdown sẽ hiển thị dạng raw text pipe-delimited.

**Table styling:**

- Plugin `@tailwindcss/typography` được cài và thêm vào `tailwind.config.js` → kích hoạt các class `prose`
- Custom CSS trong `globals.css` cho `.prose table`: viền, padding, zebra stripes (dòng chẵn/lẻ), hover highlight, horizontal scroll cho bảng rộng

**ChatbotPopup** sử dụng thư viện `@assistant-ui/react` để render giao diện chat. Thư viện này cung cấp các "primitive" (thành phần cơ bản):

| Primitive | Vai trò |
|-----------|---------|
| `ThreadPrimitive.Root` | Container cho toàn bộ thread chat |
| `ThreadPrimitive.Viewport` | Vùng hiển thị messages (auto-scroll) |
| `ThreadPrimitive.Messages` | Render danh sách messages |
| `MessagePrimitive.Root/Content` | Render 1 message (user hoặc AI) |
| `ComposerPrimitive.Root/Input/Send` | Ô nhập + nút gửi/cancel (dựa vào thread.isRunning) |
| `ActionBarPrimitive` | Nút reload / copy trên message |
| `BranchPicker` | Chuyển giữa các nhánh (Trước/Sau) |

**Tính năng UX nổi bật:**

| Tính năng | Chi tiết |
|-----------|---------|
| Thinking animation | Hiển thị khi `message.status?.type === 'running' && textContent.length === 0` |
| Thinking text cycle | "Đang suy nghĩ" → "Đang tìm kiếm" → "Đang tổng hợp" (mỗi 1.8s) |
| Welcome screen | Hiển thị khi thread rỗng (AuiIf condition), có suggestion chips |
| Follow-up suggestions | Render từ `message.metadata.custom.followUpSuggestions` |
| Responsive | Desktop 33vw/480px → Tablet 50vw → Mobile full-screen |

**ctxh-chat.adapter.ts** là cầu nối giữa `@assistant-ui/react` và backend:

```typescript
// Adapter implements ChatModelAdapter interface
export const ctxhChatAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    // 1. Lấy tin nhắn cuối cùng của user
    // 2. Lấy sessionId từ metadata message trước (để tiếp tục hội thoại)
    // 3. POST /ctxh-chat/message { message, sessionId }
    //    — kèm Authorization: Bearer token nếu đã đăng nhập
    // 4. Nhận response → giả lập streaming bằng cách yield từng token (16ms/token)
    //    — Tokenize bằng regex /(\s+)/ (word + whitespace)
    //    — Chỉ delay trên non-whitespace tokens
    // 5. Yield cuối cùng kèm metadata (sessionId, followUpSuggestions)
  }
};
```

> **Tại sao giả lập streaming?** Backend có endpoint SSE (`GET /ctxh-chat/stream`) nhưng frontend adapter hiện vẫn dùng POST + simulated streaming. Adapter nhận toàn bộ response rồi "nhỏ giọt" từng từ ra UI để tạo hiệu ứng typing tự nhiên (~60 ký tự/giây). Comment trong code ghi: *"When the backend gains a real SSE endpoint, replace this"*.

### 3.3 Luồng dữ liệu trên Frontend

```
User gõ "Có hoạt động nào sắp tới?"
    ↓
ComposerPrimitive gọi adapter.run()
    ↓
adapter POST /ctxh-chat/message
    ↓
Nhận response: { response: "Có 2 hoạt động...", sessionId: "abc", followUpSuggestions: [...] }
    ↓
Yield từng token → UI hiển thị chữ chạy dần
    ↓
Yield cuối cùng kèm metadata
    ↓
ChatbotPopup render follow-up suggestions (chip buttons)
```

---

## 4. Backend — RAG Pipeline (Student)

### 4.1 RAG là gì?

**RAG = Retrieval-Augmented Generation** (Tạo câu trả lời có hỗ trợ truy xuất)

Thay vì để LLM tự nghĩ ra câu trả lời (dễ bịa / hallucinate), ta:
1. **Retrieval**: Tìm kiếm thông tin liên quan từ database
2. **Augmented**: Đưa thông tin tìm được vào prompt
3. **Generation**: LLM tạo câu trả lời DỰA TRÊN thông tin đã tìm

### 4.2 Pipeline 8 bước

Khi sinh viên gửi tin nhắn, `LangChainRagChainService.invoke()` thực hiện:

```
Step 1: Load Chat History
│   Lấy lịch sử hội thoại từ session memory
│   Format: "Sinh viên: ... / Trợ lý: ..."
│
Step 2: Router Agent (1 LLM call)
│   Input: câu hỏi + lịch sử
│   Output (Zod validated):
│   {
│     rewrittenQuestion: "câu hỏi đã viết lại cho rõ ràng",
│     intent: "RAG_QUERY" | "GREETING" | "CHITCHAT" | "REGISTER_ACTIVITY"
│   }
│   Ví dụ: "cái đó khi nào?" → "Hoạt động Mùa hè xanh diễn ra khi nào?"
│
Step 3: GREETING → Trả lời chào ngay (không cần tìm kiếm)
│
Step 4: CHITCHAT → Trả lời từ chối lịch sự (ngoài phạm vi CTXH)
│
Step 4.5: REGISTER_ACTIVITY → Xử lý đăng ký
│   Kiểm tra session memory có "lastMentionedActivity" không
│   Nếu có → đăng ký luôn
│   Nếu không → tìm kiếm hoạt động → đăng ký
│
Step 5: Retrieve Documents (3 sub-steps)
│   5a. Tool Selection (1 LLM call)
│       LLM chọn 1 trong 4 chiến lược tìm kiếm:
│       ┌─────────────────────┬───────────────────────────────────┐
│       │ search_with_filters │ Câu hỏi có tiêu chí cụ thể      │
│       │                     │ (thời gian, địa điểm, khoa, ...) │
│       ├─────────────────────┼───────────────────────────────────┤
│       │ search_semantic     │ Câu hỏi chung, tìm theo nghĩa   │
│       │                     │ (nhanh nhất — skip filter extract)│
│       ├─────────────────────┼───────────────────────────────────┤
│       │ search_diverse      │ Muốn xem nhiều loại hoạt động    │
│       │                     │ (MMR — kết quả đa dạng)          │
│       ├─────────────────────┼───────────────────────────────────┤
│       │ list_activities_sql │ Liệt kê / xem tất cả hoạt động  │
│       │                     │ (SQL trực tiếp, không dùng embed) │
│       └─────────────────────┴───────────────────────────────────┘
│
│   5b. Filter Extraction (1 LLM call, nếu chọn search_with_filters)
│       Parse câu hỏi → structured filters:
│       {
│         status: ["upcoming"],
│         organizationKeywords: ["Máy tính"],
│         organizationLevel: "child",
│         locationRaw: ["cơ sở 1"],
│         dateRange: { isThisMonth: true }
│       }
│
│   5c. Org Injection
│       Nếu user thuộc khoa X và câu hỏi không nhắc khoa cụ thể
│       → tự động thêm filter khoa X (ưu tiên hoạt động của khoa user)
│       → chạy song song: search khoa X + search chung → merge kết quả
│
│   5d. Verification (nếu 0 kết quả)
│       Verifier LLM đề xuất câu tìm kiếm đơn giản hơn → thử lại
│
Step 6: Format Context
│   Biến documents thành text dễ đọc cho LLM:
│   "[Nguồn 1]
│    Hoạt động: Mùa hè xanh 2026
│    Tổ chức: Đoàn Trường
│    Thời gian: 01/06 - 15/06/2026
│    Trạng thái: Sắp diễn ra
│    Tuyển thành viên: Còn tuyển"
│
Step 7: Generate Response (1 LLM call)
│   RAG Prompt = system instructions + formatted context + câu hỏi
│   → LLM tạo câu trả lời bằng tiếng Việt
│
Step 8: Post-process & Save
    Lưu lastMentionedActivity vào session memory
    Lưu interaction (user + AI) vào conversation history
    Return RAGResponse
```

### 4.3 Xử lý đăng ký (REGISTER_ACTIVITY)

Khi Router Agent phát hiện user muốn đăng ký:

```
RAG Chain trả về:
  registrationTarget: { activityId: "abc", activityName: "Mùa hè xanh" }

Controller nhận được → gọi:
  participationService.registerSelf(activityId, userId)

Thành công → response: "✅ Đã đăng ký thành công..."
Thất bại → response: "❌ Không thể đăng ký: ..."
```

---

## 5. Backend — Staff Agent

Khi `userType === 'staff'`, controller chuyển sang `StaffAgentService` thay vì RAG pipeline.

### 5.1 Agent Loop

Staff Agent sử dụng **tool-calling loop** (tối đa 10 vòng lặp, 12 custom tools + MCP tools):

```
Vòng 1: LLM nhận câu hỏi → quyết định gọi tool nào
         ví dụ: tool_calls = [{ name: "search_my_activities", args: { keyword: "hiến máu" } }]
         → Thực thi tool → nhận kết quả
         → Đưa kết quả vào conversation

Vòng 2: LLM nhận kết quả tool → quyết định tiếp
         ví dụ: tool_calls = [{ name: "get_pending_participants", args: { activity_id: "xyz" } }]
         → Thực thi → đưa kết quả vào

Vòng 3: LLM thấy đủ thông tin → trả lời bằng text (không gọi tool nữa)
         → Kết thúc loop
```

### 5.2 Mười hai custom tools + MCP tools của Staff Agent

| # | Tool | Chức năng | Khi nào gọi |
|---|------|-----------|-------------|
| 1 | `search_activities` | Tìm hoạt động (lọc keyword/status/ongoing) + kèm pending count | "Hoạt động hiến máu đang diễn ra" |
| 2 | `get_pending_participants` | Lấy danh sách SV chờ duyệt (PENDING) của 1 hoạt động | "Ai đang chờ duyệt hoạt động X?" |
| 3 | `get_approved_participants` | Lấy danh sách SV đã duyệt (APPROVED) của 1 hoạt động | "Ai đã được duyệt hoạt động X?" |
| 4 | `approve_and_notify` | Duyệt batch + gửi email BCC xác nhận | "Duyệt tất cả đăng ký" |
| 5 | `reject_registration` | Từ chối batch + gửi email BCC với lý do | "Từ chối đăng ký sinh viên A" |
| 6 | `create_activity` | Tạo hoạt động mới (resolve tên category/org → UUID tự động) | "Tạo hoạt động mới tên là..." |
| 7 | `batch_create_activities` | Tạo 2-3 hoạt động cùng lúc | "Tạo 3 hoạt động cho tuần tới" |
| 8 | `manage_activity` | Cập nhật thông tin/trạng thái hoặc xóa mềm hoạt động | "Đổi địa điểm hoạt động X", "Hủy hoạt động Y" |
| 9 | `send_notification_email` | Gửi email thông báo chung cho tất cả SV đang tham gia (PENDING + APPROVED) | "Gửi email cho mọi người là hoạt động đã hủy" |
| 10 | `get_pending_overview` | Danh sách 10 hoạt động có SV chờ duyệt (ưu tiên hoạt động của user) | "Hoạt động nào đang chờ duyệt?" |
| 11 | `lookup_category` | Tra cứu danh mục CTXH (fuzzy search) | Trước khi tạo hoạt động |
| 12 | `lookup_organization` | Tra cứu tổ chức (fuzzy search) | Trước khi tạo hoạt động |
| + | MCP Postgres tools | `mcp_execute_sql`, `mcp_list_schemas`, `mcp_list_objects`, `mcp_get_object_details` | Truy vấn SQL nâng cao |

> **Session Activity Cache:** `get_pending_overview` lưu kết quả vào `sessionActivityCache` (Map per session). Khi duyệt sau đó, LLM tham chiếu cache này để xác định đúng hoạt động mà không cần hỏi lại.

### 5.3 Quy trình bắt buộc khi duyệt

LLM được hướng dẫn qua prompt phải tuân thủ 3 bước:
1. **Xác định hoạt động** → hỏi xác nhận trước
2. **Lấy danh sách PENDING** → trình bày cho cán bộ
3. **Duyệt + gửi mail** → chỉ khi cán bộ đồng ý

→ LLM **không được** tự ý duyệt mà chưa hỏi cán bộ.

### 5.4 Gửi email thông báo cho sinh viên

Khi cán bộ muốn thông báo thay đổi/chỉnh sửa/hủy hoạt động cho sinh viên:

```
Cán bộ: "Hủy hoạt động Quét rác và gửi email cho mọi người là hoạt động đã hủy vì thời tiết"
    ↓
Agent tự extract:
  - subject: "Thông báo hủy hoạt động Quét rác"
  - body: "Hoạt động Quét rác đã bị hủy vì lý do thời tiết."
    ↓
Gọi manage_activity(action="update", status="CANCELLED")
    ↓
Gọi send_notification_email(activity_id, subject, body)
    ↓
Email gửi BCC đến TẤT CẢ sinh viên PENDING + APPROVED
```

→ Agent tự extract tiêu đề + nội dung từ yêu cầu, **không hỏi lại** nếu đã rõ.
→ Nếu cán bộ yêu cầu hủy + gửi email → thực hiện **cả hai** thao tác.

---

## 6. Backend — MCP (Model Context Protocol)

### MCP là gì?

MCP là chuẩn giao thức cho phép LLM gọi tools qua HTTP. Dự án có **2 MCP server** (cho external clients) + **1 MCP client** (kết nối Postgres MCP):

| Thành phần | Loại | Mục đích |
|-----------|------|---------|
| Student MCP Server | Server | Expose 3 tools cho external AI agents (student context) |
| Staff MCP Server | Server | Expose 3 tools cho external AI agents (staff context) |
| PostgresMcpClientService | Client | Kết nối MCP Postgres server qua SSE cho Staff Agent |

### MCP Servers (cho external clients)

| Server | Endpoint | Tools |
|--------|----------|-------|
| Student MCP | `POST /mcp/student/*` | extract-filters, search-activities, register-activity |
| Staff MCP | `POST /mcp/staff/*` | create-activity, query-managed-activities, auto-approve-notify |

> **Lưu ý quan trọng:** Chatbot (ChatbotWidget) sử dụng RAG pipeline + Staff Agent qua `/ctxh-chat/message`. Các MCP server endpoints dành cho **external AI clients** (IDE plugins, CLI tools).
>
> **Staff Agent ≠ Staff MCP Server.** Staff Agent có 12 custom tools + MCP Postgres tools. Staff MCP Server chỉ có 3 tools đơn giản cho external clients.

### Cấu trúc file MCP

```
backend/src/ctxh-mcp/
├── controllers/
│   ├── student-mcp.controller.ts    ← HTTP endpoints cho student tools
│   └── staff-mcp.controller.ts      ← HTTP endpoints cho staff tools
├── servers/
│   ├── student.server.ts            ← Factory tạo student MCP server instance
│   └── staff.server.ts              ← Factory tạo staff MCP server instance
├── tools/
│   ├── student/
│   │   ├── extract-filters.tool.ts  ← Parse message → structured filters
│   │   ├── search-activities.tool.ts ← Tìm hoạt động (vector + DB)
│   │   └── register-activity.tool.ts ← Đăng ký tham gia
│   └── staff/
│       ├── create-activity.tool.ts   ← Tạo hoạt động mới
│       ├── query-managed-activities.tool.ts ← Xem hoạt động quản lý
│       └── auto-approve-notify.tool.ts ← Duyệt + gửi email
├── notifications/
│   └── nodemailer.service.ts         ← Gửi email (approval/rejection/notification BCC batch)
├── guards/
│   └── ctxh-permission.helper.ts     ← Kiểm tra quyền CTXH
├── types/
│   └── mcp-context.types.ts          ← Type definitions
└── ctxh-mcp.module.ts                ← NestJS module
```

> **Lưu ý:** Hiện tại chatbot chính (ChatbotWidget) sử dụng RAG pipeline + Staff Agent qua endpoint `/ctxh-chat/message`, **KHÔNG** trực tiếp gọi MCP endpoints. MCP servers được thiết kế cho các client khác (IDE plugins, CLI tools, hoặc external AI agents) muốn tương tác với hệ thống CTXH.

---

## 7. Backend — Postgres MCP Client & Enrichment

### 7.1 PostgresMcpClientService

Kết nối đến một **Postgres MCP server bên ngoài** (crystaldba/postgres-mcp) qua SSE:

```
Staff Agent Tool (manage_activity, get_pending_overview)
    → PostgresMcpClientService.executeSqlRows(sql)
        → SSE transport → Postgres MCP Server
            → PostgreSQL query
```

**Tính năng:**
- Kết nối qua SSE (`POSTGRES_MCP_SSE_URL` env var)
- Discover tools tự động khi khởi tạo
- **Security:** Block SQL chứa `DROP`, `TRUNCATE`, `ALTER`, `GRANT`, `REVOKE`, `CREATE ROLE`, `pg_read_file`
- Parse Python repr output từ crystaldba/postgres-mcp: `UUID('...')`, `Decimal('...')`, `datetime.datetime()`, `True/False/None`
- **Graceful degradation:** Nếu MCP server không available → log warning, tools trả lỗi

**Allowlist tools:**
- `mcp_execute_sql` — Chạy SQL query
- `mcp_list_schemas` — Liệt kê schemas
- `mcp_list_objects` — Liệt kê tables/views
- `mcp_get_object_details` — Chi tiết 1 object

### 7.2 McpSqlFallbackService

Khi **vector search trả về 0 kết quả**, fallback sang SQL trực tiếp:

```
RAG Pipeline → vector search → 0 documents
    → McpSqlFallbackService.fallbackSearch(query)
        → SQL query không dùng embedding → Documents[]
    → hoặc .listActivities(orgFilter?) 
        → Liệt kê activities SQL-based
```

### 7.3 McpMetadataEnricherService

Enrichment sau khi vector search:

```
Documents[] (từ vector search)
    → McpMetadataEnricherService.enrichDocuments(docs)
        → 1 MCP SQL call (batch)
        → Thêm: requiresApproval, maxParticipants, remainingSlots, categoryName
    → Documents[] (enriched)
```

- Batch enrichment qua single MCP call (tối ưu)
- Graceful degradation khi MCP fail (trả về docs gốc)

---

## 8. Vector Embedding & Sync

### 8.1 Embedding là gì?

**Embedding** = biểu diễn văn bản dưới dạng vector số (mảng 1024 số thực). Hai đoạn văn bản có nghĩa giống nhau → vector gần nhau → tìm được qua cosine similarity.

```
"Chiến dịch Mùa hè xanh tình nguyện"  →  [0.12, -0.34, 0.56, ...]  (1024 chiều)
"Hoạt động tình nguyện mùa hè"        →  [0.11, -0.33, 0.55, ...]  ← gần nhau!
"Bài toán tích phân"                   →  [0.89, 0.22, -0.71, ...]  ← xa!
```

### 8.2 Pipeline: Activity → Embedding

Khi một hoạt động CTXH được tạo/sửa/xóa trong database:

```
1. TypeORM Event
   Activity INSERT/UPDATE/DELETE
       ↓
2. CtxhActivitySubscriber (TypeORM EventSubscriber)
   afterInsert() / afterUpdate() / beforeRemove()
       ↓
3. EventEmitter2
   emit(ACTIVITY_EVENTS.CREATED / UPDATED / DELETED / RESTORED / STATUS_CHANGED)
       ↓
4. CtxhVectorSyncService (@OnEvent listener — 5 events)
   ├── ActivityCreatedEvent       → UPSERT job
   ├── ActivityUpdatedEvent       → UPSERT (chỉ khi CONTENT_FIELDS thay đổi)
   ├── ActivityDeletedEvent       → DELETE job
   ├── ActivityRestoredEvent      → UPSERT job
   └── ActivityStatusChangedEvent → UPSERT job
   
   Content fields (trigger re-embed):
   name, description, location, start_date, end_date, total_days,
   category_id, organization_id, status
   
   Non-content fields (bỏ qua): view_count, updated_at, ...
       ↓
5. BullMQ Queue ('vectorize_queue')
   Job được đẩy vào queue Redis
   Dedup: jobId = "upsert_{activityId}" (tránh duplicate)
   Concurrency: 1 (xử lý tuần tự, tránh Ollama rate limit)
       ↓
6. VectorIngestionProcessor (@Process)
   Nhận job → gọi ingestionService
   Retry: 3 lần, exponential backoff (2s → 4s → 8s)
   removeOnComplete: true (tránh Redis jobId collision)
   removeOnFail: 50 (giữ 50 job lỗi gần nhất)
       ↓
7. LangChainIngestionService
   processActivity(activityId):
   a. Xóa embeddings cũ của activity này
   b. Lấy activity data từ DB (kèm relation organization, category)
   c. Format thành text: "Tên: X, Tổ chức: Y, Thời gian: ..."
   d. Tạo Document với metadata (activityId, organizationName, startDate, ...)
   e. Gọi embeddingsService.embedDocuments() → vector
   f. Lưu vào bảng ctxh_embeddings (pgvector)
```

### 8.3 Bảng ctxh_embeddings

```sql
CREATE TABLE ctxh_embeddings (
  id           UUID PRIMARY KEY,
  activity_id  UUID REFERENCES ctxh_activity(id),
  content_text TEXT,                    -- Nội dung đã format
  embedding    vector(1024),            -- Vector embedding (pgvector type)
  chunk_index  INTEGER DEFAULT 0,       -- Nếu activity dài, chia thành nhiều chunks
  metadata     JSONB,                   -- { activityName, organizationName, startDate, ... }
  created_at   TIMESTAMP,
  updated_at   TIMESTAMP
);

-- Index cho vector search
CREATE INDEX ON ctxh_embeddings USING ivfflat (embedding vector_cosine_ops);
```

### 8.4 Tìm kiếm Vector (4 phương pháp)

| Phương pháp | Service Method | Khi nào dùng |
|------------|----------------|-------------|
| **Semantic Search** | `similaritySearchWithDateFilter()` | Câu hỏi chung, tìm theo nghĩa (tự lọc DRAFT) |
| **Filtered Search** | `similaritySearchWithMetadataFilters()` | Có tiêu chí cụ thể (khoa, ngày, địa điểm) |
| **MMR (Maximal Marginal Relevance)** | `maxMarginalRelevanceSearch()` | Muốn kết quả đa dạng, không trùng lặp |
| **SQL Fallback** | `McpSqlFallbackService.listActivities()` | Liệt kê tất cả, không phụ thuộc embedding |

**Filtered Search** đặc biệt vì nó build **SQL WHERE clause động**:

```sql
-- Ví dụ: "Hoạt động của khoa CSE sắp tới ở cơ sở 1"
SELECT *, embedding <=> $1 AS distance
FROM ctxh_embeddings
WHERE metadata->>'organizationName' ILIKE '%CSE%'
  AND metadata->>'startDate' > '2026-04-21'
  AND metadata->>'location' ILIKE '%cơ sở 1%'
ORDER BY distance ASC
LIMIT 5;
```

---

## 9. LLM & Embedding Provider

### 9.1 Hệ thống toggle

Dự án hỗ trợ **2 provider**, chuyển đổi qua biến môi trường:

```
USE_LOCAL_MODEL_LLM=true        → Ollama (chạy local, Qwen model)
USE_LOCAL_MODEL_LLM=false       → Google Gemini (cloud API)

USE_LOCAL_MODEL_EMBEDDING=true  → Ollama (BGE-M3 model)
USE_LOCAL_MODEL_EMBEDDING=false → Google Gemini Embeddings
```

> **LLM và Embedding có thể dùng provider khác nhau.** Ví dụ: LLM = Gemini (cloud, chất lượng cao) + Embedding = Ollama (local, miễn phí).

### 9.2 Kiến trúc abstraction

```
UniversalLLMService           UniversalEmbeddingsService
    │                              │
    └── LangChainConfig            └── LangChainConfig
          │                              │
          ├── createLocalLLM()           ├── createLocalEmbeddings()
          │   └── ChatOllama             │   └── OllamaEmbeddings
          │       (Qwen model)           │       (BGE-M3 model)
          │                              │
          └── createCloudLLM()           └── createCloudEmbeddings()
              └── ChatGoogleGenerativeAI     └── GoogleGenerativeAIEmbeddings
                  (Gemini 2.0)                   (text-embedding-004)
```

Các service khác (RAG chain, vector store, ...) **không biết** đang dùng Ollama hay Gemini — chỉ gọi `universalLLMService.getLLM()` và nhận `BaseChatModel`.

### 9.3 Tại sao cần 2 provider?

| | Ollama (Local) | Gemini (Cloud) |
|---|---|----|
| **Chi phí** | Miễn phí | Tính theo token |
| **Tốc độ** | Phụ thuộc GPU server | Nhanh, ổn định |
| **Privacy** | Data không rời server | Data gửi lên Google |
| **Chất lượng** | Tốt (Qwen 7B+) | Rất tốt |
| **Khi nào dùng** | Development, self-hosted | Production, cần chất lượng cao |

---

## 10. Cây thư mục chi tiết

### Backend — ctxh-chat/ (module chính)

```
backend/src/ctxh-chat/
│
├── 📁 config/                          ← Cấu hình LLM/Embedding
│   ├── langchain.config.ts             ← Factory: tạo LLM + Embedding instance
│   ├── google-genai-embeddings.ts      ← Setup Gemini embeddings
│   ├── category.config.ts              ← Danh mục hoạt động
│   └── index.ts
│
├── 📁 constants/                       ← Hằng số
│   ├── vector-queue.constants.ts       ← Tên queue: 'vectorize_queue', job types
│   └── location.constants.ts           ← Alias địa điểm: "CS1" = "Cơ sở 1", ...
│
├── 📁 controllers/                     ← HTTP endpoints
│   └── ctxh-chat.controller.ts         ← POST /ctxh-chat/message (entry point)
│                                          SSE  /ctxh-chat/stream (streaming)
│                                          GET  /ctxh-chat/history/:sessionId
│                                          DELETE /ctxh-chat/session/:sessionId
│                                          POST /ctxh-chat/ingestion/full
│                                          POST /ctxh-chat/ingestion/incremental
│                                          POST /ctxh-chat/ingestion/activity/:id
│                                          DELETE /ctxh-chat/ingestion/activity/:id
│                                          GET  /ctxh-chat/ingestion/stats
│                                          GET  /ctxh-chat/ingestion/queue-status
│                                          POST /ctxh-chat/ingestion/force-sync-all
│                                          GET  /ctxh-chat/health
│                                          GET  /ctxh-chat/health/vector-store
│                                          GET  /ctxh-chat/health/models
│                                          GET  /ctxh-chat/stats/memory
│                                          GET  /ctxh-chat/stats/sessions
│
├── 📁 dto/                             ← Data Transfer Objects (request/response shapes)
│   ├── chat-request.dto.ts             ← { message, sessionId? }
│   ├── chat-response.dto.ts            ← { response, sources[], sessionId, followUpSuggestions }
│   ├── chat.dto.ts                     ← Shared DTO types
│   ├── router-output.dto.ts            ← { intent, rewrittenQuestion } (Zod schema)
│   ├── verifier-output.dto.ts          ← { verdict, supplementQuery } (Zod schema)
│   ├── filter-extraction.dto.ts        ← { status[], orgKeywords[], dateRange } (Zod schema)
│   └── index.ts
│
├── 📁 interfaces/                      ← TypeScript interfaces
│   ├── chat.interface.ts               ← Message, Conversation types
│   ├── conversation.interface.ts       ← ConversationSession type
│   ├── retrieval.interface.ts          ← RAGResponse type
│   └── index.ts
│
├── 📁 interceptors/                    ← NestJS interceptors
│   └── rate-limit.interceptor.ts       ← Redis-based rate limiting (30 req/min default)
│                                          Per-user OR per-IP, atomic Redis MULTI
│                                          Returns HTTP 429 + X-RateLimit-* headers
│
├── 📁 processors/                      ← BullMQ job processors
│   └── vector-ingestion.processor.ts   ← Worker: xử lý upsert/delete/full_sync jobs
│                                          Concurrency: 1, 3 retries, exponential backoff
│
├── 📁 prompts/                         ← LLM prompt templates (QUAN TRỌNG!)
│   ├── ctxh-chat.prompts.ts            ← CTXH_RAG_PROMPT — prompt chính cho RAG
│   │                                      (system instructions, format rules, context injection)
│   ├── router-agent.prompt.ts          ← Intent detection + question rewriting
│   ├── filter-extraction.prompt.ts     ← Parse câu hỏi → structured filters
│   ├── tool-selector.prompt.ts         ← Chọn 1/4 search tools
│   ├── retrieval-verifier.prompt.ts    ← Khi 0 kết quả, đề xuất query fallback
│   ├── staff-agent.prompt.ts           ← Staff tool-calling prompt (nhận currentDate + cached activities)
│   └── index.ts
│
├── 📁 services/                        ← Business logic (14 SERVICE CLASSES)
│   ├── universal-llm.service.ts        ← Abstraction LLM (Ollama ↔ Gemini) + health check
│   ├── universal-embeddings.service.ts ← Abstraction Embedding + health check
│   ├── langchain-vector-store.service.ts ← pgvector CRUD + 3 search methods + auto DRAFT filter
│   ├── langchain-memory.service.ts     ← Session history + MentionedActivity tracking per turn
│   │                                      (max 1000 sessions, 30min TTL, 5min cleanup cycle)
│   ├── langchain-advanced-retriever.service.ts ← Multi-query search + hybrid search + dedup
│   ├── ctxh-filter-extraction.service.ts ← NLU: câu hỏi → filters (dùng LLM + Zod)
│   ├── langchain-rag-chain.service.ts  ← ⭐ MAIN: RAG pipeline 8 bước (student flow)
│   ├── staff-agent.service.ts          ← ⭐ Staff ReACT agent (12 custom tools + MCP tools)
│   ├── langchain-ingestion.service.ts  ← Activity → embedding conversion + full/incremental
│   ├── ctxh-vector-sync.service.ts     ← Event listener (5 events) → queue jobs
│   ├── user-context.service.ts         ← Lấy thông tin user (org, department, training dept)
│   ├── postgres-mcp-client.service.ts  ← MCP Postgres client (SSE, tool discovery, SQL guard)
│   ├── mcp-sql-fallback.service.ts     ← SQL fallback khi vector search = 0 kết quả
│   ├── mcp-metadata-enricher.service.ts ← Enrich documents (slots, category, approval status)
│   ├── index.ts
│   └── 📁 __tests__/                  ← Unit tests
│
├── 📁 subscribers/                     ← TypeORM event subscribers
│   └── ctxh-activity.subscriber.ts     ← Activity CRUD events → embedding sync
│
├── 📁 tools/                           ← LLM tool definitions
│   └── rag-tools.ts                    ← 4 search tools cho tool selector
│                                          (search_with_filters, search_semantic,
│                                           search_diverse, list_activities_sql)
│
└── ctxh-chat.module.ts                 ← NestJS module registration
```

### Backend — ctxh-mcp/ (MCP servers cho external clients)

```
backend/src/ctxh-mcp/
├── 📁 controllers/
│   ├── student-mcp.controller.ts       ← POST /mcp/student/*
│   └── staff-mcp.controller.ts         ← POST /mcp/staff/*
├── 📁 servers/
│   ├── student.server.ts               ← Tạo student MCP server (3 tools)
│   └── staff.server.ts                 ← Tạo staff MCP server (3 tools)
├── 📁 tools/
│   ├── 📁 student/                     ← 3 student tools
│   │   ├── extract-filters.tool.ts
│   │   ├── search-activities.tool.ts
│   │   └── register-activity.tool.ts
│   └── 📁 staff/                       ← 3 staff tools
│       ├── create-activity.tool.ts
│       ├── query-managed-activities.tool.ts
│       └── auto-approve-notify.tool.ts
├── 📁 notifications/
│   └── nodemailer.service.ts           ← Gửi email xác nhận/từ chối/thông báo chung (BCC batch)
├── 📁 guards/
│   └── ctxh-permission.helper.ts       ← Check quyền CTXH (dùng chung bởi Staff Agent)
├── 📁 types/
│   └── mcp-context.types.ts
└── ctxh-mcp.module.ts
```

### Frontend — ctxh-chat/

```
frontend/src/features/ctxh-chat/
├── 📁 components/
│   ├── ChatbotWidget.tsx               ← Nút floating (bottom-right) + toggle popup
│   │                                      Animated icon (MessageCircle ↔ X rotate transition)
│   ├── ChatbotPopup.tsx                ← Chat UI compact (popup, responsive breakpoints)
│   │                                      Avatar: HCMCUT.png, thinking dots size-1.5
│   ├── CtxhThread.tsx                  ← Chat UI full-page (larger, dùng cho CtxhChatPage)
│   │                                      Avatar: graduation cap (doan-500), thinking dots size-2
│   │                                      Follow-up suggestion buttons, branch picker
│   ├── SourceCard.tsx                  ← Card hiển thị 1 source (name, org, score %, progress bar)
│   └── SourceList.tsx                  ← List collapsible "{count} nguồn tham khảo"
├── 📁 runtime/
│   └── ctxh-chat.adapter.ts           ← ChatModelAdapter (POST → simulated streaming 16ms/token)
│                                          Kèm Authorization: Bearer token
├── 📁 types/
│   └── chat.types.ts                  ← CtxhChatResponse, CtxhSource, MessageMetadata
├── 📁 pages/
│   └── CtxhChatPage.tsx               ← Full-screen chat (height: calc(100vh - 64px))
└── index.ts                           ← Barrel exports (3 public: CtxhChatPage, ctxhChatAdapter, ChatbotWidget)
```

---

## 11. Data Flow chi tiết

### 11.1 Student hỏi câu hỏi

```
┌──────────────┐     POST /ctxh-chat/message      ┌──────────────────┐
│  ChatbotPopup │ ──────────────────────────────→  │ CtxhChatController│
│  (Frontend)   │  { message, sessionId }          │  (Backend)        │
└──────────────┘                                   └────────┬─────────┘
                                                            │
                                          userType === 'student'
                                                            │
                                                            ▼
                                                ┌─────────────────────┐
                                                │ RagChainService     │
                                                │   .invoke()         │
                                                └────────┬────────────┘
                                                         │
                    ┌────────────────────────────────────┤
                    │                                    │
                    ▼                                    ▼
           ┌──────────────┐                    ┌──────────────────┐
           │ MemoryService │                    │ Router Agent     │
           │ .getHistory() │                    │ (1 LLM call)     │
           └──────────────┘                    └────────┬─────────┘
                                                        │
                                          intent = RAG_QUERY
                                                        │
                                                        ▼
                                               ┌────────────────┐
                                               │ Tool Selector  │
                                               │ (1 LLM call)   │
                                               └───────┬────────┘
                                                       │
                                        tool = search_with_filters
                                                       │
                                                       ▼
                                            ┌────────────────────┐
                                            │ FilterExtraction   │
                                            │ (1 LLM call)       │
                                            └───────┬────────────┘
                                                    │
                                     filters = { status: ["upcoming"] }
                                                    │
                                                    ▼
                                          ┌──────────────────────┐
                                          │ VectorStoreService   │
                                          │ .searchWithFilters() │
                                          │                      │
                                          │ SQL: SELECT * FROM   │
                                          │ ctxh_embeddings      │
                                          │ WHERE status='ACTIVE'│
                                          │ AND startDate > now  │
                                          │ ORDER BY distance    │
                                          └───────┬──────────────┘
                                                  │
                                          5 documents found
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │ Format Context   │
                                        │ docs → text      │
                                        └───────┬──────────┘
                                                │
                                                ▼
                                       ┌────────────────────┐
                                       │ RAG Generation     │
                                       │ (1 LLM call)       │
                                       │                    │
                                       │ Prompt:            │
                                       │ System: "Bạn là   │
                                       │ trợ lý CTXH..."    │
                                       │ Context: [5 docs]  │
                                       │ Question: "..."    │
                                       └───────┬────────────┘
                                               │
                                          response text
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │ Save to Memory   │
                                      │ Generate         │
                                      │ followUpSuggestions│
                                      └───────┬──────────┘
                                              │
                              ChatResponseDto │
                                              ▼
┌──────────────┐     JSON Response           ┌──────────────────┐
│  ChatbotPopup │ ←─────────────────────────  │ Controller       │
│  render text  │  { response, sources[],    │ return DTO       │
│  + suggestions│    followUpSuggestions }    └──────────────────┘
└──────────────┘
```

**Tổng cộng: 3-4 LLM calls mỗi câu hỏi RAG_QUERY** (Router + Tool Selector + [Filter Extraction nếu cần] + RAG Generation). Tool `list_activities_sql` bỏ qua cả Filter Extraction lẫn vector search.

### 11.2 Activity thay đổi → Embedding cập nhật

```
Admin tạo/sửa activity
        │
        ▼
   TypeORM save()
        │
        ▼
┌─────────────────────┐
│ ActivitySubscriber   │  ← TypeORM event
│ afterInsert/Update() │
└────────┬────────────┘
         │
    EventEmitter2.emit(ACTIVITY_EVENTS.UPDATED)
         │
         ▼
┌──────────────────────┐
│ CtxhVectorSyncService│  ← @OnEvent listener
│ Content changed?     │
│ (name/desc/date/...) │
└────────┬─────────────┘
         │ Yes
         ▼
┌──────────────────────┐
│ BullMQ Queue         │  ← Redis queue
│ Job: UPSERT          │
│ Dedup: activity_id   │
└────────┬─────────────┘
         │
         ▼ (async, concurrency: 1)
┌──────────────────────┐
│ VectorIngestion      │  ← BullMQ Processor
│ Processor            │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ IngestionService     │
│ 1. Delete old embeds │
│ 2. Format content    │
│ 3. Generate vector   │
│ 4. Save to pgvector  │
└──────────────────────┘
```

---

## 12. Biến môi trường

### LLM & Embedding (bắt buộc)

```bash
# Chọn provider
USE_LOCAL_MODEL_LLM=true|false           # true = Ollama, false = Gemini
USE_LOCAL_MODEL_EMBEDDING=true|false     # true = Ollama, false = Gemini

# Ollama (nếu dùng local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_LLM_MODEL=qwen2.5:7b             # Model LLM
OLLAMA_EMBEDDING_MODEL=bge-m3            # Model embedding
OLLAMA_NUM_CTX=8192                      # Context window size

# Gemini (nếu dùng cloud)
GEMINI_API_KEY=AIza...                   # Google API key
GEMINI_MODEL=gemini-2.0-flash           # Model LLM
GEMINI_EMBEDDING_MODEL=text-embedding-004
GEMINI_EMBEDDING_DIMENSION=1024
```

### RAG Config

```bash
RAG_TEMPERATURE=0.1                      # Creativity (0 = deterministic, 1 = creative)
RAG_TOP_K=5                              # Số documents retrieve
RAG_SIMILARITY_THRESHOLD=0.5             # Ngưỡng similarity tối thiểu
RAG_MEMORY_WINDOW_SIZE=10                # Số messages lưu trong session
```

### Rate Limiting

```bash
RATE_LIMIT_MAX_REQUESTS=30               # Max requests per window
RATE_LIMIT_WINDOW_SECONDS=60             # Window duration
```

### Infrastructure (cần có sẵn)

```bash
# PostgreSQL (cần pgvector extension)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=doanhoi_portal

# Redis (cho BullMQ + rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379

# Postgres MCP Server (cho Staff Agent tools)
POSTGRES_MCP_SSE_URL=http://localhost:3100/sse   # crystaldba/postgres-mcp SSE endpoint
```

---

## 13. Thuật ngữ

| Thuật ngữ | Giải thích |
|-----------|-----------|
| **RAG** | Retrieval-Augmented Generation — kỹ thuật kết hợp tìm kiếm dữ liệu + LLM để trả lời chính xác |
| **LLM** | Large Language Model — mô hình ngôn ngữ lớn (GPT, Gemini, Qwen...) |
| **Embedding** | Vector số đại diện cho ý nghĩa của văn bản, dùng để tìm kiếm semantic |
| **pgvector** | Extension của PostgreSQL cho phép lưu trữ và tìm kiếm vector |
| **Cosine Similarity** | Phương pháp đo độ tương đồng giữa 2 vectors (0 = khác hoàn toàn, 1 = giống hoàn toàn) |
| **MMR** | Maximal Marginal Relevance — thuật toán cân bằng giữa relevance và diversity |
| **Intent** | Ý định của user (RAG_QUERY, GREETING, CHITCHAT, REGISTER_ACTIVITY) |
| **MCP** | Model Context Protocol — chuẩn để LLM gọi tools qua HTTP |
| **MCP Client** | Phía gọi MCP server (PostgresMcpClientService kết nối Postgres MCP server) |
| **MCP Server** | Phía expose tools cho external clients (Student/Staff MCP servers) |
| **SSE** | Server-Sent Events — giao thức streaming one-way từ server |
| **BullMQ** | Thư viện job queue dựa trên Redis |
| **Tool Calling** | LLM quyết định gọi function nào thay vì chỉ trả lời text |
| **ReACT Loop** | Reasoning + Acting — LLM suy luận → gọi tool → nhận kết quả → lặp (tối đa 10 vòng) |
| **Zod** | Thư viện TypeScript validate schema — dùng để ép LLM trả đúng format |
| **Structured Output** | Buộc LLM trả JSON theo schema cụ thể (thay vì text tự do) |
| **CTXH** | Công tác xã hội — hoạt động phục vụ cộng đồng bắt buộc cho sinh viên |
| **SessionId** | ID theo dõi hội thoại — cho phép chatbot nhớ context qua nhiều lượt |
| **MentionedActivity** | Hoạt động được nhắc đến trong turn — tracked per turn cho REGISTER_ACTIVITY |
| **Prompt Template** | Mẫu prompt với biến (placeholder) được inject lúc runtime |
| **Ingestion** | Quá trình đưa dữ liệu vào hệ thống (activity → chunking → embedding → store) |
| **SQL Fallback** | Khi vector search không có kết quả → truy vấn SQL trực tiếp thay thế |
| **Metadata Enrichment** | Bổ sung thêm thông tin (slots, approval, category) vào documents sau retrieval |
| **Graceful Degradation** | Hệ thống vẫn hoạt động khi 1 thành phần lỗi (MCP down → skip enrichment) |

---

## Quick Start cho Developer mới

1. **Đọc prompts trước** — folder `backend/src/ctxh-chat/prompts/` là nơi quyết định hành vi AI. Bắt đầu với `router-agent.prompt.ts` rồi `ctxh-chat.prompts.ts`.

2. **Trace 1 request** — Đặt breakpoint trong `CtxhChatController.sendMessage()`, gửi 1 tin nhắn từ chatbot, follow qua từng step.

3. **Test local** — Set `USE_LOCAL_MODEL_LLM=false` + `GEMINI_API_KEY=...` để test nhanh mà không cần cài Ollama.

4. **Xem logs** — Service có logging chi tiết. Tìm `this.logger` trong RAG chain service để xem pipeline đang chạy step nào.

5. **Thay đổi hành vi AI** — 90% thay đổi hành vi chỉ cần sửa file trong `prompts/`. Không cần sửa code logic.

6. **Staff Agent tools** — Xem `staff-agent.service.ts` → `buildTools()` để hiểu 12 custom tools + MCP tools.

7. **Health check** — Gọi `GET /ctxh-chat/health` và `GET /ctxh-chat/health/models` để kiểm tra toàn bộ pipeline.

8. **MCP debug** — Nếu Staff Agent tools lỗi MCP, check `POSTGRES_MCP_SSE_URL` và xem logs `PostgresMcpClientService`.
