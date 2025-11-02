# Kế Hoạch Triển Khai RAG Chatbot cho CTXH

## 📋 Tổng Quan Hệ Thống

**Mục tiêu:** Xây dựng chatbot RAG cho phép sinh viên hỏi đáp về các hoạt động công tác xã hội (CTXH)

**Công nghệ:**
- Backend: NestJS + TypeScript
- Vector Database: PostgreSQL + pgVector
- RAG Framework: LangChain.js
- LLM: OpenAI/Anthropic/Local LLM

---

## 🎯 PHẦN 1: TĂNG CƯỜNG DỮ LIỆU (DATA INGESTION)

### Bước 1: Thiết Kế Database Schema

#### 1.1. Tạo Extension và Bảng Vector

**Cần làm:**
- Enable `pgvector` extension trong PostgreSQL
- Tạo bảng `ctxh_embeddings` để lưu vectors
- Thiết lập indexes cho vector search (HNSW hoặc IVFFlat)

**Schema bảng `ctxh_embeddings`:**
```
- id (uuid)
- activity_id (uuid) - FK to ctxh_activity
- content_text (text) - Văn bản đã được chuẩn bị
- embedding (vector) - Vector embedding
- chunk_index (integer) - Thứ tự chunk
- metadata (jsonb) - Thông tin bổ sung
- created_at, updated_at
```

**Indexes cần tạo:**
- Vector similarity index (cosine/L2)
- Activity ID index
- Metadata GIN index

---

### Bước 2: Trích Xuất và Chuẩn Bị Dữ Liệu

#### 2.1. Service: CtxhDataPreparationService

**Nhiệm vụ:**
- Query dữ liệu từ bảng `ctxh_activity`
- Join với `ctxh_category` và `organization` để lấy thông tin đầy đủ
- Lọc chỉ lấy activities có status ACTIVE hoặc COMPLETED
- Format dữ liệu thành văn bản có cấu trúc

**Dữ liệu cần trích xuất từ mỗi activity:**
- Tên hoạt động (name)
- Mô tả chi tiết (description)
- Danh mục (category.name)
- Tổ chức (organization.name)
- Ngày bắt đầu - kết thúc (start_date, end_date)
- Tổng số ngày CTXH (total_days)
- Địa điểm (location)

**Format văn bản chuẩn:**
```
Cấu trúc template:
"Tên hoạt động: [name]
Mô tả: [description]
Danh mục: [category]
Tổ chức: [organization]
Thời gian: Từ [start_date] đến [end_date]
Ngày CTXH được cấp: [total_days] ngày
Địa điểm: [location]"
```

#### 2.2. Xử lý Trigger/Event

**Tự động cập nhật embeddings khi:**
- Có activity mới được tạo (status: ACTIVE)
- Activity được cập nhật (name, description, dates, location)
- Activity bị xóa → Xóa embeddings tương ứng

**Cơ chế:**
- Event listener trên `ctxh_activity` entity
- Hook vào lifecycle: afterInsert, afterUpdate, afterRemove
- Gọi embedding service để xử lý

---

### Bước 3: Phân Đoạn (Chunking)

#### 3.1. Service: CtxhChunkingService

**Chiến lược chunking:**
- **Option 1: Activity-level chunking** (Khuyến nghị)
  - Mỗi activity = 1 chunk
  - Phù hợp vì mỗi activity đã có thông tin đầy đủ và ngắn gọn
  - Không cần chia nhỏ thêm

- **Option 2: Field-based chunking** (Nếu description quá dài)
  - Chia description thành nhiều chunks
  - Mỗi chunk giữ context (tên activity, metadata)
  - Overlap giữa các chunks: 50-100 ký tự

**Quy tắc:**
- Max chunk size: 500-1000 tokens
- Giữ nguyên cấu trúc thông tin quan trọng trong mỗi chunk
- Thêm metadata để trace back về activity gốc

**Output:**
```typescript
{
  activityId: string,
  chunks: [
    {
      index: number,
      text: string,
      metadata: {
        activityName: string,
        categoryName: string,
        organizationName: string,
        startDate: string,
        endDate: string,
        totalDays: number,
        location: string
      }
    }
  ]
}
```

---

### Bước 4: Vector Hóa (Embedding)

#### 4.1. Service: EmbeddingService

**Setup:**
- Chọn embedding model (OpenAI text-embedding-3-small/large hoặc local model)
- Khởi tạo LangChain embeddings instance
- Config API keys và parameters

**Xử lý:**
- Nhận chunks từ ChunkingService
- Gọi embedding API/model để convert text → vector
- Dimension: 1536 (OpenAI) hoặc 768/384 (local models)
- Batch processing: 10-50 chunks mỗi lần để tối ưu

**Caching:**
- Cache embeddings đã tạo để tránh tính toán lại
- Key: hash của content_text
- Kiểm tra cache trước khi gọi API

**Error handling:**
- Retry logic với exponential backoff
- Fallback mechanism nếu API fail
- Log errors để debug

---

### Bước 5: Lưu Trữ Vector

#### 5.1. Service: VectorStoreService

**Nhiệm vụ:**
- Insert embeddings vào bảng `ctxh_embeddings`
- Lưu kèm metadata đầy đủ
- Đảm bảo transactional consistency

**Batch insert:**
- Insert nhiều embeddings cùng lúc
- Sử dụng transaction để đảm bảo atomic
- Validate dữ liệu trước khi insert

**Update strategy:**
- Khi activity update → Xóa embeddings cũ → Tạo embeddings mới
- Hoặc: Soft delete (thêm cột is_active)
- Maintain version history nếu cần audit trail

**Optimization:**
- Bulk insert cho hiệu suất cao
- Index optimization sau khi insert batch lớn
- Vacuum và analyze bảng định kỳ

---

### Bước 6: Pipeline Tổng Hợp

#### 6.1. Service: CtxhIngestionPipeline

**Orchestration:**
- Kết hợp tất cả services trên thành 1 pipeline
- Xử lý theo thứ tự: Prepare → Chunk → Embed → Store
- Progress tracking và logging

**Chạy pipeline:**
- **Initial ingestion:** Xử lý toàn bộ activities hiện có (one-time)
- **Incremental updates:** Chỉ xử lý activities mới/cập nhật
- **Scheduled re-indexing:** Cron job chạy định kỳ (tuần/tháng)

**Monitoring:**
- Track số lượng activities đã xử lý
- Log errors và thành công
- Metrics: Processing time, success rate, API costs

---

## 🤖 PHẦN 2: XỬ LÝ TRUY VẤN & SINH VĂN BẢN (INFERENCE)

### Bước 7: Thiết Lập Backend Agent

#### 7.1. Module: CtxhChatModule

**Cấu trúc module:**
- Controllers: ChatController (REST API endpoints)
- Services: ChatAgentService, ConversationService, RetrievalService
- Guards: Auth guard, Rate limiting
- DTOs: ChatRequest, ChatResponse, Message

**Dependencies:**
- LangChain.js
- OpenAI/Anthropic SDK
- pgVector client
- Redis (cho session management)

---

### Bước 8: Retrieval Service

#### 8.1. Service: CtxhRetrievalService

**Vector similarity search:**
- Nhận câu hỏi từ user
- Embed câu hỏi thành vector (dùng cùng model với ingestion)
- Query `ctxh_embeddings` với cosine similarity
- Lấy top-k documents (k=3-5)

**Query optimization:**
- Filter theo metadata nếu cần:
  - Organization (nếu user thuộc tổ chức cụ thể)
  - Date range (chỉ lấy activities trong tương lai/gần đây)
  - Status (chỉ lấy ACTIVE)
- Reranking results để tăng độ chính xác

**Output:**
```typescript
{
  documents: [
    {
      content: string,
      metadata: object,
      score: number
    }
  ],
  totalResults: number
}
```

---

### Bước 9: Xử Lý Ngữ Cảnh Hội Thoại

#### 9.1. Service: ConversationService

**Session Management:**
- Lưu conversation history trong Redis
- Key: sessionId hoặc userId
- TTL: 30 phút - 1 giờ

**Conversation structure:**
```typescript
{
  sessionId: string,
  userId: string,
  messages: [
    {
      role: 'user' | 'assistant',
      content: string,
      timestamp: Date
    }
  ],
  metadata: {
    startTime: Date,
    lastActive: Date,
    turnCount: number
  }
}
```

**Context window management:**
- Giữ N tin nhắn gần nhất (N=5-10)
- Summarize lịch sử cũ nếu quá dài
- Clear context khi user bắt đầu chủ đề mới

---

### Bước 10: Agent Executor

#### 10.1. Service: ChatAgentService

**LangChain Agent setup:**
- Khởi tạo LLM (GPT-4, Claude, v.v.)
- Tạo retriever từ VectorStore
- Setup RetrievalQA chain hoặc ConversationalRetrievalChain

**Prompt engineering:**
- System prompt: Định nghĩa role, persona của chatbot
- Context template: Cách format retrieved documents
- Few-shot examples: Ví dụ Q&A mẫu

**Example system prompt:**
```
"Bạn là trợ lý ảo chuyên tư vấn về các hoạt động công tác xã hội (CTXH) 
cho sinh viên. Nhiệm vụ của bạn là:
1. Trả lời câu hỏi về các hoạt động CTXH
2. Cung cấp thông tin chi tiết: thời gian, địa điểm, số ngày CTXH
3. Gợi ý các hoạt động phù hợp với nhu cầu sinh viên
4. Luôn lịch sự, chính xác và hữu ích

Chỉ sử dụng thông tin từ context được cung cấp. Nếu không có thông tin, 
hãy thông báo rõ ràng."
```

**Chain execution:**
1. Nhận user query
2. Load conversation history
3. Retrieve relevant documents
4. Format prompt với context + history + query
5. Call LLM
6. Parse và validate response
7. Save message vào history
8. Return response

---

### Bước 11: API Endpoints

#### 11.1. Controller: ChatController

**Endpoints cần có:**

**POST /api/chat/message**
- Gửi tin nhắn mới
- Input: `{ sessionId?, message: string }`
- Output: `{ sessionId, response: string, sources: [...] }`

**GET /api/chat/history/:sessionId**
- Lấy lịch sử hội thoại
- Output: `{ messages: [...], metadata }`

**DELETE /api/chat/session/:sessionId**
- Xóa session, clear history

**POST /api/chat/feedback**
- User feedback về response (thumbs up/down)
- Để cải thiện model sau này

---

### Bước 12: Response Enhancement

#### 12.1. Service: ResponseFormatterService

**Formatting:**
- Parse markdown từ LLM response
- Highlight thông tin quan trọng (dates, location, số ngày CTXH)
- Thêm citation/sources (links đến activities gốc)

**Source attribution:**
- Hiển thị documents được sử dụng
- Link đến trang chi tiết activity nếu có
- Metadata: organization, category

**Fallback responses:**
- Khi không tìm thấy documents phù hợp
- Khi LLM không chắc chắn
- Suggest các câu hỏi khác hoặc contact support

---

## 🔧 PHẦN 3: TÍCH HỢP VÀ TỐI ƯU

### Bước 13: Testing Strategy

**Unit tests:**
- Test từng service độc lập
- Mock dependencies (LLM, database)
- Test edge cases

**Integration tests:**
- Test full pipeline: Ingestion → Retrieval → Response
- Test với real data
- Validate output quality

**E2E tests:**
- Test user journey hoàn chỉnh
- Test conversation flow
- Test error scenarios

**Evaluation metrics:**
- Retrieval accuracy (precision, recall)
- Response quality (human evaluation)
- Latency (response time)
- Cost per query

---

### Bước 14: Monitoring & Observability

**Logging:**
- Log mọi user query và response
- Log retrieved documents và scores
- Log errors và exceptions

**Metrics tracking:**
- Query volume
- Average response time
- LLM token usage
- API costs
- Cache hit rate

**Alerting:**
- High error rate
- Slow response time
- API quota exceeded
- Database connection issues

---

### Bước 15: Optimization

**Performance:**
- Cache frequent queries
- Optimize vector search indexes
- Batch processing cho embedding
- Connection pooling

**Cost:**
- Monitor LLM API usage
- Implement rate limiting
- Use cheaper models cho simple queries
- Cache embeddings aggressively

**Quality:**
- A/B testing prompts
- Collect user feedback
- Retrain/fine-tune model nếu cần
- Update knowledge base thường xuyên

---

## 📅 Timeline Đề Xuất

**Phase 1: Data Ingestion (1-2 tuần)**
- Bước 1-6: Setup database, implement ingestion pipeline
- Initial indexing của toàn bộ activities

**Phase 2: RAG Implementation (2-3 tuần)**
- Bước 7-12: Implement chat agent, API endpoints
- Testing và fine-tuning prompts

**Phase 3: Polish & Deploy (1 tuần)**
- Bước 13-15: Testing, monitoring, optimization
- Production deployment

**Total: 4-6 tuần**

---

## 🛠️ Tech Stack Summary

**Backend:**
- NestJS + TypeScript
- TypeORM
- LangChain.js

**Database:**
- PostgreSQL + pgVector extension
- Redis (session management)

**AI/ML:**
- OpenAI API (GPT-4 + Embeddings)
- Hoặc: Anthropic Claude
- Hoặc: Local LLM (Llama, Mistral)

**Infrastructure:**
- Docker containers
- PM2 hoặc Kubernetes
- Nginx reverse proxy

---

## ⚠️ Considerations

**Data Privacy:**
- Không lưu thông tin nhạy cảm trong embeddings
- Encrypt conversation history
- Tuân thủ GDPR/data protection laws

**Scalability:**
- Horizontal scaling cho API servers
- Database read replicas
- CDN cho static assets

**Maintenance:**
- Regular reindexing (monthly)
- Model version upgrades
- Prompt improvements based on feedback

---

**📌 Next Steps:**
1. Review và approve kế hoạch
2. Setup development environment
3. Implement Phase 1 (Data Ingestion)
4. Demo và iterate