# CTXH-Chat Services Unit Tests

## 📁 Cấu trúc thư mục

```
__tests__/
├── mocks/
│   ├── index.ts                  # Export tất cả mocks
│   ├── config.service.mock.ts    # Mock ConfigService
│   ├── vector-store.mock.ts      # Mock VectorStore và Documents  
│   └── repository.mock.ts        # Mock TypeORM repositories
├── langchain-memory.service.spec.ts
├── langchain-vector-store.service.spec.ts
├── langchain-rag-chain.service.spec.ts
├── langchain-ingestion.service.spec.ts
├── langchain-advanced-retriever.service.spec.ts
├── testing_ctxh-chat_plan.md     # Kế hoạch test chi tiết
├── CTXH_CHAT_TESTS.md            # Documentation (file này)
└── README.md                     # Legacy embedding tests docs
```

## 🚀 Chạy tests

```bash
# Chạy tất cả tests trong module ctxh-chat
npm run test -- --testPathPattern=ctxh-chat

# Chạy với coverage report
npm run test:cov -- --testPathPattern=ctxh-chat

# Chạy test cụ thể
npm run test -- langchain-memory.service.spec.ts
npm run test -- langchain-vector-store.service.spec.ts
npm run test -- langchain-ingestion.service.spec.ts
npm run test -- langchain-rag-chain.service.spec.ts
npm run test -- langchain-advanced-retriever.service.spec.ts

# Watch mode (auto-run on file changes)
npm run test:watch -- --testPathPattern=ctxh-chat

# Verbose output
npm run test -- --testPathPattern=ctxh-chat --verbose
```

## 📊 Coverage Target

| Metric     | Target | Description                    |
|------------|--------|--------------------------------|
| Statements | ≥ 80%  | Tỷ lệ statements được test     |
| Branches   | ≥ 75%  | Tỷ lệ branches (if/else) test  |
| Functions  | ≥ 85%  | Tỷ lệ functions được test      |
| Lines      | ≥ 80%  | Tỷ lệ lines được test          |

## 📋 Test Cases Overview

### LangChainMemoryService (12 tests)
- ✅ Create/reuse memory for sessions
- ✅ Save/get interactions
- ✅ Get formatted history và raw messages
- ✅ Clear memory
- ✅ Session metadata và stats
- ✅ Cleanup old memories

### LangChainVectorStoreService (10 tests)  
- ✅ Initialize vector store
- ✅ Similarity search với/không scores
- ✅ Add documents
- ✅ Get retriever
- ✅ MMR search
- ✅ Error handling

### LangChainIngestionService (12 tests)
- ✅ Full ingestion pipeline
- ✅ Incremental update
- ✅ Process single activity
- ✅ Delete activity embeddings
- ✅ Get stats và health check
- ✅ Batch processing và error handling

### LangChainRagChainService (14 tests)
- ✅ Initialize chains
- ✅ Invoke RAG chain
- ✅ Stream responses
- ✅ Include/exclude chat history
- ✅ MMR vs similarity search
- ✅ Auto-initialization

### LangChainAdvancedRetrieverService (12 tests)
- ✅ Multi-query retriever
- ✅ Hybrid search
- ✅ Result ranking và deduplication
- ✅ Contextual search
- ✅ Reranking
- ✅ Cache management

## ⚠️ Lưu ý quan trọng

### 1. Mock LangChain modules
Tất cả các modules từ `@langchain/*` đều được mock để tránh:
- Kết nối thực tới database
- Gọi API Google Gemini
- Dependencies external

### 2. Async/Await
Hầu hết methods đều async, sử dụng:
```typescript
it('should ...', async () => {
  await expect(service.method()).resolves.toBeDefined();
});
```

### 3. Reset mocks
Luôn reset mocks giữa các tests:
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### 4. TypeORM repositories
Mock repositories với `getRepositoryToken()`:
```typescript
{
  provide: getRepositoryToken(CtxhActivity),
  useValue: mockActivityRepository,
}
```

### 5. Interval cleanup
Services với `setInterval` cần cleanup:
```typescript
afterEach(() => {
  if (service['cleanupInterval']) {
    clearInterval(service['cleanupInterval']);
  }
});
```

## 🔧 Troubleshooting

### Test timeout
Nếu tests timeout, tăng timeout:
```typescript
jest.setTimeout(30000); // 30 seconds
```

### Mock not working
Đảm bảo mock được khai báo TRƯỚC import service:
```typescript
jest.mock('module-path', () => ({ ... }));
// Sau đó mới import service
```

### Memory leaks
Cleanup resources trong `afterEach` và `afterAll`.

## 📝 Thêm test mới

Khi thêm test case mới, tuân theo pattern:

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  
  beforeEach(async () => {
    // Setup
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something when condition', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await service.method(input);
      
      // Assert
      expect(result).toBeDefined();
    });
  });
});
```
