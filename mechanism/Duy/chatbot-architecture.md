# Kiến trúc Chatbot AI CTXH — Hướng dẫn cho người mới

> Tài liệu giải thích toàn bộ hệ thống chatbot AI tư vấn hoạt động Công tác xã hội (CTXH) trong dự án Đoàn Hội Portal. Dành cho developer mới tham gia dự án.

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
3. [Frontend — Giao diện chat](#3-frontend--giao-diện-chat)
4. [Backend — RAG Pipeline (student)](#4-backend--rag-pipeline-student)
5. [Backend — Staff Agent](#5-backend--staff-agent)
6. [Backend — MCP (Model Context Protocol)](#6-backend--mcp-model-context-protocol)
7. [Vector Embedding & Sync](#7-vector-embedding--sync)
8. [LLM & Embedding Provider](#8-llm--embedding-provider)
9. [Cây thư mục chi tiết](#9-cây-thư-mục-chi-tiết)
10. [Data Flow chi tiết](#10-data-flow-chi-tiết)
11. [Biến môi trường](#11-biến-môi-trường)
12. [Thuật ngữ](#12-thuật-ngữ)

---

## 1. Tổng quan hệ thống

### Chatbot này làm gì?

Chatbot AI giúp **sinh viên** và **cán bộ Đoàn Hội** tương tác với hệ thống hoạt động CTXH bằng ngôn ngữ tự nhiên (tiếng Việt):

| Người dùng | Có thể làm gì qua chatbot |
|-----------|---------------------------|
| **Sinh viên** | Hỏi về hoạt động CTXH (tìm kiếm, lọc theo thời gian/khoa/địa điểm), đăng ký tham gia |
| **Cán bộ** | Tìm hoạt động mình quản lý, xem danh sách chờ duyệt, duyệt đăng ký + gửi email, tạo hoạt động mới |

### Công nghệ chính

| Thành phần | Công nghệ |
|-----------|-----------|
| Frontend chat UI | `@assistant-ui/react` (v0.12) — thư viện chat UI composable |
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
│       │       └── StaffAgentService (tool-calling loop)             │
│       │             └── 4 tools: search/pending/approve/create      │
│       │                                                             │
│       └── userType === 'student'?                                   │
│               └── LangChainRagChainService (RAG pipeline)           │
│                     │                                               │
│                     ├── Step 1: Load chat history                   │
│                     ├── Step 2: Router Agent (intent detection)     │
│                     ├── Step 3-4: GREETING/CHITCHAT → trả lời ngay │
│                     ├── Step 5: Tool selection + Retrieval          │
│                     ├── Step 6: Format context                      │
│                     ├── Step 7: Generate response (LLM)             │
│                     └── Step 8: Save memory + return                │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Supporting Services                                         │   │
│   │  ├── UniversalLLMService (Ollama ↔ Gemini)                  │   │
│   │  ├── UniversalEmbeddingsService (Ollama ↔ Gemini)           │   │
│   │  ├── LangChainVectorStoreService (pgvector search)          │   │
│   │  ├── LangChainMemoryService (session history)               │   │
│   │  ├── CtxhFilterExtractionService (NLU filter parsing)       │   │
│   │  └── LangChainIngestionService (activity → embedding)       │   │
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
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend — Giao diện chat

### 3.1 Cấu trúc file

```
frontend/src/features/ctxh-chat/
├── components/
│   ├── ChatbotWidget.tsx      ← Nút floating + quản lý mở/đóng popup
│   ├── ChatbotPopup.tsx       ← Cửa sổ chat chính (messages, input, suggestions)
│   ├── SourceCard.tsx         ← Card hiển thị nguồn tham khảo
│   └── SourceList.tsx         ← Danh sách source cards
├── runtime/
│   └── ctxh-chat.adapter.ts   ← Adapter kết nối backend với @assistant-ui/react
├── types/
│   └── chat.types.ts           ← TypeScript interfaces (CtxhChatResponse, CtxhSource, ...)
├── pages/
│   └── CtxhChatPage.tsx        ← Trang chat full-screen (chưa dùng)
└── index.ts                    ← Barrel export
```

### 3.2 Cách hoạt động

**ChatbotWidget** là component được render trên **mọi trang** trong portal (App.tsx). Nó hiển thị nút tròn ở góc dưới bên phải:

```
Bấm nút → isOpen = true → render ChatbotPopup
Bấm lại → isOpen = false → ẩn popup
```

**ChatbotPopup** sử dụng thư viện `@assistant-ui/react` để render giao diện chat. Thư viện này cung cấp các "primitive" (thành phần cơ bản):

| Primitive | Vai trò |
|-----------|---------|
| `ThreadPrimitive.Root` | Container cho toàn bộ thread chat |
| `ThreadPrimitive.Viewport` | Vùng hiển thị messages (auto-scroll) |
| `ThreadPrimitive.Messages` | Render danh sách messages |
| `MessagePrimitive.Root/Content` | Render 1 message (user hoặc AI) |
| `ComposerPrimitive.Root/Input/Send` | Ô nhập + nút gửi |
| `ActionBarPrimitive` | Nút reload / copy trên message |

**ctxh-chat.adapter.ts** là cầu nối giữa `@assistant-ui/react` và backend:

```typescript
// Adapter implements ChatModelAdapter interface
export const ctxhChatAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    // 1. Lấy tin nhắn cuối cùng của user
    // 2. Lấy sessionId từ metadata message trước (để tiếp tục hội thoại)
    // 3. POST /ctxh-chat/message { message, sessionId }
    // 4. Nhận response → giả lập streaming bằng cách yield từng token (16ms/token)
    // 5. Yield cuối cùng kèm metadata (sessionId, followUpSuggestions)
  }
};
```

> **Tại sao giả lập streaming?** Backend chưa hỗ trợ SSE (Server-Sent Events). Adapter nhận toàn bộ response rồi "nhỏ giọt" từng từ ra UI để tạo hiệu ứng typing tự nhiên (~60 ký tự/giây).

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
│       LLM chọn 1 trong 3 chiến lược tìm kiếm:
│       ┌─────────────────────┬───────────────────────────────────┐
│       │ search_with_filters │ Câu hỏi có tiêu chí cụ thể      │
│       │                     │ (thời gian, địa điểm, khoa, ...) │
│       ├─────────────────────┼───────────────────────────────────┤
│       │ search_semantic     │ Câu hỏi chung, tìm theo nghĩa   │
│       ├─────────────────────┼───────────────────────────────────┤
│       │ search_diverse      │ Muốn xem nhiều loại hoạt động    │
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

Staff Agent sử dụng **tool-calling loop** (tối đa 10 vòng lặp):

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

### 5.2 Bốn tools của Staff Agent

| Tool | Chức năng | Khi nào gọi |
|------|-----------|-------------|
| `search_my_activities` | Tìm hoạt động cán bộ đã tạo (lọc theo keyword/status) | "Hoạt động hiến máu của tôi" |
| `get_pending_participants` | Lấy danh sách SV chờ duyệt | "Ai đang chờ duyệt?" |
| `approve_and_notify` | Duyệt batch + gửi email | "Duyệt tất cả" |
| `create_activity` | Tạo hoạt động mới | "Tạo hoạt động mới tên là..." |

### 5.3 Quy trình bắt buộc khi duyệt

LLM được hướng dẫn qua prompt phải tuân thủ 3 bước:
1. **Xác định hoạt động** → hỏi xác nhận trước
2. **Lấy danh sách PENDING** → trình bày cho cán bộ
3. **Duyệt + gửi mail** → chỉ khi cán bộ đồng ý

→ LLM **không được** tự ý duyệt mà chưa hỏi cán bộ.

---

## 6. Backend — MCP (Model Context Protocol)

### MCP là gì?

MCP là chuẩn giao thức cho phép LLM gọi tools qua HTTP. Dự án có 2 MCP server:

| Server | Endpoint | Tools |
|--------|----------|-------|
| Student MCP | `POST /mcp/student/*` | extract-filters, search-activities, register-activity |
| Staff MCP | `POST /mcp/staff/*` | create-activity, query-managed-activities, auto-approve-notify |

### Cấu trúc file

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
│   └── nodemailer.service.ts         ← Gửi email notification
├── guards/
│   └── ctxh-permission.helper.ts     ← Kiểm tra quyền
├── types/
│   └── mcp-context.types.ts          ← Type definitions
└── ctxh-mcp.module.ts                ← NestJS module
```

> **Lưu ý:** Hiện tại chatbot chính (ChatbotWidget) sử dụng RAG pipeline + Staff Agent qua endpoint `/ctxh-chat/message`, **KHÔNG** trực tiếp gọi MCP endpoints. MCP servers được thiết kế cho các client khác (IDE plugins, CLI tools, hoặc external AI agents) muốn tương tác với hệ thống CTXH.

---

## 7. Vector Embedding & Sync

### 7.1 Embedding là gì?

**Embedding** = biểu diễn văn bản dưới dạng vector số (mảng 1024 số thực). Hai đoạn văn bản có nghĩa giống nhau → vector gần nhau → tìm được qua cosine similarity.

```
"Chiến dịch Mùa hè xanh tình nguyện"  →  [0.12, -0.34, 0.56, ...]  (1024 chiều)
"Hoạt động tình nguyện mùa hè"        →  [0.11, -0.33, 0.55, ...]  ← gần nhau!
"Bài toán tích phân"                   →  [0.89, 0.22, -0.71, ...]  ← xa!
```

### 7.2 Pipeline: Activity → Embedding

Khi một hoạt động CTXH được tạo/sửa/xóa trong database:

```
1. TypeORM Event
   Activity INSERT/UPDATE/DELETE
       ↓
2. CtxhActivitySubscriber (TypeORM EventSubscriber)
   afterInsert() / afterUpdate() / beforeRemove()
       ↓
3. EventEmitter2
   emit(ACTIVITY_EVENTS.CREATED / UPDATED / DELETED)
       ↓
4. CtxhVectorSyncService (@OnEvent listener)
   Kiểm tra: có thay đổi content fields không?
   (name, description, location, startDate, endDate, status)
   Nếu có → addUpsertJob() / addDeleteJob()
       ↓
5. BullMQ Queue ('vectorize_queue')
   Job được đẩy vào queue Redis
   Concurrency: 1 (xử lý tuần tự, tránh race condition)
       ↓
6. VectorIngestionProcessor (@Process)
   Nhận job → gọi ingestionService
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

### 7.3 Bảng ctxh_embeddings

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

### 7.4 Tìm kiếm Vector (3 phương pháp)

| Phương pháp | Service Method | Khi nào dùng |
|------------|----------------|-------------|
| **Semantic Search** | `similaritySearchWithScore()` | Câu hỏi chung, tìm theo nghĩa |
| **Filtered Search** | `similaritySearchWithMetadataFilters()` | Có tiêu chí cụ thể (khoa, ngày, địa điểm) |
| **MMR (Maximal Marginal Relevance)** | `maxMarginalRelevanceSearch()` | Muốn kết quả đa dạng, không trùng lặp |

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

## 8. LLM & Embedding Provider

### 8.1 Hệ thống toggle

Dự án hỗ trợ **2 provider**, chuyển đổi qua biến môi trường:

```
USE_LOCAL_MODEL_LLM=true        → Ollama (chạy local, Qwen model)
USE_LOCAL_MODEL_LLM=false       → Google Gemini (cloud API)

USE_LOCAL_MODEL_EMBEDDING=true  → Ollama (BGE-M3 model)
USE_LOCAL_MODEL_EMBEDDING=false → Google Gemini Embeddings
```

> **LLM và Embedding có thể dùng provider khác nhau.** Ví dụ: LLM = Gemini (cloud, chất lượng cao) + Embedding = Ollama (local, miễn phí).

### 8.2 Kiến trúc abstraction

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

### 8.3 Tại sao cần 2 provider?

| | Ollama (Local) | Gemini (Cloud) |
|---|---|----|
| **Chi phí** | Miễn phí | Tính theo token |
| **Tốc độ** | Phụ thuộc GPU server | Nhanh, ổn định |
| **Privacy** | Data không rời server | Data gửi lên Google |
| **Chất lượng** | Tốt (Qwen 7B+) | Rất tốt |
| **Khi nào dùng** | Development, self-hosted | Production, cần chất lượng cao |

---

## 9. Cây thư mục chi tiết

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
│                                          GET /ctxh-chat/memory/:sessionId
│                                          DELETE /ctxh-chat/memory/:sessionId
│
├── 📁 dto/                             ← Data Transfer Objects (request/response shapes)
│   ├── chat-request.dto.ts             ← { message, sessionId? }
│   ├── chat-response.dto.ts            ← { response, sources[], sessionId, followUpSuggestions }
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
│
├── 📁 processors/                      ← BullMQ job processors
│   └── vector-ingestion.processor.ts   ← Worker: xử lý upsert/delete/full_sync jobs
│
├── 📁 prompts/                         ← LLM prompt templates (QUAN TRỌNG!)
│   ├── ctxh-chat.prompts.ts            ← CTXH_RAG_PROMPT — prompt chính cho RAG
│   │                                      (system instructions, format rules, context injection)
│   ├── router-agent.prompt.ts          ← Intent detection + question rewriting
│   ├── filter-extraction.prompt.ts     ← Parse câu hỏi → structured filters
│   ├── tool-selector.prompt.ts         ← Chọn 1/3 search tools
│   ├── retrieval-verifier.prompt.ts    ← Khi 0 kết quả, đề xuất query fallback
│   └── index.ts
│
├── 📁 services/                        ← Business logic (PHẦN CHÍNH)
│   ├── universal-llm.service.ts        ← Abstraction LLM (Ollama ↔ Gemini)
│   ├── universal-embeddings.service.ts ← Abstraction Embedding
│   ├── langchain-vector-store.service.ts ← pgvector CRUD + 3 search methods
│   ├── langchain-memory.service.ts     ← Session history + lastMentionedActivity
│   ├── langchain-advanced-retriever.service.ts ← Advanced retrieval strategies
│   ├── ctxh-filter-extraction.service.ts ← NLU: câu hỏi → filters (dùng LLM)
│   ├── langchain-rag-chain.service.ts  ← ⭐ MAIN: RAG pipeline 8 bước
│   ├── staff-agent.service.ts          ← ⭐ Staff tool-calling agent
│   ├── langchain-ingestion.service.ts  ← Activity → embedding conversion
│   ├── ctxh-vector-sync.service.ts     ← Event listener → queue jobs
│   ├── user-context.service.ts         ← Lấy thông tin user (org, department)
│   ├── index.ts
│   └── 📁 __tests__/                  ← Unit tests (6 spec files)
│
├── 📁 subscribers/                     ← TypeORM event subscribers
│   └── ctxh-activity.subscriber.ts     ← Activity CRUD events → embedding sync
│
├── 📁 tools/                           ← LLM tool definitions
│   └── rag-tools.ts                    ← 3 search tools cho tool selector
│
└── ctxh-chat.module.ts                 ← NestJS module registration
```

### Backend — ctxh-mcp/

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
│   └── 📁 staff/                       ← 3 staff tools
├── 📁 notifications/
│   └── nodemailer.service.ts           ← Gửi email xác nhận
├── 📁 guards/
│   └── ctxh-permission.helper.ts       ← Check quyền CTXH
├── 📁 types/
│   └── mcp-context.types.ts
└── ctxh-mcp.module.ts
```

### Frontend — ctxh-chat/

```
frontend/src/features/ctxh-chat/
├── 📁 components/
│   ├── ChatbotWidget.tsx               ← Nút floating (bottom-right) + toggle popup
│   ├── ChatbotPopup.tsx                ← Chat UI chính (messages, input, suggestions)
│   ├── SourceCard.tsx                  ← Card hiển thị 1 source
│   └── SourceList.tsx                  ← List các source cards
├── 📁 runtime/
│   └── ctxh-chat.adapter.ts           ← ChatModelAdapter (POST → simulated streaming)
├── 📁 types/
│   └── chat.types.ts                  ← CtxhChatResponse, CtxhSource, MessageMetadata
├── 📁 pages/
│   └── CtxhChatPage.tsx               ← Full-screen chat (chưa route)
└── index.ts                           ← Barrel exports
```

---

## 10. Data Flow chi tiết

### 10.1 Student hỏi câu hỏi

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

**Tổng cộng: 3-4 LLM calls mỗi câu hỏi RAG_QUERY** (Router + Tool Selector + Filter Extraction + RAG Generation).

### 10.2 Activity thay đổi → Embedding cập nhật

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

## 11. Biến môi trường

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
```

---

## 12. Thuật ngữ

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
| **BullMQ** | Thư viện job queue dựa trên Redis |
| **Tool Calling** | LLM quyết định gọi function nào thay vì chỉ trả lời text |
| **Zod** | Thư viện TypeScript validate schema — dùng để ép LLM trả đúng format |
| **CTXH** | Công tác xã hội — hoạt động phục vụ cộng đồng bắt buộc cho sinh viên |
| **SessionId** | ID theo dõi hội thoại — cho phép chatbot nhớ context qua nhiều lượt |
| **Structured Output** | Buộc LLM trả JSON theo schema cụ thể (thay vì text tự do) |
| **Prompt Template** | Mẫu prompt với biến (placeholder) được inject lúc runtime |
| **Ingestion** | Quá trình đưa dữ liệu vào hệ thống (activity → chunking → embedding → store) |

---

## Quick Start cho Developer mới

1. **Đọc prompts trước** — folder `backend/src/ctxh-chat/prompts/` là nơi quyết định hành vi AI. Bắt đầu với `router-agent.prompt.ts` rồi `ctxh-chat.prompts.ts`.

2. **Trace 1 request** — Đặt breakpoint trong `CtxhChatController.sendMessage()`, gửi 1 tin nhắn từ chatbot, follow qua từng step.

3. **Test local** — Set `USE_LOCAL_MODEL_LLM=false` + `GEMINI_API_KEY=...` để test nhanh mà không cần cài Ollama.

4. **Xem logs** — Service có logging chi tiết. Tìm `this.logger` trong RAG chain service để xem pipeline đang chạy step nào.

5. **Thay đổi hành vi AI** — 90% thay đổi hành vi chỉ cần sửa file trong `prompts/`. Không cần sửa code logic.
