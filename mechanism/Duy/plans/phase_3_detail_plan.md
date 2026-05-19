# KẾ HOẠCH CHI TIẾT PHASE 3: TÍCH HỢP & TỐI ƯU RAG CHATBOT

## 📋 TỔNG QUAN PHASE 3

**Thời gian dự kiến:** 14-21 ngày (3 tuần)
**Mục tiêu chính:** Hoàn thiện hệ thống RAG chatbot với testing, monitoring, optimization và production deployment

**Tiền đề:**
- ✅ Phase 1: Data Ingestion pipeline hoàn tất
- ✅ Phase 2: RAG Inference engine hoàn tất  
- 📦 Sẵn sàng để tích hợp, test và deploy production

---

## 🎯 MỤC TIÊU PHASE 3

### Mục tiêu chính:
1. **Testing Comprehensive** - Test toàn diện hệ thống RAG
2. **Production Monitoring** - Giám sát và theo dõi hiệu suất
3. **Performance Optimization** - Tối ưu hóa tốc độ và chi phí
4. **Production Deployment** - Triển khai production sẵn sàng

### Acceptance Criteria:
- [ ] Unit test coverage ≥ 80%
- [ ] Integration tests cho full RAG pipeline 
- [ ] E2E tests cho user journey hoàn chỉnh
- [ ] Monitoring dashboard hoạt động
- [ ] Response time < 3 giây cho 95% requests
- [ ] Cost monitoring và alerting
- [ ] Production deployment thành công
- [ ] Load testing với 100+ concurrent users

---

## 📅 TIMELINE CHI TIẾT

### **Week 1: Testing & Quality Assurance (7 ngày)**
- Ngày 1-2: Unit Testing Setup  
- Ngày 3-4: Integration Testing
- Ngày 5-6: E2E Testing & User Journey
- Ngày 7: RAG Quality Evaluation

### **Week 2: Monitoring & Observability (7 ngày)**
- Ngày 8-9: Metrics Collection Setup
- Ngày 10-11: Logging & Tracing Implementation  
- Ngày 12-13: Dashboards & Alerting
- Ngày 14: Performance Benchmarking

### **Week 3: Optimization & Production Deployment (7 ngày)**
- Ngày 15-16: Performance Optimization
- Ngày 17-18: Cost Optimization  
- Ngày 19-20: Production Deployment
- Ngày 21: Load Testing & Go-Live

---

## 🧪 WEEK 1: TESTING & QUALITY ASSURANCE

### Ngày 1-2: Unit Testing Setup

#### 1.1. Jest & Testing Infrastructure Setup

**Dependencies cần cài đặt:**
```bash
cd backend
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @nestjs/testing supertest @types/supertest
npm install --save-dev jest-mock-extended  # TypeScript-safe mocking
```

**Jest Configuration (jest.config.js):**
```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

#### 1.2. Test Utilities & Mocks Setup

**Test Setup (src/test/setup.ts):**
```typescript
// Mock external services
jest.mock('@langchain/openai');
jest.mock('redis');
jest.mock('typeorm');

// Test database setup
beforeAll(async () => {
  // Setup test database
});

afterAll(async () => {
  // Cleanup test database
});
```

**Mock Factories (src/test/factories/):**
- `embedding.factory.ts` - Mock embedding responses
- `activity.factory.ts` - Mock CTXH activity data
- `chat.factory.ts` - Mock chat interactions

#### 1.3. Core Service Unit Tests

**Testing Priority:**
1. **EmbeddingService** - Vector generation logic
2. **VectorStoreService** - Database operations  
3. **CtxhRetrievalService** - Similarity search
4. **ChatAgentService** - LLM interactions
5. **ConversationService** - Session management

**Example Test Structure:**
```typescript
// embedding.service.spec.ts
describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockOpenAI: jest.Mocked<OpenAIEmbeddings>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: OpenAIEmbeddings, useValue: mockOpenAI }
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
  });

  it('should generate embeddings for text', async () => {
    // Test embedding generation
  });

  it('should handle API errors gracefully', async () => {
    // Test error handling
  });

  it('should cache embeddings properly', async () => {
    // Test caching logic
  });
});
```

### Ngày 3-4: Integration Testing

#### 1.4. RAG Pipeline Integration Tests

**Test Full Pipeline:**
```typescript
describe('RAG Pipeline Integration', () => {
  let app: INestApplication;
  let embeddingService: EmbeddingService;
  let vectorStore: VectorStoreService;
  let retrievalService: CtxhRetrievalService;
  let chatAgent: ChatAgentService;

  beforeEach(async () => {
    // Setup test application with real database
    app = await createTestingApp();
  });

  it('should complete full ingestion pipeline', async () => {
    // 1. Create test CTXH activity
    const activity = await createTestActivity();
    
    // 2. Verify embedding generation
    const embeddings = await embeddingService.generateEmbeddings(activity);
    expect(embeddings).toBeDefined();
    
    // 3. Verify vector storage
    await vectorStore.storeEmbeddings(embeddings);
    
    // 4. Verify retrieval works
    const results = await retrievalService.similaritySearch('test query');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle query-to-response pipeline', async () => {
    // Test complete user query -> response flow
  });
});
```

#### 1.5. Database Integration Tests

**pgVector Tests:**
- Vector similarity search accuracy
- Index performance
- Concurrent operations
- Data consistency

**Redis Integration Tests:**
- Session storage/retrieval
- TTL behavior
- Connection pooling

### Ngày 5-6: E2E Testing & User Journey

#### 1.6. End-to-End API Tests

**Test User Scenarios:**
```typescript
describe('Chat API E2E', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await setupE2EApp();
  });

  it('should handle complete chat conversation', async () => {
    // 1. Start new conversation
    const response1 = await request(app.getHttpServer())
      .post('/api/chat/message')
      .send({ message: 'Tôi muốn tìm hoạt động CTXH về môi trường' })
      .expect(200);

    expect(response1.body.sessionId).toBeDefined();
    expect(response1.body.response).toContain('môi trường');
    expect(response1.body.sources).toHaveLength(3);

    // 2. Follow-up question with context
    const response2 = await request(app.getHttpServer())
      .post('/api/chat/message')
      .send({ 
        sessionId: response1.body.sessionId,
        message: 'Hoạt động nào diễn ra tháng 12?' 
      })
      .expect(200);

    expect(response2.body.response).toBeDefined();
    
    // 3. Get conversation history
    const history = await request(app.getHttpServer())
      .get(`/api/chat/history/${response1.body.sessionId}`)
      .expect(200);

    expect(history.body.messages).toHaveLength(4); // 2 user + 2 assistant
  });

  it('should handle edge cases gracefully', async () => {
    // Empty queries, long queries, special characters
  });
});
```

#### 1.7. Performance Testing

**Response Time Tests:**
- Single query performance
- Concurrent query handling  
- Memory usage monitoring
- Database connection limits

### Ngày 7: RAG Quality Evaluation

#### 1.8. RAG-Specific Quality Metrics

**Evaluation Framework:**
```typescript
interface RAGEvaluationMetrics {
  retrievalAccuracy: number;    // Precision/Recall of retrieved docs
  responseRelevance: number;    // LLM response quality
  citationAccuracy: number;     // Source attribution accuracy  
  conversationalConsistency: number; // Multi-turn coherence
}

class RAGEvaluator {
  async evaluateRetrieval(query: string, expectedDocs: string[]): Promise<number> {
    // Calculate precision@k, recall@k
  }

  async evaluateResponse(query: string, response: string, goldStandard: string): Promise<number> {
    // Use semantic similarity or BLEU score
  }

  async evaluateConversation(conversation: Message[]): Promise<number> {
    // Check context preservation across turns
  }
}
```

**Test Dataset Creation:**
- 50+ test queries covering different CTXH categories
- Ground truth answers for each query
- Multi-turn conversation scenarios
- Edge cases (ambiguous queries, out-of-scope questions)

---

## 📊 WEEK 2: MONITORING & OBSERVABILITY

### Ngày 8-9: Metrics Collection Setup

#### 2.1. Prometheus Metrics Implementation

**Dependencies:**
```bash
npm install prom-client express-prom-bundle
```

**Metrics Definition (src/monitoring/metrics.ts):**
```typescript
import { Counter, Histogram, Gauge, register } from 'prom-client';

// Chat API Metrics
export const chatRequestsTotal = new Counter({
  name: 'chat_requests_total',
  help: 'Total number of chat requests',
  labelNames: ['method', 'status', 'session_type']
});

export const chatResponseDuration = new Histogram({
  name: 'chat_response_duration_seconds',
  help: 'Chat response duration in seconds',
  labelNames: ['query_type', 'has_context'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

// RAG-specific Metrics
export const embeddingGenerationDuration = new Histogram({
  name: 'embedding_generation_duration_seconds',
  help: 'Time to generate embeddings',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2]
});

export const vectorSearchDuration = new Histogram({
  name: 'vector_search_duration_seconds', 
  help: 'Vector similarity search duration',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1]
});

export const llmTokenUsage = new Counter({
  name: 'llm_tokens_total',
  help: 'Total LLM tokens used',
  labelNames: ['model', 'type'] // type: prompt|completion
});

export const activeSessions = new Gauge({
  name: 'active_chat_sessions',
  help: 'Number of active chat sessions'
});

// Quality Metrics
export const retrievedDocumentsCount = new Histogram({
  name: 'retrieved_documents_count',
  help: 'Number of documents retrieved per query',
  buckets: [0, 1, 2, 3, 5, 10]
});

export const responseQualityScore = new Histogram({
  name: 'response_quality_score',
  help: 'Response quality score (0-1)',
  buckets: [0, 0.2, 0.4, 0.6, 0.8, 1]
});
```

#### 2.2. Instrumentation Implementation

**Service Instrumentation:**
```typescript
// chat-agent.service.ts
@Injectable()
export class ChatAgentService {
  async processMessage(message: string, sessionId?: string): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      // Track active sessions
      activeSessions.inc();
      
      // Generate embeddings
      const embeddingTimer = embeddingGenerationDuration.startTimer();
      const queryEmbedding = await this.embeddingService.embedQuery(message);
      embeddingTimer();
      
      // Vector search
      const searchTimer = vectorSearchDuration.startTimer();
      const relevantDocs = await this.retrievalService.similaritySearch(queryEmbedding);
      searchTimer();
      retrievedDocumentsCount.observe(relevantDocs.length);
      
      // LLM generation
      const response = await this.generateResponse(message, relevantDocs);
      llmTokenUsage.inc({ model: 'gpt-4', type: 'prompt' }, response.promptTokens);
      llmTokenUsage.inc({ model: 'gpt-4', type: 'completion' }, response.completionTokens);
      
      // Track response time
      chatResponseDuration
        .labels(this.classifyQuery(message), sessionId ? 'true' : 'false')
        .observe((Date.now() - startTime) / 1000);
      
      chatRequestsTotal
        .labels('POST', '200', sessionId ? 'continuing' : 'new')
        .inc();
        
      return response;
      
    } catch (error) {
      chatRequestsTotal.labels('POST', '500', 'error').inc();
      throw error;
    } finally {
      activeSessions.dec();
    }
  }
}
```

#### 2.3. Metrics Endpoint Setup

**Metrics Controller:**
```typescript
@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  }

  @Get('health')
  getHealthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    };
  }
}
```

### Ngày 10-11: Logging & Tracing Implementation

#### 2.4. Structured Logging Setup

**Dependencies:**
```bash
npm install winston winston-daily-rotate-file
```

**Logger Configuration (src/common/logger.ts):**
```typescript
import winston from 'winston';
import 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'ctxh-rag-chatbot',
    environment: process.env.NODE_ENV
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File rotation
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    
    // Error logs
    new winston.transports.DailyRotateFile({
      level: 'error',
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});
```

#### 2.5. Request Tracing

**Correlation ID Middleware:**
```typescript
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    req['correlationId'] = correlationId;
    res.set('x-correlation-id', correlationId);
    
    logger.info('Request started', {
      correlationId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent']
    });
    
    next();
  }
}
```

**Chat Request Logging:**
```typescript
// chat.controller.ts
@Post('message')
async sendMessage(@Body() dto: ChatMessageDto, @Req() req) {
  const correlationId = req.correlationId;
  
  logger.info('Chat message received', {
    correlationId,
    messageLength: dto.message.length,
    hasSession: !!dto.sessionId
  });
  
  try {
    const response = await this.chatService.processMessage(dto, correlationId);
    
    logger.info('Chat response generated', {
      correlationId,
      responseLength: response.response.length,
      sourceCount: response.sources.length,
      processingTime: response.processingTime
    });
    
    return response;
  } catch (error) {
    logger.error('Chat processing failed', {
      correlationId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
```

### Ngày 12-13: Dashboards & Alerting

#### 2.6. Grafana Dashboard Setup

**Dashboard JSON Configuration:**
```json
{
  "dashboard": {
    "title": "CTXH RAG Chatbot Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "stat",
        "targets": [{
          "expr": "rate(chat_requests_total[5m])"
        }]
      },
      {
        "title": "Response Time P95", 
        "type": "stat",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(chat_response_duration_seconds_bucket[5m]))"
        }]
      },
      {
        "title": "Token Usage",
        "type": "graph",
        "targets": [{
          "expr": "rate(llm_tokens_total[5m])"
        }]
      },
      {
        "title": "Vector Search Performance",
        "type": "graph", 
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(vector_search_duration_seconds_bucket[5m]))"
        }]
      }
    ]
  }
}
```

#### 2.7. Alerting Rules

**Prometheus Alerting Rules:**
```yaml
groups:
- name: rag-chatbot-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(chat_requests_total{status="500"}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} per second"
      
  - alert: SlowResponseTime
    expr: histogram_quantile(0.95, rate(chat_response_duration_seconds_bucket[5m])) > 5
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Response time too slow"
      description: "95th percentile response time is {{ $value }} seconds"
      
  - alert: HighTokenUsage
    expr: rate(llm_tokens_total[1h]) > 100000
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High LLM token usage"
      description: "Token usage is {{ $value }} per hour"
```

### Ngày 14: Performance Benchmarking

#### 2.8. Load Testing Setup

**Artillery.js Load Testing:**
```bash
npm install -g artillery
```

**Load Test Configuration (load-test.yml):**
```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
    - duration: 120  
      arrivalRate: 10
    - duration: 300
      arrivalRate: 20
  payload:
    path: 'test-queries.csv'
    fields:
      - message

scenarios:
  - name: "Single message chat"
    weight: 70
    flow:
      - post:
          url: "/api/chat/message"
          json:
            message: "{{ message }}"
            
  - name: "Multi-turn conversation"
    weight: 30
    flow:
      - post:
          url: "/api/chat/message"
          json:
            message: "Tôi muốn tìm hoạt động CTXH"
          capture:
            - json: "$.sessionId"
              as: "sessionId"
      - post:
          url: "/api/chat/message" 
          json:
            message: "Hoạt động nào dành cho sinh viên năm 2?"
            sessionId: "{{ sessionId }}"
```

**Benchmark Results Target:**
- Response time P95 < 3 seconds
- Throughput > 50 requests/second
- Error rate < 1%
- Memory usage stable under load

---

## ⚡ WEEK 3: OPTIMIZATION & PRODUCTION DEPLOYMENT

### Ngày 15-16: Performance Optimization

#### 3.1. Caching Strategy Implementation

**Redis Caching Layers:**
```typescript
@Injectable()
export class CacheService {
  constructor(private redis: Redis) {}
  
  // Cache embedding results
  async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
    const key = `embedding:${this.hashText(text)}`;
    await this.redis.setex(key, 3600, JSON.stringify(embedding)); // 1 hour TTL
  }
  
  // Cache frequent queries
  async cacheQueryResponse(query: string, response: ChatResponse): Promise<void> {
    const key = `query:${this.hashText(query)}`;
    await this.redis.setex(key, 1800, JSON.stringify(response)); // 30 min TTL
  }
  
  // Cache vector search results
  async cacheVectorSearch(embedding: number[], results: Document[]): Promise<void> {
    const key = `search:${this.hashEmbedding(embedding)}`;
    await this.redis.setex(key, 600, JSON.stringify(results)); // 10 min TTL
  }
}
```

#### 3.2. Database Optimization

**pgVector Index Optimization:**
```sql
-- Optimize HNSW index parameters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ctxh_embeddings_vector_optimized 
ON ctxh_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add composite indexes for filtered searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ctxh_embeddings_composite
ON ctxh_embeddings(activity_id, created_at) 
INCLUDE (embedding, metadata);

-- Partitioning for large datasets (if needed)
CREATE TABLE ctxh_embeddings_2024 PARTITION OF ctxh_embeddings
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

**Connection Pool Optimization:**
```typescript
// database.config.ts
export const databaseConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  poolSize: 20,                    // Increased pool size
  connectTimeoutMS: 10000,
  idleTimeoutMillis: 30000,
  maxQueryExecutionTime: 30000,
  extra: {
    max: 20,                       // Maximum connections
    min: 5,                        // Minimum connections
    acquire: 30000,                // Connection timeout
    idle: 10000,                   // Idle timeout
    evict: 1000,                   // Eviction run interval
    handleDisconnects: true
  }
};
```

#### 3.3. LLM Call Optimization

**Batch Processing & Smart Caching:**
```typescript
@Injectable()
export class OptimizedChatService {
  private responseCache = new Map<string, CacheEntry>();
  
  async processMessage(message: string, sessionId?: string): Promise<ChatResponse> {
    // 1. Check response cache first
    const cacheKey = this.generateCacheKey(message, sessionId);
    const cached = await this.getCachedResponse(cacheKey);
    if (cached) return cached;
    
    // 2. Optimize retrieval
    const relevantDocs = await this.optimizedRetrieval(message);
    
    // 3. Use smaller model for simple queries
    const model = this.selectOptimalModel(message, relevantDocs);
    
    // 4. Generate response with optimized context
    const response = await this.generateOptimizedResponse(message, relevantDocs, model);
    
    // 5. Cache result
    await this.cacheResponse(cacheKey, response);
    
    return response;
  }
  
  private selectOptimalModel(message: string, docs: Document[]): string {
    // Use GPT-3.5 for simple questions, GPT-4 for complex ones
    const complexity = this.calculateQueryComplexity(message, docs);
    return complexity > 0.7 ? 'gpt-4' : 'gpt-3.5-turbo';
  }
  
  private async optimizedRetrieval(message: string): Promise<Document[]> {
    // Semantic search with pre-filtering
    const filters = this.extractFilters(message);
    return await this.retrievalService.filteredSearch(message, filters, 5);
  }
}
```

### Ngày 17-18: Cost Optimization

#### 3.4. Cost Monitoring & Controls

**Cost Tracking Service:**
```typescript
@Injectable()
export class CostTrackingService {
  private readonly OPENAI_PRICING = {
    'gpt-4': { input: 0.03, output: 0.06 },        // per 1K tokens
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'text-embedding-3-small': { input: 0.00002 }
  };
  
  async trackLLMCost(model: string, promptTokens: number, completionTokens: number): Promise<void> {
    const pricing = this.OPENAI_PRICING[model];
    const cost = (promptTokens * pricing.input + completionTokens * pricing.output) / 1000;
    
    // Store cost metrics
    await this.storeCostMetric({
      model,
      promptTokens,
      completionTokens,
      cost,
      timestamp: new Date()
    });
    
    // Update daily/monthly totals
    await this.updateCostTotals(cost);
  }
  
  async checkCostLimits(): Promise<boolean> {
    const dailyCost = await this.getDailyCost();
    const monthlyCost = await this.getMonthlyCost();
    
    const DAILY_LIMIT = parseFloat(process.env.DAILY_COST_LIMIT || '10');
    const MONTHLY_LIMIT = parseFloat(process.env.MONTHLY_COST_LIMIT || '200');
    
    if (dailyCost > DAILY_LIMIT || monthlyCost > MONTHLY_LIMIT) {
      logger.warn('Cost limit exceeded', { dailyCost, monthlyCost });
      return false;
    }
    
    return true;
  }
}
```

#### 3.5. Smart Cost Controls

**Tiered Response Strategy:**
```typescript
@Injectable() 
export class TieredResponseService {
  async generateResponse(message: string, context: Document[]): Promise<ChatResponse> {
    // Check cost limits first
    const canUsePremium = await this.costTracker.checkCostLimits();
    
    // Tier 1: Cached/Template responses (Free)
    const templateResponse = await this.tryTemplateResponse(message);
    if (templateResponse) return templateResponse;
    
    // Tier 2: GPT-3.5 for simple queries (Low cost)
    if (!this.isComplexQuery(message) && canUsePremium) {
      return await this.generateWithModel(message, context, 'gpt-3.5-turbo');
    }
    
    // Tier 3: GPT-4 for complex queries (High cost)
    if (canUsePremium && this.isComplexQuery(message)) {
      return await this.generateWithModel(message, context, 'gpt-4');
    }
    
    // Fallback: Local/rule-based response
    return await this.generateFallbackResponse(message, context);
  }
  
  private isComplexQuery(message: string): boolean {
    // Check for complex patterns
    const complexPatterns = [
      /so sánh|compare/i,
      /phân tích|analyze/i, 
      /giải thích chi tiết|explain in detail/i,
      /tại sao|why|how/i
    ];
    
    return complexPatterns.some(pattern => pattern.test(message));
  }
}
```

### Ngày 19-20: Production Deployment

#### 3.6. Docker Production Setup

**Production Dockerfile:**
```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
```

**Docker Compose Production:**
```yaml
version: '3.8'

services:
  app:
    build: 
      context: .
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
          
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER} 
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped
    
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:  
  prometheus_data:
  grafana_data:
```

#### 3.7. Environment Configuration

**Production Environment Variables:**
```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://username:password@postgres:5432/doanhoi_db
REDIS_URL=redis://redis:6379

# AI Services  
OPENAI_API_KEY=sk-your-production-key
ANTHROPIC_API_KEY=your-anthropic-key

# Performance
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=100
RAG_TOP_K_RESULTS=3
RAG_SIMILARITY_THRESHOLD=0.75

# Session Management
SESSION_TTL_SECONDS=3600
MAX_CONVERSATION_HISTORY=8

# Cost Controls
DAILY_COST_LIMIT=25
MONTHLY_COST_LIMIT=500

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30

# Security
JWT_SECRET=your-production-jwt-secret
CORS_ORIGINS=https://your-domain.com
```

#### 3.8. CI/CD Pipeline

**GitHub Actions Workflow (.github/workflows/deploy.yml):**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: pgvector/pgvector:pg15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Check coverage
      run: npm run test:cov
    
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /app/ctxh-rag-chatbot
          git pull origin main
          docker-compose -f docker-compose.prod.yml down
          docker-compose -f docker-compose.prod.yml up -d --build
```

### Ngày 21: Load Testing & Go-Live

#### 3.9. Production Load Testing

**Comprehensive Load Test Scenarios:**
```yaml
# production-load-test.yml
config:
  target: 'https://your-production-domain.com'
  phases:
    # Warm-up
    - duration: 60
      arrivalRate: 1
    # Gradual increase
    - duration: 300
      arrivalRate: 5
    # Normal load
    - duration: 600  
      arrivalRate: 10
    # Peak load
    - duration: 300
      arrivalRate: 25
    # Stress test
    - duration: 180
      arrivalRate: 50
  
  processor: "./load-test-processor.js"

scenarios:
  - name: "Real user chat scenarios"
    weight: 80
    flow:
      - think: 2
      - post:
          url: "/api/chat/message"
          json:
            message: "{{ $randomString() }} CTXH activities"
      - think: 5
      - post:
          url: "/api/chat/message"
          json:
            message: "Tell me more details"
            sessionId: "{{ sessionId }}"
            
  - name: "API health checks"
    weight: 20
    flow:
      - get:
          url: "/health"
```

**Load Test Success Criteria:**
- ✅ Response time P95 < 5 seconds under normal load
- ✅ Response time P95 < 10 seconds under peak load  
- ✅ Error rate < 0.5% under normal load
- ✅ Error rate < 2% under peak load
- ✅ System recovers within 2 minutes after load spike
- ✅ No memory leaks during extended testing

#### 3.10. Go-Live Checklist

**Pre-Launch Validation:**
- [ ] All tests passing (Unit, Integration, E2E)
- [ ] Performance benchmarks met
- [ ] Security scan completed 
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Monitoring dashboards working
- [ ] Alerting rules configured
- [ ] Backup procedures tested
- [ ] Documentation updated
- [ ] Team training completed

**Production Launch:**
```bash
# 1. Final deployment
docker-compose -f docker-compose.prod.yml up -d

# 2. Smoke testing
curl https://your-domain.com/health
curl -X POST https://your-domain.com/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message"}'

# 3. Monitor metrics
curl https://your-domain.com/metrics

# 4. Check logs
docker-compose -f docker-compose.prod.yml logs -f app
```

---

## 📋 DELIVERABLES PHASE 3

### Week 1 Deliverables:
- [ ] **Comprehensive Test Suite** (Unit + Integration + E2E)
- [ ] **Test Coverage Report** (≥80% coverage)
- [ ] **RAG Quality Evaluation Framework** 
- [ ] **Performance Benchmark Results**

### Week 2 Deliverables:
- [ ] **Prometheus Metrics Implementation**
- [ ] **Structured Logging System**
- [ ] **Grafana Monitoring Dashboard**
- [ ] **Alerting Rules & Notifications**

### Week 3 Deliverables:
- [ ] **Performance Optimization Results**
- [ ] **Cost Monitoring & Controls**
- [ ] **Production Docker Configuration**
- [ ] **CI/CD Pipeline Setup**
- [ ] **Load Testing Results**
- [ ] **Production Deployment Success**

---

## ⚠️ RISKS & MITIGATION

### High Priority Risks:

**Risk 1: LLM API Rate Limits**
- *Impact:* Service downtime during peak usage
- *Mitigation:* Implement tiered fallback system, caching, rate limiting
- *Contingency:* Local model backup, error handling

**Risk 2: Database Performance Under Load**
- *Impact:* Slow response times, timeouts
- *Mitigation:* Connection pooling, query optimization, caching
- *Contingency:* Read replicas, horizontal scaling

**Risk 3: Cost Overrun**
- *Impact:* Budget exceeded
- *Mitigation:* Cost monitoring, daily limits, model selection optimization
- *Contingency:* Automatic cost controls, usage alerts

**Risk 4: Security Vulnerabilities**
- *Impact:* Data breach, service compromise
- *Mitigation:* Security scanning, input validation, secrets management
- *Contingency:* Incident response plan, rollback procedures

---

## 🎯 SUCCESS METRICS

### Technical KPIs:
- **Availability:** 99.5% uptime
- **Performance:** P95 response time < 3s
- **Quality:** User satisfaction > 4.2/5
- **Reliability:** Error rate < 1%

### Business KPIs:
- **User Adoption:** 100+ active users/day
- **Engagement:** 3+ messages per session average
- **Cost Efficiency:** < $0.10 per conversation
- **Response Accuracy:** 85%+ helpful responses

### Operational KPIs:
- **Monitoring Coverage:** 100% critical paths monitored
- **Alert Response:** < 5 minutes mean time to detection
- **Deployment Success:** 95% success rate
- **Documentation:** All APIs documented

---

## 📚 NEXT STEPS POST-PHASE 3

### Immediate (Next 30 days):
1. **User Feedback Collection** - Implement feedback system
2. **Performance Tuning** - Fine-tune based on real usage
3. **Content Expansion** - Add more CTXH activities to knowledge base
4. **Mobile Optimization** - Ensure mobile responsiveness

### Short-term (Next 3 months):
1. **Advanced Features** - Multi-language support, voice input
2. **Analytics Dashboard** - Admin insights and reports
3. **Integration** - Connect with existing CTXH management system
4. **AI Model Updates** - Evaluate and upgrade to newer models

### Long-term (6+ months):
1. **Personalization** - User-specific recommendations
2. **Advanced RAG** - Multi-modal search (images, documents)
3. **Scalability** - Kubernetes deployment, microservices
4. **AI Improvements** - Custom model fine-tuning

---

**📌 Phase 3 Success Definition:**
✅ Production-ready RAG chatbot deployed with comprehensive testing, monitoring, and optimization complete. System handles real user traffic reliably while maintaining quality standards and cost efficiency.

**Total Estimated Effort:** 147-189 person-hours (3 weeks full-time)
