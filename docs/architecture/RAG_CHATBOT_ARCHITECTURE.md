# Kiến Trúc RAG Chatbot - Đoàn Hội Portal

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Tech Stack](#2-tech-stack)
3. [Luồng xử lý từ A đến Z](#3-luồng-xử-lý-từ-a-đến-z)
4. [Cơ chế RAG chi tiết](#4-cơ-chế-rag-chi-tiết)
5. [Database Schema](#5-database-schema)
6. [Hệ thống Prompt](#6-hệ-thống-prompt)
7. [MCP Integration](#7-mcp-integration)
8. [API Endpoints](#8-api-endpoints)
9. [Cấu hình & Biến môi trường](#9-cấu-hình--biến-môi-trường)
10. [Các tính năng thông minh](#10-các-tính-năng-thông-minh)
11. [Cấu trúc file](#11-cấu-trúc-file)

---

## 1. Tổng quan

Chatbot RAG (Retrieval-Augmented Generation) của Đoàn Hội Portal giúp sinh viên và cán bộ tra cứu thông tin về các hoạt động **Công Tác Xã Hội (CTXH)** tại Đại học Bách Khoa TP.HCM. Thay vì để LLM tự "bịa" câu trả lời, hệ thống **truy xuất dữ liệu thực** từ database trước, rồi mới đưa cho LLM để sinh câu trả lời.

### RAG là gì?

```
┌─────────────────────────────────────────────────────────┐
│                   RAG = 3 bước                          │
│                                                         │
│  ① Retrieval  ──►  Tìm tài liệu liên quan từ DB        │
│  ② Augmented  ──►  Đưa tài liệu vào prompt cho LLM     │
│  ③ Generation ──►  LLM sinh câu trả lời dựa trên đó    │
│                                                         │
│  Kết quả: Câu trả lời chính xác, có nguồn dẫn chứng   │
└─────────────────────────────────────────────────────────┘
```

**Tại sao dùng RAG thay vì chỉ dùng LLM?**

| Chỉ LLM | RAG + LLM |
|----------|-----------|
| Bịa thông tin (hallucination) | Trả lời dựa trên dữ liệu thực |
| Không cập nhật dữ liệu mới | Real-time từ database |
| Không có nguồn trích dẫn | Có source kèm theo |
| Không kiểm soát được nội dung | Chỉ trả lời trong phạm vi dữ liệu |

---

## 2. Tech Stack

### Sơ đồ tổng thể

```
┌──────────────┐     ┌────────────────────────────────────────────────┐
│   Frontend   │────►│                  Backend (NestJS)              │
│   (React)    │     │                                                │
│              │     │  ┌──────────┐  ┌────────────┐  ┌───────────┐  │
│  Chat UI     │     │  │  Router  │─►│  Retriever │─►│    LLM    │  │
│              │     │  │  Agent   │  │  (pgVector)│  │ Generator │  │
│              │     │  └──────────┘  └─────┬──────┘  └───────────┘  │
│              │     │                      │                         │
│              │     │              ┌───────▼───────┐                 │
│              │     │              │  PostgreSQL   │                 │
│              │     │              │  + pgVector   │                 │
│              │     │              └───────────────┘                 │
└──────────────┘     └────────────────────────────────────────────────┘
```

### Công nghệ sử dụng

| Thành phần | Công nghệ | Vai trò |
|-----------|-----------|---------|
| **Framework RAG** | LangChain.js | Orchestration: kết nối LLM, vector store, memory |
| **LLM (Local)** | Ollama + Qwen | Sinh câu trả lời (chạy local, miễn phí) |
| **LLM (Cloud)** | Google Gemini 2.0 Flash | Sinh câu trả lời (cloud, nhanh hơn) |
| **Embedding (Local)** | Ollama + BGE-M3 | Chuyển text → vector 1024 chiều |
| **Embedding (Cloud)** | Gemini Embeddings | Chuyển text → vector 1024 chiều |
| **Vector Store** | PostgreSQL + pgVector | Lưu & tìm kiếm vector tương tự |
| **Session Memory** | In-memory (Map) | Lưu lịch sử chat, TTL 30 phút |
| **Job Queue** | BullMQ (Redis) | Xử lý ingestion bất đồng bộ |
| **MCP** | Model Context Protocol v1.29 | Chuẩn giao tiếp Agent ↔ Tools |

---

## 3. Luồng xử lý từ A đến Z

### Khi sinh viên gửi câu hỏi: "Có hoạt động CTXH nào đang diễn ra ở cơ sở 1 không?"

```
Sinh viên gửi câu hỏi
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ BƯỚC 1: ROUTER AGENT — Phân loại ý định                      │
│                                                               │
│ Input:  "Có hoạt động CTXH nào đang diễn ra ở cơ sở 1 không?"│
│ Output: {                                                     │
│   rewrittenQuestion: "Hoạt động CTXH đang diễn ra tại CS1",  │
│   intent: "RAG_QUERY"                                        │
│ }                                                             │
│                                                               │
│ Các loại intent:                                              │
│ • RAG_QUERY          → Truy vấn thông tin hoạt động           │
│ • REGISTER_ACTIVITY  → Đăng ký hoạt động                     │
│ • GREETING           → Chào hỏi                              │
│ • CHITCHAT           → Hỏi ngoài phạm vi                     │
└───────────────────────┬───────────────────────────────────────┘
                        │ intent = RAG_QUERY
                        ▼
┌───────────────────────────────────────────────────────────────┐
│ BƯỚC 2: FILTER EXTRACTION — Trích xuất bộ lọc                │
│                                                               │
│ LLM đọc câu hỏi tiếng Việt và trích xuất:                    │
│ {                                                             │
│   status: "ongoing",           // "đang diễn ra"              │
│   locationRaw: "cơ sở 1",     // Địa điểm                    │
│   organizationKeywords: null,  // Không nói rõ khoa           │
│   dateRange: null              // Không nói rõ ngày           │
│ }                                                             │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│ BƯỚC 3: DYNAMIC TOOL SELECTION — Chọn chiến lược tìm kiếm    │
│                                                               │
│ LLM phân tích câu hỏi và chọn 1 trong 3 công cụ:             │
│                                                               │
│ • search_with_filters  ← Được chọn (vì có filter rõ ràng)    │
│   → Dùng SQL WHERE kết hợp vector similarity                 │
│                                                               │
│ • search_semantic                                             │
│   → Thuần vector similarity (câu hỏi mơ hồ)                 │
│                                                               │
│ • search_diverse                                              │
│   → MMR (Maximum Marginal Relevance) cho đa dạng kết quả     │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│ BƯỚC 4: RETRIEVAL — Truy xuất tài liệu                       │
│                                                               │
│ SQL được tạo ra:                                              │
│ SELECT * FROM ctxh_embeddings                                 │
│ WHERE metadata->>'status' != 'DRAFT'                          │
│   AND metadata->>'location' ILIKE '%cơ sở 1%'                │
│   AND (metadata->>'startDate')::date <= CURRENT_DATE          │
│   AND (metadata->>'endDate')::date >= CURRENT_DATE            │
│ ORDER BY (embedding <=> query_vector)                         │
│ LIMIT 5                                                       │
│                                                               │
│ Kết quả: 3 hoạt động phù hợp                                 │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│ BƯỚC 4.5: VERIFY & FALLBACK — Kiểm tra kết quả               │
│                                                               │
│ Nếu kết quả = 0:                                              │
│   → LLM Verifier đề xuất query thay thế                      │
│   → Thử tìm lại với query mới                                │
│   → Nếu vẫn 0 → trả lời "Không tìm thấy"                    │
│                                                               │
│ Nếu kết quả > 0: → Tiếp tục                                  │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│ BƯỚC 5: ORG INJECTION — Tự động thêm bộ lọc theo khoa        │
│                                                               │
│ Nếu sinh viên KHÔNG nói rõ khoa nào:                          │
│   → Hệ thống tự tìm khoa đào tạo của sinh viên               │
│   → Chạy song song: tìm theo khoa + tìm tổng                 │
│   → Ưu tiên hiển thị hoạt động của khoa sinh viên trước       │
│                                                               │
│ VD: Sinh viên khoa KTMT → hoạt động KTMT hiện trước          │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│ BƯỚC 6: CONTEXT FORMATTING — Chuẩn hóa dữ liệu               │
│                                                               │
│ Cho mỗi hoạt động tìm được:                                  │
│ • Chuyển ngày giờ sang múi giờ Việt Nam                       │
│ • Tính trạng thái real-time: đang diễn ra / sắp tới / đã kết │
│ • Cộng điểm ưu tiên nếu bắt đầu/kết thúc hôm nay            │
│   (+0.15 nếu bắt đầu hôm nay, +0.10 nếu kết thúc hôm nay)  │
│ • Format thành markdown kèm nguồn                             │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│ BƯỚC 7: LLM GENERATION — Sinh câu trả lời                    │
│                                                               │
│ Prompt = CTXH_RAG_PROMPT + {                                  │
│   question: "Hoạt động CTXH đang diễn ra tại CS1",           │
│   context: [3 hoạt động đã format],                           │
│   chat_history: [tin nhắn trước đó],                          │
│   current_date: "2026-04-19",                                 │
│   user_org_instruction: "Ưu tiên hoạt động khoa KTMT"        │
│ }                                                             │
│                                                               │
│ LLM sinh câu trả lời bằng tiếng Việt, liệt kê hoạt động     │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│ BƯỚC 8: POST-PROCESSING — Hậu xử lý                          │
│                                                               │
│ • Sinh 3 câu hỏi gợi ý tiếp theo                             │
│ • Tính confidence score:                                      │
│   - 0 nguồn → 0.3 (thấp)                                     │
│   - 1-2 nguồn → 0.5-0.7                                      │
│   - ≥3 nguồn → 0.9 (cao)                                     │
│ • Lưu vào session memory                                      │
│ • Ghi nhận hoạt động được nhắc đến gần nhất                   │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│ RESPONSE — Trả về cho Frontend                                │
│                                                               │
│ {                                                             │
│   response: "Hiện tại có 3 hoạt động CTXH đang diễn ra...",  │
│   sources: ["Tình nguyện mùa hè", "Hiến máu nhân đạo", ...],│
│   responseTime: 2100,                                         │
│   confidence: 0.9,                                            │
│   followUpSuggestions: [                                      │
│     "Chi tiết hoạt động Tình nguyện mùa hè?",                │
│     "Làm sao đăng ký hoạt động?",                            │
│     "Hoạt động nào nhiều ngày CTXH nhất?"                     │
│   ]                                                           │
│ }                                                             │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. Cơ chế RAG chi tiết

### 4.1. Embedding — Chuyển văn bản thành vector

**Embedding là gì?**

Embedding chuyển một đoạn văn bản thành một mảng số (vector) có 1024 chiều. Các đoạn văn bản có ý nghĩa giống nhau sẽ có vector gần nhau trong không gian đa chiều.

```
"Hoạt động tình nguyện mùa hè"  ──►  [0.12, -0.45, 0.87, ..., 0.33]  (1024 số)
"Chương trình tình nguyện hè"   ──►  [0.13, -0.44, 0.86, ..., 0.34]  (gần nhau!)
"Lịch thi cuối kỳ"             ──►  [0.91, 0.22, -0.15, ..., -0.78] (xa nhau!)
```

**Model sử dụng:**

| Mode | Model | Đặc điểm |
|------|-------|-----------|
| Local | BGE-M3 (qua Ollama) | Hỗ trợ đa ngôn ngữ, tốt với tiếng Việt, chạy offline |
| Cloud | Gemini Embeddings | Nhanh, chính xác, cần API key |

Cả hai đều tạo vector **1024 chiều**.

### 4.2. Vector Store — pgVector

Thay vì dùng database vector riêng (Pinecone, Weaviate...), hệ thống dùng **pgVector** — extension của PostgreSQL. Ưu điểm:

- Không cần thêm service riêng
- Dùng chung PostgreSQL đã có
- Hỗ trợ SQL filtering kết hợp vector search
- Index HNSW cho tìm kiếm nhanh

**Cách tìm kiếm:**

```sql
-- Cosine similarity: khoảng cách càng nhỏ = càng giống
SELECT content_text, metadata,
       (embedding <=> query_embedding) AS distance
FROM ctxh_embeddings
WHERE metadata->>'status' != 'DRAFT'
ORDER BY distance ASC
LIMIT 5;
```

Toán tử `<=>` tính **cosine distance** giữa 2 vector. Giá trị càng gần 0 = càng giống nhau.

### 4.3. Ingestion Pipeline — Nạp dữ liệu

Khi hoạt động CTXH được tạo/cập nhật, hệ thống chuyển nó thành embedding:

```
┌─────────────────────┐
│   ctxh_activity     │  ← Bảng hoạt động gốc
│   (PostgreSQL)      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│ Format thành văn bản:                        │
│                                              │
│ "Hoạt động: Tình nguyện mùa hè xanh         │
│  Mô tả: Chương trình tình nguyện tại...      │
│  Tổ chức: Đoàn khoa KTMT                     │
│  Thời gian: 01/06/2026 - 15/06/2026          │
│  Địa điểm: Tây Ninh                          │
│  Số ngày CTXH: 5                              │
│  Trạng thái: ACTIVE"                          │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│ Gọi Embedding Model                         │
│ BGE-M3 / Gemini → vector [1024 chiều]        │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│ Lưu vào ctxh_embeddings                      │
│                                              │
│ • content_text: văn bản gốc                   │
│ • embedding: vector(1024)                     │
│ • metadata: {                                 │
│     activityName, organizationName,           │
│     status, startDate, endDate,               │
│     totalDays, location, ...                  │
│   }                                           │
└─────────────────────────────────────────────┘
```

**3 chế độ ingestion:**

| Chế độ | Mô tả | Khi nào dùng |
|--------|--------|-------------|
| **Full** | Xóa toàn bộ embeddings, nạp lại tất cả | Setup ban đầu, reset |
| **Incremental** | Chỉ cập nhật hoạt động thay đổi gần đây | Chạy định kỳ |
| **Single** | Nạp 1 hoạt động cụ thể theo ID | Khi tạo/sửa 1 hoạt động |

### 4.4. Retrieval — Tìm kiếm thông minh

Hệ thống có **3 chiến lược tìm kiếm**, LLM tự chọn chiến lược phù hợp nhất:

#### a) `search_with_filters` — Tìm kết hợp filter + vector

Dùng khi câu hỏi có thông tin cụ thể (ngày, khoa, trạng thái...).

```
Câu hỏi: "Hoạt động đang diễn ra của khoa KTMT"
  │
  ├─ Filter SQL: status = ongoing AND org ILIKE '%KTMT%'
  └─ Vector: similarity search trên kết quả đã lọc
```

#### b) `search_semantic` — Thuần vector similarity

Dùng khi câu hỏi mơ hồ, không có filter rõ ràng.

```
Câu hỏi: "Hoạt động thú vị cho sinh viên năm nhất"
  │
  └─ Chỉ dùng cosine similarity, không filter
```

#### c) `search_diverse` — MMR (Maximum Marginal Relevance)

Dùng khi cần kết quả đa dạng, tránh trùng lặp.

```
Câu hỏi: "Liệt kê các loại hoạt động CTXH khác nhau"
  │
  └─ MMR: vừa giống câu hỏi, vừa khác nhau giữa các kết quả
```

---

## 5. Database Schema

### Bảng `ctxh_embeddings` — Lưu vector embeddings

```sql
CREATE TABLE ctxh_embeddings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES ctxh_activity(id),
    content_text TEXT NOT NULL,              -- Văn bản gốc
    embedding   vector(1024) NOT NULL,       -- Vector 1024 chiều
    chunk_index INTEGER DEFAULT 0,           -- Luôn = 0 (không chia chunk)
    metadata    JSONB,                       -- Thông tin phụ
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Index cho tìm kiếm vector nhanh (thuật toán HNSW)
CREATE INDEX idx_ctxh_embeddings_vector
    ON ctxh_embeddings USING hnsw (embedding vector_cosine_ops);

-- Index cho filter theo metadata
CREATE INDEX idx_ctxh_embeddings_metadata
    ON ctxh_embeddings USING gin (metadata);
```

**HNSW Index là gì?**
- Hierarchical Navigable Small World — thuật toán tìm nearest neighbors
- Nhanh hơn brute-force scan rất nhiều lần
- Trade-off: tốn thêm RAM & disk, nhưng query nhanh

### Bảng `ctxh_activity` — Hoạt động CTXH

```
id, name, description, category_id, organization_id
start_date, end_date, total_days (số ngày CTXH)
status: DRAFT | ACTIVE | COMPLETED | CANCELLED
requires_approval, max_participants, location
deleted_at, deleted_by (soft delete)
```

### Bảng `ctxh_participation` — Đăng ký tham gia

```
id, activity_id, student_id, student_code
status: PENDING | APPROVED | REGISTERED | COMPLETED | CANCELLED
actual_days (số ngày CTXH thực tế được)
```

---

## 6. Hệ thống Prompt

### 6.1. ROUTER_AGENT_PROMPT — Phân loại ý định

LLM nhận câu hỏi gốc và trả về:
- **rewrittenQuestion**: Câu hỏi được viết lại rõ ràng hơn
- **intent**: Loại ý định (RAG_QUERY, REGISTER_ACTIVITY, GREETING, CHITCHAT)

```
Ví dụ:
Input:  "ê có gì hay không?"
Output: { rewrittenQuestion: "Có hoạt động CTXH nào đáng chú ý không?", intent: "RAG_QUERY" }

Input:  "cho mình đăng ký cái hiến máu đi"
Output: { rewrittenQuestion: "Đăng ký hoạt động hiến máu", intent: "REGISTER_ACTIVITY" }

Input:  "hello"
Output: { rewrittenQuestion: "Xin chào", intent: "GREETING" }
```

### 6.2. FILTER_EXTRACTION_PROMPT — Trích xuất bộ lọc

LLM phân tích câu hỏi tiếng Việt và trích xuất các filter:

| Từ khóa tiếng Việt | Filter được trích xuất |
|---------------------|----------------------|
| "đang diễn ra" | `status: "ongoing"` |
| "sắp tới" | `status: "upcoming"` |
| "đã kết thúc" | `status: "ended"` |
| "khoa Máy tính" | `organizationKeywords: ["Máy tính"]` |
| "cơ sở 1", "CS1" | `locationRaw: "cơ sở 1"` |
| "tuần này" | `dateRange: { start: "2026-04-13", end: "2026-04-19" }` |
| "tháng 6" | `dateRange: { start: "2026-06-01", end: "2026-06-30" }` |

### 6.3. CTXH_RAG_PROMPT — Sinh câu trả lời

Prompt chính quy định:
- Vai trò: Chuyên gia CTXH Bách Khoa
- **CHỈ** trả lời dựa trên context được cung cấp
- Nếu context rỗng → trả lời đúng chuỗi: _"Hiện tại chưa có thông tin..."_
- **KHÔNG BAO GIỜ** bịa hoạt động
- Liệt kê **TẤT CẢ** hoạt động phù hợp, không chỉ top 1
- Dùng `current_date` để tính trạng thái real-time

### 6.4. RETRIEVAL_VERIFIER_PROMPT — Kiểm tra & fallback

Khi tìm kiếm trả về 0 kết quả, LLM Verifier:
- Phân tích tại sao không tìm thấy
- Đề xuất query thay thế (từ đồng nghĩa, bớt filter...)
- Hệ thống thử tìm lại với query mới

### 6.5. TOOL_SELECTOR_PROMPT — Chọn công cụ tìm kiếm

LLM phân tích câu hỏi và chọn chiến lược tìm kiếm tối ưu nhất trong 3 tool có sẵn.

---

## 7. MCP Integration

### MCP là gì?

**Model Context Protocol** — chuẩn giao tiếp giữa LLM Agent và các công cụ bên ngoài. Thay vì hard-code logic, Agent có thể gọi các tool được định nghĩa sẵn.

### Kiến trúc

```
┌──────────────────────────────────────────┐
│              LLM Agent                    │
│         (Claude / GPT / ...)              │
│                                           │
│  "Tôi muốn đăng ký hoạt động hiến máu"   │
│         │                                 │
│         ▼                                 │
│  Gọi tool: register_activity              │
│  Params: { activityName: "hiến máu" }     │
└──────────┬───────────────────────────────┘
           │ MCP Protocol (HTTP)
           ▼
┌──────────────────────────────────────────┐
│        MCP Server (Backend)               │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ Student Server (/api/mcp/student)   │  │
│  │                                     │  │
│  │ Tools:                              │  │
│  │ • extract_activity_filters          │  │
│  │ • search_activities                 │  │
│  │ • register_activity                 │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ Staff Server (/api/mcp/staff)       │  │
│  │                                     │  │
│  │ Tools:                              │  │
│  │ • query_managed_activities          │  │
│  │ • create_activity                   │  │
│  │ • auto_approve_and_notify           │  │
│  └─────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Đặc điểm:
- **Stateless**: Mỗi HTTP request tạo McpServer mới
- **Transport**: `StreamableHTTPServerTransport`
- **User Binding**: userId được truyền qua closure vào tool
- **Permissions**: Staff tools kiểm tra quyền `ctxh.activities.manage_participants`

---

## 8. API Endpoints

### Chat

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/api/ctxh-chat/message` | Gửi tin nhắn, nhận phản hồi |
| `GET` | `/api/ctxh-chat/stream` | SSE streaming response |

### Session Management

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/ctxh-chat/history/:sessionId` | Lấy lịch sử chat |
| `DELETE` | `/api/ctxh-chat/session/:sessionId` | Xóa session |

### Data Ingestion

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/api/ctxh-chat/ingestion/full` | Nạp lại toàn bộ |
| `POST` | `/api/ctxh-chat/ingestion/incremental` | Nạp thay đổi mới |
| `POST` | `/api/ctxh-chat/ingestion/activity/:id` | Nạp 1 hoạt động |
| `GET` | `/api/ctxh-chat/ingestion/stats` | Thống kê ingestion |

### Health & Monitoring

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/ctxh-chat/health` | Kiểm tra sức khỏe tổng |
| `GET` | `/api/ctxh-chat/health/models` | Trạng thái LLM |
| `GET` | `/api/ctxh-chat/health/vector-store` | Trạng thái pgVector |
| `GET` | `/api/ctxh-chat/stats/memory` | Thống kê session |

### MCP

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/api/mcp/student` | MCP server cho sinh viên |
| `POST` | `/api/mcp/staff` | MCP server cho cán bộ |

---

## 9. Cấu hình & Biến môi trường

### Chọn LLM

```env
# === Chế độ Local (Ollama) ===
USE_LOCAL_MODEL_LLM=true
USE_LOCAL_MODEL_EMBEDDING=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_LLM_MODEL=qwen              # Model LLM
OLLAMA_EMBEDDING_MODEL=bge-m3      # Model embedding

# === Chế độ Cloud (Gemini) ===
USE_LOCAL_MODEL_LLM=false
USE_LOCAL_MODEL_EMBEDDING=false
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-2.0-flash
```

### Tham số RAG

```env
RAG_TOP_K=5                  # Số tài liệu truy xuất tối đa
RAG_TEMPERATURE=0.3          # Độ sáng tạo của LLM (thấp = chính xác hơn)
RAG_SESSION_TTL_MS=1800000   # Thời gian sống session: 30 phút
RAG_MAX_SESSIONS=1000        # Số session tối đa đồng thời
```

### Giải thích tham số

| Tham số | Giá trị | Ý nghĩa |
|---------|---------|---------|
| `RAG_TOP_K=5` | 5 | Lấy tối đa 5 tài liệu giống nhất. Tăng → nhiều context hơn nhưng chậm hơn |
| `RAG_TEMPERATURE=0.3` | 0.3 | LLM ít sáng tạo, trả lời sát context. 0 = deterministic, 1 = rất sáng tạo |
| `RAG_SESSION_TTL_MS` | 30 phút | Sau 30 phút không chat → session bị xóa, tiết kiệm bộ nhớ |

---

## 10. Các tính năng thông minh

### 10.1. Org Injection — Tự động ưu tiên theo khoa

Khi sinh viên không nói rõ khoa, hệ thống:
1. Tra cứu khoa đào tạo của sinh viên từ DB
2. Chạy **song song** 2 query: tìm theo khoa + tìm tổng
3. Merge kết quả: hoạt động khoa sinh viên hiện **trước**

→ Sinh viên KTMT sẽ thấy hoạt động KTMT đầu tiên, dù không hỏi rõ.

### 10.2. Priority Boost — Ưu tiên sự kiện nóng

Hoạt động bắt đầu/kết thúc **hôm nay** được boost điểm:
- Bắt đầu hôm nay: **+0.15** (giảm cosine distance)
- Kết thúc hôm nay: **+0.10** (sắp hết hạn → ưu tiên)

→ Đảm bảo sự kiện urgent luôn xuất hiện đầu.

### 10.3. Retrieve-Then-Verify — Không bỏ sót

Khi tìm kiếm trả về 0 kết quả:
1. LLM Verifier phân tích nguyên nhân
2. Đề xuất query thay thế (từ đồng nghĩa, bớt filter)
3. Tìm lại lần 2
4. Nếu vẫn 0 → thông báo rõ ràng cho user

### 10.4. Dynamic Tool Selection — LLM tự chọn chiến lược

Thay vì hard-code 1 chiến lược tìm kiếm, LLM phân tích câu hỏi và tự chọn tool phù hợp nhất. Giúp tối ưu kết quả cho từng loại câu hỏi.

### 10.5. Structured Output — Type-safe với Zod

Tất cả output từ LLM đều được validate bằng **Zod schema**:
- Router output → `{ rewrittenQuestion: string, intent: enum }`
- Filter output → `{ status?: string, organizationKeywords?: string[], ... }`
- Verifier output → `{ shouldRetry: boolean, alternativeQuery?: string }`

→ Đảm bảo LLM trả về đúng format, không crash runtime.

### 10.6. Graceful Degradation — Không bao giờ crash

Mọi lời gọi LLM đều có fallback:
- Ollama offline → fallback sang Gemini (nếu có)
- LLM trả về lỗi → trả response mặc định
- Vector store lỗi → thông báo lỗi thân thiện

### 10.7. Session Cleanup — Tự dọn dẹp

- Session hết TTL (30 phút) → tự xóa khỏi memory
- Giới hạn tối đa 1000 session → tránh memory leak
- Chat history được giữ theo session, không persist vĩnh viễn

---

## 11. Cấu trúc file

```
backend/src/
├── ctxh-chat/                              # Module chatbot chính
│   ├── ctxh-chat.module.ts                 # Đăng ký module
│   ├── controllers/
│   │   └── ctxh-chat.controller.ts         # API endpoints
│   ├── services/
│   │   ├── langchain-rag-chain.service.ts          # [CORE] Orchestrator chính
│   │   ├── langchain-vector-store.service.ts       # Quản lý pgVector
│   │   ├── langchain-memory.service.ts             # Quản lý session
│   │   ├── ctxh-filter-extraction.service.ts       # Trích xuất filter từ câu hỏi
│   │   ├── langchain-ingestion.service.ts          # Pipeline nạp dữ liệu
│   │   ├── user-context.service.ts                 # Tra cứu khoa sinh viên
│   │   └── langchain-advanced-retriever.service.ts # Multi-query retrieval
│   ├── prompts/
│   │   ├── ctxh-chat.prompts.ts            # Prompt sinh câu trả lời
│   │   ├── router-agent.prompt.ts          # Prompt phân loại ý định
│   │   ├── filter-extraction.prompt.ts     # Prompt trích xuất filter
│   │   ├── retrieval-verifier.prompt.ts    # Prompt kiểm tra kết quả
│   │   └── tool-selector.prompt.ts         # Prompt chọn công cụ tìm kiếm
│   ├── dto/
│   │   ├── chat-request.dto.ts             # Input schema
│   │   ├── chat-response.dto.ts            # Output schema
│   │   ├── filter-extraction.dto.ts        # Zod schema cho filter
│   │   ├── router-output.dto.ts            # Zod schema cho router
│   │   └── verifier-output.dto.ts          # Zod schema cho verifier
│   └── config/
│       └── langchain.config.ts             # Khởi tạo LLM & Embeddings
│
├── ctxh-mcp/                               # Module MCP
│   ├── ctxh-mcp.module.ts
│   ├── controllers/
│   │   ├── student-mcp.controller.ts       # Endpoint MCP sinh viên
│   │   └── staff-mcp.controller.ts         # Endpoint MCP cán bộ
│   ├── servers/
│   │   ├── student.server.ts               # MCP server sinh viên
│   │   └── staff.server.ts                 # MCP server cán bộ
│   └── tools/
│       ├── student/
│       │   ├── extract-filters.tool.ts     # Tool trích xuất filter
│       │   ├── search-activities.tool.ts   # Tool tìm hoạt động
│       │   └── register-activity.tool.ts   # Tool đăng ký
│       └── staff/
│           ├── create-activity.tool.ts     # Tool tạo hoạt động
│           ├── query-managed-activities.tool.ts  # Tool query
│           └── auto-approve-notify.tool.ts       # Tool duyệt & thông báo
│
├── entities/
│   ├── ctxh-embedding.entity.ts            # Entity bảng vector
│   ├── ctxh-activity.entity.ts             # Entity hoạt động
│   ├── ctxh-participation.entity.ts        # Entity đăng ký
│   └── ctxh-category.entity.ts             # Entity danh mục
│
└── app.module.ts                           # Đăng ký CtxhChatModule, CtxhMcpModule
```

---

## Tóm tắt kiến trúc bằng 1 câu

> **Sinh viên hỏi → Router phân loại ý định → Filter Extraction trích lọc → LLM chọn chiến lược tìm kiếm → pgVector truy xuất tài liệu → Verifier kiểm tra → LLM sinh câu trả lời tiếng Việt dựa trên context thực → Trả về kèm nguồn & gợi ý.**
