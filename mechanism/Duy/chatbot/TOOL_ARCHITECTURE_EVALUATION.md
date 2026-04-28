# ĐÁNH GIÁ KIẾN TRÚC TOOL — MCP vs LangChain Tool-Calling

> **Mục đích**: Phân tích cách chatbot hiện tại sử dụng tools, đánh giá việc KHÔNG dùng MCP protocol mà dùng LangChain DynamicStructuredTool / direct service calls có ổn không, và chỉ ra inconsistency trong kiến trúc.

---

## MỤC LỤC

1. [Hiện trạng: Ai dùng gì?](#1-hiện-trạng-ai-dùng-gì)
2. [Phân tích chi tiết từng flow](#2-phân-tích-chi-tiết-từng-flow)
3. [MCP Server — Tồn tại nhưng không ai gọi](#3-mcp-server--tồn-tại-nhưng-không-ai-gọi)
4. [Đánh giá: Cách hiện tại có ổn không?](#4-đánh-giá-cách-hiện-tại-có-ổn-không)
5. [Inconsistency trong kiến trúc](#5-inconsistency-trong-kiến-trúc)
6. [So sánh 3 kiến trúc tool](#6-so-sánh-3-kiến-trúc-tool)
7. [Kết luận & Khuyến nghị](#7-kết-luận--khuyến-nghị)

---

## 1. HIỆN TRẠNG: AI DÙNG GÌ?

### Bản đồ tool hiện tại

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CHATBOT SYSTEM                                │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    STUDENT FLOW (RAG Pipeline)                   │  │
│  │                                                                  │  │
│  │  [Controller] → new Date() → inject currentDate vào prompt      │  │
│  │       ↓                                                          │  │
│  │  [Router Agent] → LLM.withStructuredOutput() → intent           │  │
│  │       ↓                                                          │  │
│  │  [Tool Selector] → LLM.bindTools(RAG_TOOLS) → chọn 1 tool      │  │
│  │       ↓                                                          │  │
│  │  [switch/case] → GỌI TRỰC TIẾP service method (KHÔNG qua tool) │  │
│  │       ↓                                                          │  │
│  │  [Generation] → LLM generate response từ context                │  │
│  │       ↓                                                          │  │
│  │  [Controller] → participationService.registerSelf() (nếu ĐK)   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    STAFF FLOW (Agent Loop)                       │  │
│  │                                                                  │  │
│  │  [Controller] → new Date() → inject currentDate vào prompt      │  │
│  │       ↓                                                          │  │
│  │  [Agent] → LLM.bindTools(9 custom + MCP tools)                  │  │
│  │       ↓                                                          │  │
│  │  [Loop max 10] → LLM chọn tool → execute tool.func() → feedback │  │
│  │       ↓                                                          │  │
│  │  [DynamicStructuredTool] → gọi NestJS services trực tiếp        │  │
│  │  [DynamicTool (MCP)]     → gọi PostgresMcpClient.callTool()     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │              MCP SERVERS (TỒN TẠI NHƯNG KHÔNG AI GỌI)          │  │
│  │                                                                  │  │
│  │  Student MCP Server (/mcp/student) → 3 tools                    │  │
│  │  Staff MCP Server   (/mcp/staff)   → 3 tools                    │  │
│  │  → Chờ external clients (Claude Desktop, Cursor,...)            │  │
│  │  → Frontend KHÔNG gọi, Backend KHÔNG gọi                        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │              POSTGRES MCP CLIENT (DUY NHẤT dùng MCP thật)       │  │
│  │                                                                  │  │
│  │  NestJS Backend → SSE Transport → crystaldba/postgres-mcp       │  │
│  │  → executeSql(query) → parse Python repr → trả về rows          │  │
│  │  → Wrap thành DynamicTool[] → inject vào Staff Agent tools      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Tóm tắt nhanh

| Component | Dùng gì? | Dùng MCP? |
|-----------|----------|-----------|
| Biết ngày hiện tại | `new Date()` ở Controller | ❌ Không |
| Router Agent (phân loại intent) | `LLM.withStructuredOutput()` | ❌ Không |
| Tool Selector (chọn search strategy) | `LLM.bindTools()` + `switch/case` | ❌ Không (chỉ dùng tool schema để LLM chọn, rồi tự execute) |
| Tìm kiếm vector | `vectorStoreService.similaritySearch()` trực tiếp | ❌ Không |
| Filter extraction | `filterExtractionService.extractFilters()` trực tiếp | ❌ Không |
| SQL fallback | `PostgresMcpClient.executeSql()` | ✅ **CÓ** — duy nhất |
| Đăng ký hoạt động (SV) | `participationService.registerSelf()` ở Controller | ❌ Không |
| Staff tools (9 tools) | `DynamicStructuredTool` → gọi NestJS services | ❌ Không (LangChain, không phải MCP) |
| Staff MCP tools (filtered) | `DynamicTool` wrapping Postgres MCP | ✅ CÓ (gián tiếp) |

---

## 2. PHÂN TÍCH CHI TIẾT TỪNG FLOW

### 2.1. Student Flow — "Fake Tool Calling"

Đây là điểm **đáng chú ý nhất** của kiến trúc.

#### Tool definitions là placeholder

```typescript
// rag-tools.ts
export const filteredSearchTool = new DynamicStructuredTool({
  name: 'search_with_filters',
  description: 'Tìm kiếm hoạt động CTXH khi câu hỏi có điều kiện lọc cụ thể...',
  schema: SearchToolSchema,
  func: async () => '[]',  // ⚠️ PLACEHOLDER — KHÔNG BAO GIỜ ĐƯỢC GỌI
});
```

**Tất cả 4 RAG tools đều có `func: async () => '[]'`** — tức là tool function KHÔNG BAO GIỜ chạy.

#### Flow thực tế

```
1. LLM.bindTools([4 RAG_TOOLS])         → LLM biết có 4 tools
2. LLM nhận câu hỏi                     → LLM chọn 1 tool (trả về tool_calls)
3. Code đọc tool_calls[0].name          → Lấy tên tool LLM đã chọn
4. switch (selectedTool) {               → MANUAL execution bằng switch/case
     case 'search_with_filters':
       return this.retrieveDocuments();  → Gọi trực tiếp service method
     case 'search_semantic':
       return this.vectorStoreService.similaritySearch();
     ...
   }
```

**Nhận xét**: Đây KHÔNG phải tool calling thật sự. Đây là **"LLM-as-classifier"** — dùng tool schema như một cách structured để LLM phân loại câu hỏi thuộc strategy nào, rồi code tự execute.

#### Đánh giá cách này

| Tiêu chí | Đánh giá |
|-----------|----------|
| **Hoạt động đúng?** | ✅ Có — LLM chọn strategy phù hợp dựa trên tool description |
| **An toàn?** | ✅ Tốt hơn — code kiểm soát hoàn toàn execution, LLM chỉ chọn |
| **Performance?** | ✅ Tốt — 1 lần LLM call, không overhead tool execution |
| **Đúng khái niệm "tool calling"?** | ❌ KHÔNG — tool.func không bao giờ chạy |
| **Confusing cho người đọc code?** | ⚠️ CÓ — tạo DynamicStructuredTool nhưng func rỗng |
| **Hội đồng có thể hỏi?** | ⚠️ "Tại sao tool có func rỗng?" |

#### Thay thế sạch hơn

Nếu chỉ cần LLM phân loại, có thể dùng:
- `LLM.withStructuredOutput()` + Zod enum → không cần tạo fake tools
- Hoặc đặt func thật vào tools → dùng tool calling loop giống Staff Agent

---

### 2.2. Staff Flow — Tool Calling thật (LangChain Agent Loop)

#### Flow thực tế

```
1. buildTools() → 9 DynamicStructuredTool + Postgres MCP DynamicTools
2. LLM.bindTools(allTools)
3. Loop (max 10 iterations):
   a. LLM invoke → response có tool_calls[]
   b. Nếu không có tool_calls → break (trả lời cuối)
   c. Với mỗi tool_call:
      - Tìm tool trong toolMap
      - Gọi tool.func(args) → kết quả thực
      - Push ToolMessage vào messages
   d. Quay lại bước a (LLM xem kết quả, quyết định gọi tiếp hay trả lời)
```

**Đây LÀ tool calling thật sự** — ReAct pattern (Reason → Act → Observe → Repeat).

#### Đánh giá cách này

| Tiêu chí | Đánh giá |
|-----------|----------|
| **Hoạt động đúng?** | ✅ Có — multi-step reasoning hoạt động tốt |
| **An toàn?** | ⚠️ Trung bình — LLM quyết định gọi tool nào, có thể gọi sai |
| **Performance?** | ⚠️ Chậm — multiple LLM calls trong loop (2-5 iterations) |
| **Đúng khái niệm?** | ✅ Hoàn toàn — standard LangChain Agent pattern |
| **Dùng MCP?** | ❌ KHÔNG — dùng LangChain DynamicStructuredTool |
| **Dùng MCP ở đâu?** | Chỉ Postgres MCP tools (mcp_execute_sql, mcp_list_objects) được wrap thành DynamicTool |

---

### 2.3. Postgres MCP Client — MCP thật duy nhất

Đây là chỗ DUY NHẤT trong toàn hệ thống mà MCP protocol thực sự được sử dụng:

```
NestJS Backend
    → SSE Transport (HTTP)
    → crystaldba/postgres-mcp server (Docker container, port 8000)
    → execute_sql tool
    → Trả về Python repr format
    → Parse thành JSON rows
```

#### Cách dùng:

1. **Trực tiếp** (service method):
   ```typescript
   // mcp-sql-fallback.service.ts
   const rows = await this.postgresMcpClient.executeSqlRows(sql);
   ```

2. **Gián tiếp** (wrap thành LangChain tool cho Staff Agent):
   ```typescript
   // postgres-mcp-client.service.ts
   getLangChainTools(): DynamicTool[]  // → inject vào Staff Agent
   ```

#### Đánh giá

| Tiêu chí | Đánh giá |
|-----------|----------|
| **Có cần MCP cho việc này?** | ⚠️ **Tranh cãi được** — TypeORM query builder cũng làm được |
| **Lợi thế MCP?** | ✅ LLM generate SQL tự nhiên → MCP execute → không cần build query |
| **Bất lợi MCP?** | ❌ Phụ thuộc Docker container, parse Python repr, SSE overhead |
| **An toàn?** | ⚠️ SQL string interpolation, regex-based blocking |

---

## 3. MCP SERVER — TỒN TẠI NHƯNG KHÔNG AI GỌI

### Student MCP Server (`/mcp/student`)

```
Endpoint: POST /mcp/student (StreamableHTTPServerTransport)
Tools:
  1. extract_activity_filters → gọi CtxhFilterExtractionService
  2. search_activities → gọi LangChainVectorStoreService
  3. register_activity → gọi ParticipationService.registerSelf()
```

### Staff MCP Server (`/mcp/staff`)

```
Endpoint: POST /mcp/staff (StreamableHTTPServerTransport)
Tools:
  1. query_managed_activities → SQL query qua DataSource
  2. create_activity → gọi ActivitiesService
  3. auto_approve_and_notify → gọi ParticipationService + MailerService
```

### Ai gọi?

| Client | Gọi Student MCP? | Gọi Staff MCP? |
|--------|-------------------|-----------------|
| Frontend (React) | ❌ KHÔNG | ❌ KHÔNG |
| Backend RAG Pipeline | ❌ KHÔNG (gọi services trực tiếp) | ❌ KHÔNG |
| Backend Staff Agent | ❌ KHÔNG (dùng LangChain tools) | ❌ KHÔNG |
| Claude Desktop | ❌ Chưa config | ❌ Chưa config |
| Cursor / VS Code | ❌ Chưa config | ❌ Chưa config |
| External clients | ❌ Chưa ai dùng | ❌ Chưa ai dùng |

**Kết luận: MCP Servers HIỆN TẠI = dead code.** Không ai gọi, không ai dùng.

### Tại sao tồn tại?

Có 2 khả năng:
1. **Future-proofing**: Chuẩn bị cho khi Claude Desktop / Cursor / external AI agents muốn kết nối
2. **Proof of concept**: Demo rằng hệ thống "support MCP standard"

---

## 4. ĐÁNH GIÁ: CÁCH HIỆN TẠI CÓ ỔN KHÔNG?

### 4.1. Student Flow (LLM-as-classifier + direct service calls) — ✅ ỔN

| Khía cạnh | Đánh giá | Giải thích |
|-----------|----------|------------|
| **Correctness** | ✅ Đúng | LLM chọn strategy → code execute → kết quả chính xác |
| **Performance** | ✅ Tốt | 1 LLM call cho tool selection (vs tool-calling loop nhiều call) |
| **Safety** | ✅ Tốt | Code kiểm soát execution — LLM không tự gọi được gì |
| **Maintainability** | ⚠️ Trung bình | switch/case cần update khi thêm tool mới |
| **Testability** | ✅ Tốt | Dễ test từng service method riêng |

**Lý do ổn**: Student flow đơn giản — chỉ cần **chọn 1 trong 4 strategy** rồi execute. Không cần multi-step reasoning. Dùng tool-calling loop (như Staff) sẽ overkill và chậm hơn.

**Điểm trừ**: Fake DynamicStructuredTool (`func: async () => '[]'`) gây confusion. Nên refactor thành:
```typescript
// SẠCH HƠN: Dùng structured output thay vì fake tools
const SearchStrategySchema = z.object({
  strategy: z.enum(['search_with_filters', 'search_semantic', 'search_diverse', 'list_activities_sql']),
});
const result = await llm.withStructuredOutput(SearchStrategySchema).invoke(prompt);
```

### 4.2. Staff Flow (LangChain Agent Loop) — ✅ ỔN nhưng có trade-off

| Khía cạnh | Đánh giá | Giải thích |
|-----------|----------|------------|
| **Correctness** | ✅ Đúng | Multi-step reasoning cho workflow phức tạp (lookup → confirm → create) |
| **Performance** | ⚠️ Chậm | 2-5 LLM calls mỗi request (loop iterations) |
| **Safety** | ⚠️ Trung bình | LLM quyết định gọi tool nào → có thể gọi sai |
| **Maintainability** | ✅ Tốt | Thêm tool = thêm 1 buildXxxTool() method |
| **Testability** | ✅ Tốt | Mỗi tool function test được riêng |

**Lý do ổn**: Staff workflow THỰC SỰ cần multi-step (lookup category → lookup org → confirm → create activity). Agent loop phù hợp cho use case này.

**Điểm trừ**: Không dùng MCP protocol — nhưng **không cần MCP** vì tools chạy trong cùng process.

### 4.3. Postgres MCP Client — ⚠️ CÓ THỂ THAY THẾ NHƯNG KHÔNG CẦN

| Khía cạnh | Đánh giá | Giải thích |
|-----------|----------|------------|
| **Correctness** | ✅ Đúng | SQL execute + parse hoạt động |
| **Performance** | ⚠️ Overhead | SSE transport + Python repr parsing + Docker container |
| **Safety** | ⚠️ Trung bình | SQL injection risk, regex-based blocking |
| **Necessity** | ⚠️ Tranh cãi | TypeORM raw query cũng làm được |
| **Value** | ✅ Có | Tách biệt SQL execution khỏi app logic, demo MCP integration |

---

## 5. INCONSISTENCY TRONG KIẾN TRÚC

### 5.1. ❌ "Nói dùng MCP nhưng thực tế không dùng"

**Vấn đề lớn nhất**: Hệ thống có **2 bộ MCP tools hoàn chỉnh** (Student + Staff servers) nhưng **KHÔNG AI GỌI**.

```
Student MCP Server: 3 tools → 0 callers
Staff MCP Server:   3 tools → 0 callers
─────────────────────────────────
Tổng: 6 MCP tools → 0% utilization
```

Đồng thời, Staff Agent tạo riêng **9 DynamicStructuredTool** làm CHÍNH XÁC CÙNG VIỆC mà MCP tools làm (search, create, approve), nhưng bằng LangChain thay vì MCP.

**Hậu quả**: 
- Code duplicated (2 nơi implement cùng logic)
- MCP Server maintain overhead nhưng không dùng
- Hội đồng hỏi "MCP server dùng ở đâu?" → khó trả lời

### 5.2. ❌ Student vs Staff — 2 kiến trúc tool KHÁC NHAU

| | Student | Staff |
|---|---------|-------|
| **Pattern** | LLM-as-classifier | Agent loop (ReAct) |
| **Tool calling** | Fake (func rỗng, switch/case) | Thật (func có logic, loop feedback) |
| **Execution** | 1 LLM call → manual dispatch | 2-5 LLM calls → tool loop |
| **Actions** | Đăng ký ở Controller, không qua tool | Mọi action qua tool |
| **MCP** | Không dùng (có server nhưng frontend không gọi) | Không dùng MCP server (dùng LangChain tools) |

**Nhận xét**: 2 flows dùng 2 pattern HOÀN TOÀN KHÁC NHAU. Không nhất quán nhưng **có lý do**: Student flow đơn giản (1 action: search) → classifier đủ. Staff flow phức tạp (multi-step) → cần agent loop.

### 5.3. ❌ Đăng ký hoạt động — logic ở CONTROLLER, không ở tool

```typescript
// ctxh-chat.controller.ts
if (response.intent === 'REGISTER_ACTIVITY' && response.registrationTarget) {
  await this.participationService.registerSelf(activityId, userId);
}
```

Đăng ký KHÔNG phải 1 tool trong RAG pipeline. Nó là **side effect** xử lý ở controller AFTER pipeline chạy xong.

**Vấn đề**: 
- RAG service trả về `registrationTarget` → controller tự gọi `registerSelf()`
- LLM KHÔNG BIẾT kết quả đăng ký thành công hay thất bại (response đã generate rồi)
- Controller phải **sửa lại response text** sau khi đăng ký:

```typescript
// Controller phải chèn thêm vào response
response.response += '\n\n✅ Đăng ký thành công!';
// hoặc
response.response += '\n\n❌ Lỗi: Hoạt động đã đầy.';
```

→ AI response bị **patch thủ công** ở controller → không tự nhiên.

### 5.4. ❌ Ngày giờ — hardcode inject, không phải tool

```typescript
// Controller
const now = new Date();
const currentDate = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
```

- AI KHÔNG TỰ biết ngày hiện tại → phải được "cho biết" qua prompt injection
- Nếu prompt dài → `currentDate` có thể bị LLM "quên" ở giữa context
- Không có tool `get_current_datetime` → AI không thể tự query

**Đánh giá**: ✅ **Cách này vẫn ổn** — hầu hết RAG systems đều inject datetime vào prompt. Tạo tool riêng cho việc này là overkill.

---

## 6. SO SÁNH 3 KIẾN TRÚC TOOL

### Option A: Hiện tại (LangChain tools + direct services) — ĐANG DÙNG

```
Frontend → POST /ctxh-chat/message → Controller → RAG/Agent Service
           → LangChain DynamicStructuredTool → NestJS Services → DB
```

| Pros | Cons |
|------|------|
| ✅ Đơn giản, 1 HTTP call | ❌ Tight coupling (tools = service wrappers) |
| ✅ Fast (no protocol overhead) | ❌ MCP server dead code |
| ✅ Full control over execution | ❌ Student fake tool calling |
| ✅ Easy to debug | ❌ 2 patterns khác nhau (student vs staff) |

### Option B: Full MCP (Frontend → MCP Server → Tools)

```
Frontend → MCP Client SDK → POST /mcp/student → MCP Server → Tools → Services → DB
```

| Pros | Cons |
|------|------|
| ✅ Chuẩn MCP protocol | ❌ Phức tạp hơn nhiều |
| ✅ External clients support (Claude, Cursor) | ❌ Frontend phải implement MCP client |
| ✅ Stateful sessions (MCP protocol) | ❌ Overhead: serialization, HTTP, parsing |
| ✅ Consistent architecture | ❌ Overkill cho web chatbot |

### Option C: Hybrid (Giữ hiện tại + MCP cho external)

```
Frontend → POST /ctxh-chat/message → Controller → LangChain tools (GIỐNG HIỆN TẠI)
Claude Desktop → POST /mcp/student → MCP Server → Tools (CHO EXTERNAL CLIENTS)
```

| Pros | Cons |
|------|------|
| ✅ Best of both worlds | ❌ 2 bộ code (LangChain tools + MCP tools) |
| ✅ Web app fast (no MCP overhead) | ❌ Logic duplicated |
| ✅ External clients supported | ❌ Phải maintain cả 2 |
| ✅ Không break existing code | |

**Hiện tại đang ở Option C** nhưng MCP side chưa có ai dùng → thực tế là Option A.

---

## 7. KẾT LUẬN & KHUYẾN NGHỊ

### Verdict: Cách hiện tại CÓ ỔN — nhưng cần "nói thật" với hội đồng

#### ✅ Những gì ỔN

1. **Staff Agent dùng LangChain tool-calling loop** — đúng pattern, multi-step reasoning hoạt động tốt cho workflow phức tạp (lookup → confirm → create/approve)

2. **Student flow dùng LLM-as-classifier** — pragmatic choice, performance tốt hơn full tool loop cho use case đơn giản

3. **Postgres MCP Client** — MCP protocol thật sự, có giá trị cho dynamic SQL execution

4. **Direct service calls** — nhanh hơn, an toàn hơn (code kiểm soát execution, không phải LLM)

5. **Ngày giờ inject từ controller** — standard practice, không cần tool riêng

#### ⚠️ Những gì CẦN SỬA hoặc GIẢI THÍCH

| # | Vấn đề | Mức độ | Hành động |
|---|--------|--------|-----------|
| 1 | Student RAG_TOOLS có `func: () => '[]'` (fake) | 🟡 | Refactor thành `withStructuredOutput` hoặc giải thích rõ đây là classifier |
| 2 | MCP Server (Student + Staff) = dead code | 🟡 | Xóa đi hoặc demo external client dùng |
| 3 | Đăng ký ở controller thay vì tool | 🟡 | Chuyển thành tool trong pipeline hoặc giải thích trade-off |
| 4 | 2 patterns khác nhau (student vs staff) | ⚪ | Giải thích lý do: complexity khác nhau → pattern khác nhau |
| 5 | Logic duplicate (LangChain tools ≈ MCP tools) | ⚪ | Giải thích: LangChain cho internal, MCP cho external |

#### Câu trả lời cho hội đồng

**"Tại sao không dùng MCP tools mà dùng LangChain tools?"**

> "Em dùng **2 tầng tool khác nhau** cho 2 mục đích:
> 
> 1. **LangChain DynamicStructuredTool** cho internal chatbot — vì tools chạy TRONG CÙNG process với backend NestJS. Gọi trực tiếp service method nhanh hơn, an toàn hơn, không cần serialization overhead của MCP protocol.
>
> 2. **MCP Server** expose ra ngoài cho external AI clients (Claude Desktop, Cursor IDE) — chuẩn bị cho tương lai khi các AI assistant khác muốn tương tác với hệ thống CTXH.
>
> Lý do không dùng MCP cho internal chatbot: MCP designed cho **cross-process / cross-network** communication. Khi client và server cùng 1 NestJS app, dùng MCP = thêm overhead không cần thiết (HTTP transport, JSON-RPC serialization, connection management)."

**"Vậy AI có dùng tool gì không?"**

> "Có. Staff Agent dùng **LangChain function calling** — LLM tự chọn tool, gọi tool.func(), nhận kết quả, rồi quyết định bước tiếp theo. Đây là **ReAct Agent pattern** chuẩn. Còn Student flow dùng LLM để **phân loại search strategy** (1 trong 4), rồi code tự thực thi strategy đó. Cả 2 đều leverage LLM tool-calling capability, chỉ khác ở mức độ tự chủ của AI."

**"Tại sao không dùng MCP tool `get_current_datetime`?"**

> "Ngày giờ được inject vào system prompt từ controller — đây là cách standard trong RAG systems (giống ChatGPT cũng inject current date vào system prompt). Tạo tool riêng sẽ tốn thêm 1 LLM call chỉ để lấy thông tin mà backend đã biết sẵn — lãng phí latency và API cost."
