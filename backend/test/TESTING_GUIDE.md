# Phase 2 Testing Strategy

## 📋 Testing Overview

This document outlines the comprehensive testing strategy for Phase 2 RAG implementation.

## 🎯 Testing Objectives

1. **Functional Correctness**: Verify all RAG pipeline components work as expected
2. **Performance**: Ensure system meets performance requirements (<100ms retrieval, <2s response)
3. **Quality**: Validate response accuracy and source attribution
4. **Reliability**: Test error handling and edge cases
5. **Scalability**: Verify concurrent user support (100+ sessions)

---

## 🧪 Test Categories

### 1. Unit Tests

**Coverage Target**: >80% code coverage

#### Retrieval Service Tests
- **File**: `ctxh-retrieval.service.spec.ts`
- **Focus**:
  - Vector similarity search with pgVector
  - MMR algorithm for result diversification
  - Filter application (organization, status, date, category)
  - Top-K retrieval
  - Performance: <100ms requirement

**Key Test Cases**:
```typescript
✓ Should retrieve relevant documents with similarity search
✓ Should apply top-k limit correctly
✓ Should apply similarity threshold filter
✓ Should apply organization/status/date filters
✓ Should handle empty results gracefully
✓ Should apply MMR when enabled
✓ Should complete retrieval in <100ms
✓ Should handle concurrent retrieval requests
```

#### Conversation Service Tests
- **File**: `conversation.service.spec.ts`
- **Focus**:
  - Redis session management
  - Message history tracking
  - Context window management
  - Automatic summarization with Gemini
  - TTL management

**Key Test Cases**:
```typescript
✓ Should create new session when none exists
✓ Should retrieve existing session from Redis
✓ Should update lastActive timestamp
✓ Should add user/assistant messages
✓ Should update token count
✓ Should trigger summarization when exceeding limits
✓ Should clear session from Redis
✓ Should handle concurrent session operations
```

#### Chat Service Tests
- **File**: `ctxh-chat.service.spec.ts`
- **Focus**:
  - Complete RAG pipeline integration
  - Prompt engineering
  - Response generation with Gemini
  - Error handling and fallbacks

**Key Test Cases**:
```typescript
✓ Should execute complete RAG pipeline successfully
✓ Should maintain conversation context across turns
✓ Should include retrieved documents in prompt
✓ Should pass conversation history to generation
✓ Should provide accurate responses with sources
✓ Should respond within 2 seconds
✓ Should handle concurrent requests
✓ Should handle retrieval/generation errors gracefully
```

#### Response Formatter Tests
- **File**: `response-formatter.service.spec.ts`
- **Focus**:
  - Markdown enhancement
  - Source attribution
  - Follow-up suggestion generation
  - Confidence scoring

**Key Test Cases**:
```typescript
✓ Should format response with markdown
✓ Should include source info with links
✓ Should generate follow-up suggestions
✓ Should calculate confidence score
✓ Should determine response type
✓ Should provide fallback response
```

---

### 2. Integration Tests

**Focus**: Verify component interactions

#### RAG Pipeline Integration
- **File**: `ctxh-chat.service.spec.ts` (integration section)
- **Tests**:
  - Retrieval → Generation → Formatting pipeline
  - Session → Chat → Response flow
  - Error propagation and handling
  - Performance end-to-end

---

### 3. End-to-End (E2E) Tests

**Focus**: Test complete user workflows through API

- **File**: `ctxh-chat-e2e.spec.ts`
- **Setup**: Uses TestingModule with real HTTP requests (supertest)

**Key Test Cases**:
```typescript
✓ POST /api/ctxh-chat/message - Send message and receive response
✓ Maintain conversation across multiple messages
✓ Validate request body
✓ Require authentication (JWT)
✓ GET /api/ctxh-chat/history/:sessionId - Retrieve history
✓ DELETE /api/ctxh-chat/session/:sessionId - Clear session
✓ POST /api/ctxh-chat/feedback - Submit feedback
✓ Rate limiting enforcement (30 req/min)
✓ Response time <2s (95th percentile)
✓ Handle 10+ concurrent users
✓ Error scenarios (invalid data, edge cases)
```

---

### 4. Performance Benchmarks

**Focus**: Measure and validate performance requirements

- **File**: `performance-benchmark.ts`
- **Metrics Tracked**:
  - Average, Min, Max, P50, P95, P99
  - Throughput (ops/sec)
  - Memory usage

**Benchmark Tests**:
```
1. Embedding Generation (768 dims)
   Target: <200ms average

2. Vector Search with pgVector
   Target: <100ms P95

3. Session Create/Retrieve (Redis)
   Target: <50ms P95

4. Complete RAG Pipeline
   Target: <2000ms P95

5. Concurrent User Simulation (50-100 users)
   Target: All complete successfully
```

**Acceptance Criteria**:
```
✅ Vector search P95 < 100ms
✅ RAG pipeline P95 < 2000ms
✅ Session ops P95 < 50ms
✅ Embedding P95 < 200ms
✅ Memory < 2GB under load
✅ 100+ concurrent sessions supported
```

---

## 🏃 Running Tests

### Run All Unit Tests
```bash
npm run test
# or
npm run test:watch  # Watch mode
```

### Run Specific Test Suite
```bash
npm test -- ctxh-retrieval.service.spec.ts
npm test -- conversation.service.spec.ts
npm test -- ctxh-chat.service.spec.ts
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run Performance Benchmarks
```bash
npx ts-node test/performance-benchmark.ts
```

### Generate Coverage Report
```bash
npm run test:cov
```

---

## 📊 Test Results Tracking

### Expected Coverage
- **Overall**: >80%
- **Services**: >85%
- **Controllers**: >75%
- **Critical paths**: 100%

### Performance Targets
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Vector Search (P95) | <100ms | TBD | 🔄 |
| RAG Pipeline (P95) | <2000ms | TBD | 🔄 |
| Session Ops (P95) | <50ms | TBD | 🔄 |
| Concurrent Users | 100+ | TBD | 🔄 |
| Memory Usage | <2GB | TBD | 🔄 |

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **Rate Limiting**: Depends on Redis; fallback to in-memory needed
2. **Test Database**: E2E tests need isolated test database
3. **Gemini API**: Tests use mocks; integration tests need real API (with rate limits)

### Future Improvements
1. Add load testing with Artillery/k6
2. Add stress testing for Redis/Postgres
3. Add monitoring integration tests
4. Add security penetration testing

---

## ✅ Test Checklist

### Before Production Deployment

- [ ] All unit tests passing (>80% coverage)
- [ ] All integration tests passing
- [ ] E2E tests passing with real API
- [ ] Performance benchmarks meet targets
- [ ] Load testing completed (100+ concurrent users)
- [ ] Memory leak testing (24h+ continuous operation)
- [ ] Error handling verified for all edge cases
- [ ] Rate limiting tested and working
- [ ] Security vulnerabilities scanned (0 critical)
- [ ] Documentation updated

---

## 📝 Test Data

### Sample Queries for Testing
```typescript
const testQueries = [
  'Có hoạt động CTXH nào về trồng cây không?',
  'Tôi cần bao nhiêu ngày CTXH để tốt nghiệp?',
  'Hoạt động tình nguyện dạy học ở đâu?',
  'Các hoạt động CTXH nào đang mở đăng ký?',
  'Làm thế nào để đăng ký tham gia CTXH?',
];
```

### Expected Response Structure
```typescript
{
  sessionId: string;
  response: string;
  sources: SourceInfo[];
  responseTime: number;
  timestamp: Date;
  followUpSuggestions?: string[];
  confidence?: number;
}
```

---

## 🔧 Test Configuration

### Environment Variables (.env.test)
```env
# Gemini API
GEMINI_API_KEY=your-test-api-key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=doanhoi_test
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=test-password

# RAG Configuration
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.7
MAX_CONVERSATION_HISTORY=20
MAX_CONVERSATION_TOKENS=4000
```

---

## 📚 References

- Jest Documentation: https://jestjs.io/
- NestJS Testing: https://docs.nestjs.com/fundamentals/testing
- Supertest: https://github.com/ladjs/supertest
- Performance Testing Best Practices: https://martinfowler.com/articles/practical-test-pyramid.html

---

*Last Updated: December 15, 2025*
*Phase: 2C - Integration & Testing*
