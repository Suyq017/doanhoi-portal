# Embedding Service Test Suite

Bộ test cases cho EmbeddingService sử dụng Google Gemini API.

## 📁 Cấu trúc Test Files

```
__tests__/
├── embedding.service.spec.ts          # Unit tests (mocked)
├── embedding.integration.spec.ts      # Integration tests (real API)
└── README.md                          # Documentation

test/
└── embedding-manual.test.ts           # Manual test script
```

## 🧪 Các Loại Tests

### 1. Unit Tests (`embedding.service.spec.ts`)
**Mục đích:** Test logic và behavior của service với mocked dependencies

**Chạy:**
```bash
npm test embedding.service.spec
```

**Coverage:**
- ✅ Single text embedding
- ✅ Batch embedding
- ✅ Cache functionality
- ✅ Error handling và retry mechanism
- ✅ Health checks
- ✅ Performance characteristics

**Không cần:**
- ❌ GEMINI_API_KEY
- ❌ Redis connection
- ❌ Internet

### 2. Integration Tests (`embedding.integration.spec.ts`)
**Mục đích:** Test với real Gemini API và Redis

**Yêu cầu:**
- ✅ GEMINI_API_KEY trong .env
- ✅ Redis đang chạy
- ✅ Internet connection

**Chạy:**
```bash
# Chạy tất cả integration tests
npm test embedding.integration.spec

# Chạy specific test
npm test -- embedding.integration.spec -t "should generate embedding using real Gemini API"
```

**Coverage:**
- ✅ Real API calls
- ✅ Cache performance
- ✅ Semantic similarity validation
- ✅ Vietnamese language support
- ✅ Performance benchmarks

**Warning:** ⚠️ Tests này sử dụng real API quota và có thể chậm

### 3. Manual Test Script (`embedding-manual.test.ts`)
**Mục đích:** Interactive testing với real CTXH data

**Chạy:**
```bash
cd backend
ts-node test/embedding-manual.test.ts
```

**Features:**
- 📊 Health check status
- 📝 Single embedding demo
- 💾 Cache performance comparison
- 📦 Batch processing demo
- 🔍 Semantic similarity analysis
- 🇻🇳 Vietnamese text handling
- ⚡ Performance benchmarks

**Output Example:**
```
🚀 Starting Manual Embedding Tests...

📊 Test 1: Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "status": "healthy",
  "gemini": { "available": true },
  "redis": { "available": true },
  "dimensions": 768,
  "model": "text-embedding-004"
}

📝 Test 2: Single Text Embedding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Input: "Hoạt động tình nguyện trồng cây xanh..."
✓ Generated embedding with 768 dimensions
✓ Duration: 1250ms
✓ First 5 values: [0.023456, -0.012345, 0.056789...]

...
```

## 🎯 Test Coverage Areas

### Functional Testing
- [x] Single text embedding generation
- [x] Batch embedding processing
- [x] Cache hit/miss scenarios
- [x] Error handling and retries
- [x] Health check status
- [x] Vietnamese text support
- [x] Special characters handling

### Performance Testing
- [x] Single embedding latency
- [x] Batch processing throughput
- [x] Cache performance improvement
- [x] Large batch handling (50+ items)
- [x] Memory usage patterns

### Quality Testing
- [x] Embedding dimension validation (768)
- [x] Semantic similarity preservation
- [x] Vietnamese language accuracy
- [x] Diacritics handling
- [x] Normalization verification

### Integration Testing
- [x] Real Gemini API calls
- [x] Redis cache operations
- [x] Network error recovery
- [x] Rate limiting compliance
- [x] API quota management

## 📊 Expected Test Results

### Unit Tests (Mocked)
```bash
PASS  src/ctxh-chat/services/__tests__/embedding.service.spec.ts
  EmbeddingService
    embedText - Single Embedding
      ✓ should generate embedding for a single text (15ms)
      ✓ should return cached embedding if available (8ms)
      ✓ should cache the embedding after generation (12ms)
      ✓ should handle empty text gracefully (5ms)
    embedBatch - Batch Embedding
      ✓ should generate embeddings for multiple texts (18ms)
      ✓ should use cached embeddings when available (10ms)
      ✓ should handle batch size limits correctly (25ms)
      ✓ should handle empty array (3ms)
    Error Handling
      ✓ should retry on API failure (45ms)
      ✓ should throw error after max retries (35ms)
      ✓ should handle malformed API response (12ms)
    Health Check
      ✓ should return healthy status (8ms)
      ✓ should return unhealthy status when Gemini API fails (10ms)
      ✓ should return unhealthy status when Redis fails (9ms)

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Time:        2.345s
```

### Integration Tests (Real API)
```bash
PASS  src/ctxh-chat/services/__tests__/embedding.integration.spec.ts
  EmbeddingService Integration Tests
    Real API Integration
      ✓ should generate embedding using real Gemini API (1250ms)
      ✓ should generate batch embeddings efficiently (2800ms)
      ✓ should use cache on subsequent requests (1500ms)
      ✓ should verify embeddings are semantically meaningful (3200ms)
    Vietnamese Language Support
      ✓ should handle Vietnamese text with diacritics (2500ms)
      ✓ should handle special Vietnamese characters (2100ms)
    Performance Benchmarks
      ✓ should handle large batch efficiently (8500ms)
      ✓ should measure cache performance improvement (4200ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Time:        26.05s
```

## 🚀 Quick Start

### Chạy tất cả tests
```bash
# Unit tests only (fast, no API calls)
npm test embedding.service.spec

# Integration tests (slow, real API)
npm test embedding.integration.spec

# Manual interactive test
ts-node test/embedding-manual.test.ts
```

### Chạy specific test case
```bash
# Unit test
npm test -- embedding.service.spec -t "should generate embedding for a single text"

# Integration test
npm test -- embedding.integration.spec -t "should handle Vietnamese text"
```

### Test với coverage report
```bash
npm test -- --coverage embedding.service.spec
```

## 🔧 Troubleshooting

### Test fails: "GEMINI_API_KEY not found"
**Solution:** 
```bash
# Add to backend/.env
GEMINI_API_KEY=your-api-key-here
```

### Test fails: "Redis connection refused"
**Solution:**
```bash
# Start Redis
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

### Integration tests timeout
**Solution:** Tăng timeout trong test file
```typescript
it('should test something', async () => {
  // ...
}, 30000); // 30 seconds timeout
```

### Rate limit errors
**Solution:** 
- Gemini free tier: 15 requests/minute
- Wait 60s between test runs
- Use mock tests for CI/CD

## 📈 Performance Benchmarks

### Expected Performance (với cache)
- Single embedding: **50-150ms**
- Batch (10 items): **1-2 seconds**
- Batch (50 items): **5-10 seconds**
- Cache hit: **<10ms**

### Expected Performance (no cache)
- Single embedding: **800-1500ms**
- Batch (10 items): **2-4 seconds**
- Batch (50 items): **10-15 seconds**

### Cache Speedup
- Typical: **10-20x faster**
- Best case: **100x faster** (Redis local)

## ✅ Pre-deployment Checklist

Trước khi deploy Phase 1 ra production, chạy:

```bash
# 1. Unit tests
npm test embedding.service.spec
# Expected: All tests pass in <5s

# 2. Integration tests
npm test embedding.integration.spec
# Expected: All tests pass in <30s

# 3. Manual verification
ts-node test/embedding-manual.test.ts
# Expected: All 7 tests complete successfully

# 4. Health check
curl http://localhost:3000/api/ctxh-chat/health/embeddings
# Expected: {"status": "healthy"}

# 5. Test ingestion
curl -X POST http://localhost:3000/api/ctxh-chat/ingestion/activity/{activity-id}
# Expected: 200 OK with embedding generated
```

## 📝 Notes

- Unit tests chạy nhanh, dùng cho CI/CD
- Integration tests chạy chậm, dùng cho pre-release validation
- Manual script để demo và troubleshooting
- Tất cả tests support Vietnamese language
- Semantic similarity tests validate embedding quality
- Performance benchmarks track regression

## 🔗 Related Documentation

- [Phase 1 Implementation Summary](../../../../mechanism/Duy/summaries/PHASE1_IMPLEMENTATION_SUMMARY.md)
- [Gemini Migration Guide](../../../../mechanism/Duy/summaries/GEMINI_MIGRATION_GUIDE.md)
- [EmbeddingService Source Code](../embedding.service.ts)
