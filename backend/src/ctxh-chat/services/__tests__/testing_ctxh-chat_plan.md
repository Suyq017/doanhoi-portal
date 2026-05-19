Để lập kế hoạch viết unit test, tôi cần xem lại các services: 

Read [](file:///d%3A/hcmut/internship/doanhoi-portal/backend/src/ctxh-chat/services/langchain-vector-store.service.ts)

Read [](file:///d%3A/hcmut/internship/doanhoi-portal/backend/src/ctxh-chat/services/langchain-memory.service.ts#1-1), lines 1 to 200

Read [](file:///d%3A/hcmut/internship/doanhoi-portal/backend/src/ctxh-chat/services/langchain-advanced-retriever.service.ts#1-1), lines 1 to 200

Read [](file:///d%3A/hcmut/internship/doanhoi-portal/backend/src/ctxh-chat/services/langchain-ingestion.service.ts#1-1), lines 1 to 150

Dựa trên phân tích các services, đây là kế hoạch viết unit test:

---

# 📋 KẾ HOẠCH VIẾT UNIT TEST CHO CTXH-CHAT MODULE

## 🎯 **TỔNG QUAN**

| Service | Số Test Cases | Độ ưu tiên | Độ phức tạp |
|---------|---------------|------------|-------------|
| `LangChainMemoryService` | 12 | Cao | Thấp |
| `LangChainVectorStoreService` | 10 | Cao | Trung bình |
| `LangChainRagChainService` | 8 | Cao | Cao |
| `LangChainIngestionService` | 10 | Trung bình | Trung bình |
| `LangChainAdvancedRetrieverService` | 8 | Thấp | Cao |

---

## 📁 **CẤU TRÚC TEST FILES**

```
services/__tests__/
├── langchain-memory.service.spec.ts
├── langchain-vector-store.service.spec.ts
├── langchain-rag-chain.service.spec.ts
├── langchain-ingestion.service.spec.ts
├── langchain-advanced-retriever.service.spec.ts
├── mocks/
│   ├── config.service.mock.ts
│   ├── vector-store.mock.ts
│   └── repository.mock.ts
└── README.md
```

---

## 1️⃣ **LangChainMemoryService Tests**

**File:** `langchain-memory.service.spec.ts`

### Test Cases:

| # | Test Name | Mô tả |
|---|-----------|-------|
| 1 | `should create memory for new session` | Tạo memory mới cho session ID mới |
| 2 | `should reuse existing memory for same session` | Trả về memory đã tồn tại |
| 3 | `should save interaction correctly` | Lưu user message và AI response |
| 4 | `should get formatted history` | Trả về lịch sử dạng string formatted |
| 5 | `should get raw messages` | Trả về array BaseMessage |
| 6 | `should clear memory for session` | Xóa memory của session |
| 7 | `should return empty for non-existent session` | Trả về empty khi session không tồn tại |
| 8 | `should get session metadata` | Trả về metadata (turnCount, lastAccessed) |
| 9 | `should get active sessions list` | Liệt kê các sessions đang active |
| 10 | `should cleanup old memories` | Xóa memories quá TTL |
| 11 | `should trim memory if exceeds max messages` | Cắt bớt messages cũ |
| 12 | `should get stats correctly` | Trả về statistics |

### Mock Requirements:
- `ConfigService` - trả về test config values
- `BufferMemory` - mock LangChain BufferMemory class

---

## 2️⃣ **LangChainVectorStoreService Tests**

**File:** `langchain-vector-store.service.spec.ts`

### Test Cases:

| # | Test Name | Mô tả |
|---|-----------|-------|
| 1 | `should initialize vector store on module init` | Init khi USE_LANGCHAIN=true |
| 2 | `should skip initialization when disabled` | Skip khi USE_LANGCHAIN=false |
| 3 | `should perform similarity search` | Tìm kiếm tương tự |
| 4 | `should perform similarity search with scores` | Tìm kiếm với điểm số |
| 5 | `should add documents to vector store` | Thêm documents |
| 6 | `should get retriever` | Trả về VectorStoreRetriever |
| 7 | `should perform MMR search` | Maximum Marginal Relevance search |
| 8 | `should throw error when not initialized` | Lỗi khi chưa init |
| 9 | `should check initialization status` | isInitialized() hoạt động đúng |
| 10 | `should ensure initialized before operations` | Auto-init nếu chưa init |

### Mock Requirements:
- `ConfigService` - DB config và LangChain config
- `PGVectorStore` - mock @langchain/community
- `GoogleGenerativeAIEmbeddings` - mock embeddings

---

## 3️⃣ **LangChainRagChainService Tests**

**File:** `langchain-rag-chain.service.spec.ts`

### Test Cases:

| # | Test Name | Mô tả |
|---|-----------|-------|
| 1 | `should initialize chains on module init` | Init chains khi enabled |
| 2 | `should skip initialization when disabled` | Skip khi disabled |
| 3 | `should invoke RAG chain with question` | Trả về response và sources |
| 4 | `should include chat history in context` | Sử dụng history nếu có |
| 5 | `should rewrite contextual questions` | Rewrite question khi có history |
| 6 | `should save interaction to memory` | Lưu vào memory sau invoke |
| 7 | `should stream RAG response` | Stream response từng chunk |
| 8 | `should handle errors gracefully` | Xử lý lỗi đúng cách |

### Mock Requirements:
- `ConfigService`
- `LangChainVectorStoreService`
- `LangChainMemoryService`
- `ChatGoogleGenerativeAI` - mock LLM
- `RunnableSequence` - mock chain

---

## 4️⃣ **LangChainIngestionService Tests**

**File:** `langchain-ingestion.service.spec.ts`

### Test Cases:

| # | Test Name | Mô tả |
|---|-----------|-------|
| 1 | `should run full ingestion pipeline` | Ingest tất cả activities |
| 2 | `should handle empty activities list` | Xử lý khi không có activities |
| 3 | `should process in batches` | Chia thành batches |
| 4 | `should run incremental update` | Update activities mới |
| 5 | `should process single activity` | Xử lý 1 activity |
| 6 | `should delete activity embeddings` | Xóa embeddings của activity |
| 7 | `should get ingestion stats` | Trả về statistics |
| 8 | `should perform health check` | Health check trả về đúng status |
| 9 | `should prepare documents correctly` | Format documents đúng |
| 10 | `should handle batch errors` | Tiếp tục khi batch lỗi |

### Mock Requirements:
- `ConfigService`
- `LangChainVectorStoreService`
- `Repository<CtxhActivity>` - TypeORM repository
- `Repository<CtxhEmbedding>` - TypeORM repository

---

## 5️⃣ **LangChainAdvancedRetrieverService Tests**

**File:** `langchain-advanced-retriever.service.spec.ts`

### Test Cases:

| # | Test Name | Mô tả |
|---|-----------|-------|
| 1 | `should create multi-query retriever` | Tạo MultiQueryRetriever |
| 2 | `should perform multi-query search` | Tìm kiếm với query variations |
| 3 | `should fallback on multi-query error` | Fallback khi lỗi |
| 4 | `should perform hybrid search` | Kết hợp semantic + MMR |
| 5 | `should rank and combine results` | Xếp hạng kết quả |
| 6 | `should deduplicate results` | Loại bỏ trùng lặp |
| 7 | `should apply search weights` | Áp dụng weights đúng |
| 8 | `should handle missing MultiQueryRetriever` | Xử lý khi không có class |

### Mock Requirements:
- `ConfigService`
- `LangChainVectorStoreService`
- `MultiQueryRetriever` - mock retriever
- `ChatGoogleGenerativeAI` - mock LLM

---

## 🔧 **MOCK FILES**

### **mocks/config.service.mock.ts**
```typescript
export const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config = {
      USE_LANGCHAIN: 'true',
      GEMINI_API_KEY: 'test-api-key',
      RAG_MAX_SESSIONS: 100,
      RAG_SESSION_TTL_MS: 1800000,
      RAG_MAX_MESSAGES_PER_SESSION: 20,
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      // ...
    };
    return config[key] ?? defaultValue;
  }),
};
```

### **mocks/vector-store.mock.ts**
```typescript
export const mockVectorStore = {
  similaritySearch: jest.fn(),
  similaritySearchWithScore: jest.fn(),
  addDocuments: jest.fn(),
  maxMarginalRelevanceSearch: jest.fn(),
  asRetriever: jest.fn(),
};
```

### **mocks/repository.mock.ts**
```typescript
export const mockActivityRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  delete: jest.fn(),
};

export const mockEmbeddingRepository = {
  count: jest.fn(),
  clear: jest.fn(),
  delete: jest.fn(),
  findOne: jest.fn(),
};
```

---

## 📅 **TIMELINE THỰC HIỆN**

| Phase | Task | Thời gian |
|-------|------|-----------|
| 1 | Setup mock files và test utilities | 1 giờ |
| 2 | LangChainMemoryService tests | 2 giờ |
| 3 | LangChainVectorStoreService tests | 2 giờ |
| 4 | LangChainIngestionService tests | 2 giờ |
| 5 | LangChainRagChainService tests | 3 giờ |
| 6 | LangChainAdvancedRetrieverService tests | 2 giờ |
| 7 | Review & refactor | 1 giờ |

**Tổng:** ~13 giờ (~2 ngày làm việc)

---

## 🎯 **TEST COVERAGE TARGET**

| Metric | Target |
|--------|--------|
| Statements | ≥ 80% |
| Branches | ≥ 75% |
| Functions | ≥ 85% |
| Lines | ≥ 80% |

---

## 🚀 **COMMANDS**

```bash
# Chạy tất cả tests trong ctxh-chat module
npm run test -- --testPathPattern=ctxh-chat

# Chạy test với coverage
npm run test:cov -- --testPathPattern=ctxh-chat

# Chạy test cụ thể
npm run test -- langchain-memory.service.spec.ts

# Watch mode
npm run test:watch -- --testPathPattern=ctxh-chat
```

---

## ⚠️ **LƯU Ý QUAN TRỌNG**

1. **Mock LangChain modules** - Sử dụng `jest.mock()` để mock các modules từ `@langchain/*`
2. **Async/Await** - Hầu hết methods đều async, cần test với `async/await`
3. **Error handling** - Test cả happy path và error cases
4. **Isolation** - Mỗi test phải độc lập, reset mocks trước mỗi test
5. **TypeORM repositories** - Mock với `getRepositoryToken()`

Bạn muốn tôi bắt đầu implement tests theo kế hoạch này không?