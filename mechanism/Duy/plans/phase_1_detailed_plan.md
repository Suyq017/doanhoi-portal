# PHẦN 1: TĂNG CƯỜNG DỮ LIỆU (DATA INGESTION) - KẾ HOẠCH CHI TIẾT

*Ngày lập: 26/11/2025*
*Dựa trên nghiên cứu Context7 về LangChain.js và best practices*

## 📋 TỔNG QUAN PHASE 1

**Mục tiêu chính:** Xây dựng pipeline tự động để ingestion dữ liệu CTXH activities thành vector embeddings

**Timeline:** 1-2 tuần (8-14 ngày)

**Deliverables:**
- ✅ Database schema hoàn chỉnh với pgVector
- ✅ 6 services chính cho data ingestion pipeline  
- ✅ TypeORM subscribers cho auto-update
- ✅ Scripts và tooling cho testing/monitoring
- ✅ Initial data seeding với existing activities

---

## 🏗️ KIẾN TRÚC TỔNG QUAN

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ctxh_activity │    │ Data Preparation │    │ Text Chunking   │
│     (source)    │───▶│     Service      │───▶│    Service      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ ctxh_embeddings │◀───│  Vector Store    │◀───│   Embedding     │
│   (destination) │    │     Service      │    │    Service      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌──────────────────┐              │
                       │ Ingestion Pipeline│─────────────┘
                       │   (Orchestrator)  │
                       └──────────────────┘
```

---

## 📊 BƯỚC 1: THIẾT KẾ DATABASE SCHEMA (HOÀN THÀNH)

### ✅ Status: COMPLETED
- pgVector extension: ✅ ENABLED
- ctxh_embeddings table: ✅ CREATED
- Indexes: ✅ OPTIMIZED (HNSW + GIN + B-tree)

### 🔍 Verification Checklist:
- [x] Vector dimension: 1536 (OpenAI text-embedding-3-small compatible)
- [x] HNSW index for cosine similarity search
- [x] GIN index for JSONB metadata queries
- [x] B-tree indexes for activity_id và created_at
- [x] Foreign key constraint với cascade delete

---

## 🔧 BƯỚC 2: CTXH DATA PREPARATION SERVICE

### 📝 Service Overview
**File:** `backend/src/ctxh-chat/services/ctxh-data-preparation.service.ts`

**Responsibilities:**
1. Query CTXH activities với relations (category, organization)
2. Filter theo status (ACTIVE, COMPLETED)  
3. Transform raw data thành structured text
4. Handle missing/null fields gracefully

### 🎯 Implementation Details

#### 2.1. Data Query Strategy
```typescript
// Query with optimized joins
const activities = await this.ctxhActivityRepository
  .createQueryBuilder('activity')
  .leftJoinAndSelect('activity.category', 'category')
  .leftJoinAndSelect('activity.organization', 'organization')
  .where('activity.status IN (:...statuses)', { 
    statuses: [ActivityStatus.ACTIVE, ActivityStatus.COMPLETED] 
  })
  .andWhere('activity.deleted_at IS NULL')
  .getMany();
```

#### 2.2. Text Template Strategy
**Structured format để tối ưu cho RAG retrieval:**

```typescript
const textTemplate = `Tên hoạt động: ${activity.name}

Mô tả: ${activity.description || 'Không có mô tả'}

Thông tin tổ chức:
- Danh mục: ${category?.name || 'Chưa phân loại'}
- Tổ chức thực hiện: ${organization?.name || 'Không xác định'}

Thời gian thực hiện:
- Ngày bắt đầu: ${formatDate(activity.start_date)}
- Ngày kết thúc: ${formatDate(activity.end_date)}
- Tổng số ngày CTXH: ${activity.total_days || 0} ngày

Địa điểm: ${activity.location || 'Chưa xác định'}

Trạng thái: ${activity.status}`;
```

#### 2.3. Data Validation & Sanitization
- Remove HTML tags từ description
- Normalize whitespace và line breaks
- Validate required fields (name, id)
- Handle special characters và encoding

### ⚙️ Configuration
```typescript
interface DataPreparationConfig {
  includeInactiveActivities: boolean; // false
  maxDescriptionLength: number; // 2000 chars
  dateFormat: string; // 'DD/MM/YYYY'
  fallbackTexts: {
    noDescription: string;
    noCategory: string;
    noOrganization: string;
    noLocation: string;
  };
}
```

---

## ✂️ BƯỚC 3: CTXH CHUNKING SERVICE

### 📝 Service Overview
**File:** `backend/src/ctxh-chat/services/ctxh-chunking.service.ts`

**Strategy:** Activity-level chunking (1 activity = 1 chunk)
**Rationale:** CTXH activities đã có structure tốt và length hợp lý (~200-500 tokens)

### 🎯 Implementation Details

#### 3.1. Chunking Logic
```typescript
interface ChunkResult {
  activityId: string;
  chunks: ActivityChunk[];
}

interface ActivityChunk {
  index: number; // Always 0 for activity-level
  text: string; // Formatted text from DataPreparation
  metadata: ChunkMetadata;
}

interface ChunkMetadata {
  activityId: string;
  activityName: string;
  categoryName: string;
  organizationName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  location: string;
  status: ActivityStatus;
  chunkType: 'activity'; // For future field-based chunking
  createdAt: Date;
}
```

#### 3.2. Token Counting & Validation
- Use tiktoken library để count tokens chính xác
- Max chunk size: 1000 tokens (configurable)
- Warning nếu chunk > 800 tokens
- Fallback strategy nếu description quá dài:
  ```typescript
  if (tokenCount > maxTokens) {
    // Split description into multiple chunks
    return this.splitLongDescription(activity, text);
  }
  ```

#### 3.3. Future-proofing cho Field-based Chunking
```typescript
enum ChunkingStrategy {
  ACTIVITY_LEVEL = 'activity_level', // Current implementation
  FIELD_BASED = 'field_based',       // Future implementation
  SEMANTIC_SPLIT = 'semantic_split'  // Advanced future option
}
```

### ⚙️ Configuration
```typescript
interface ChunkingConfig {
  strategy: ChunkingStrategy;
  maxChunkTokens: number; // 1000
  overlapTokens: number;  // 100 (for future field-based)
  minChunkTokens: number; // 50
  preserveStructure: boolean; // true
}
```

---

## 🤖 BƯỚC 4: EMBEDDING SERVICE

### 📝 Service Overview  
**File:** `backend/src/ctxh-chat/services/embedding.service.ts`

**Primary Model:** OpenAI text-embedding-3-small (1536 dimensions)
**Backup Strategy:** Local embedding models for development

### 🎯 Implementation Details

#### 4.1. OpenAI Integration với LangChain.js
```typescript
import { OpenAIEmbeddings } from '@langchain/openai';

class EmbeddingService {
  private openaiEmbeddings: OpenAIEmbeddings;
  private redis: Redis; // For caching
  
  async initialize() {
    this.openaiEmbeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      dimensions: 1536,
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
}
```

#### 4.2. Batch Processing Strategy
```typescript
async generateEmbeddings(chunks: ActivityChunk[]): Promise<EmbeddingResult[]> {
  const batchSize = 20; // OpenAI rate limit friendly
  const results: EmbeddingResult[] = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchTexts = batch.map(chunk => chunk.text);
    
    const embeddings = await this.openaiEmbeddings.embedDocuments(batchTexts);
    
    results.push(...batch.map((chunk, index) => ({
      activityId: chunk.metadata.activityId,
      chunkIndex: chunk.index,
      text: chunk.text,
      embedding: embeddings[index],
      metadata: chunk.metadata
    })));
    
    // Rate limiting
    await this.delay(100);
  }
  
  return results;
}
```

#### 4.3. Caching Strategy với Redis
```typescript
async getCachedEmbedding(text: string): Promise<number[] | null> {
  const textHash = this.hashText(text);
  const cacheKey = `embedding:${textHash}`;
  
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

async setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
  const textHash = this.hashText(text);
  const cacheKey = `embedding:${textHash}`;
  
  // Cache for 30 days
  await this.redis.setex(cacheKey, 30 * 24 * 60 * 60, JSON.stringify(embedding));
}
```

#### 4.4. Error Handling & Retry Logic
```typescript
async embedWithRetry(text: string, maxRetries = 3): Promise<number[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.openaiEmbeddings.embedQuery(text);
    } catch (error) {
      if (attempt === maxRetries) {
        throw new EmbeddingError(`Failed after ${maxRetries} attempts`, error);
      }
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await this.delay(delay);
    }
  }
}
```

### ⚙️ Configuration
```typescript
interface EmbeddingConfig {
  provider: 'openai' | 'local';
  model: string;
  dimensions: number;
  batchSize: number;
  maxRetries: number;
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
}
```

---

## 💾 BƯỚC 5: VECTOR STORE SERVICE

### 📝 Service Overview
**File:** `backend/src/ctxh-chat/services/vector-store.service.ts`

**Responsibilities:**
1. Bulk insert embeddings vào PostgreSQL
2. Transactional safety
3. Update/delete strategies
4. Performance optimization

### 🎯 Implementation Details

#### 5.1. Bulk Insert Strategy
```typescript
async storeEmbeddings(embeddings: EmbeddingResult[]): Promise<void> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  
  try {
    // Batch insert với raw query cho performance
    const values = embeddings.map(emb => 
      `('${emb.activityId}', '${emb.text}', '[${emb.embedding.join(',')}]', ${emb.chunkIndex}, '${JSON.stringify(emb.metadata)}')`
    ).join(',');
    
    const query = `
      INSERT INTO ctxh_embeddings (activity_id, content_text, embedding, chunk_index, metadata)
      VALUES ${values}
    `;
    
    await queryRunner.query(query);
    await queryRunner.commitTransaction();
    
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw new VectorStoreError('Bulk insert failed', error);
  } finally {
    await queryRunner.release();
  }
}
```

#### 5.2. Update Strategy
```typescript
async updateActivityEmbeddings(activityId: string, newEmbeddings: EmbeddingResult[]): Promise<void> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  
  try {
    // Delete old embeddings
    await queryRunner.query(
      'DELETE FROM ctxh_embeddings WHERE activity_id = $1',
      [activityId]
    );
    
    // Insert new embeddings
    await this.storeEmbeddings(newEmbeddings);
    
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

#### 5.3. Performance Monitoring
```typescript
async getStorageStats(): Promise<StorageStats> {
  const stats = await this.embeddingRepository.query(`
    SELECT 
      COUNT(*) as total_embeddings,
      COUNT(DISTINCT activity_id) as unique_activities,
      AVG(LENGTH(content_text)) as avg_text_length,
      pg_size_pretty(pg_total_relation_size('ctxh_embeddings')) as table_size
    FROM ctxh_embeddings
  `);
  
  return stats[0];
}
```

### ⚙️ Configuration
```typescript
interface VectorStoreConfig {
  batchSize: number; // 100
  enableTransactions: boolean; // true
  performanceLogging: boolean; // true
  autoVacuum: boolean; // true
  indexOptimization: {
    enabled: boolean;
    threshold: number; // Số records để trigger reindex
  };
}
```

---

## 🔄 BƯỚC 6: INGESTION PIPELINE ORCHESTRATOR

### 📝 Service Overview
**File:** `backend/src/ctxh-chat/services/ctxh-ingestion-pipeline.service.ts`

**Role:** Orchestrate toàn bộ pipeline từ data preparation đến vector storage

### 🎯 Implementation Details

#### 6.1. Pipeline Execution Flow
```typescript
async runFullIngestion(): Promise<IngestionResult> {
  const startTime = Date.now();
  const result: IngestionResult = {
    totalActivities: 0,
    processedActivities: 0,
    totalEmbeddings: 0,
    errors: [],
    duration: 0
  };
  
  try {
    // Step 1: Data Preparation
    this.logger.log('🔍 Starting data preparation...');
    const activities = await this.dataPreparationService.getAllActivities();
    result.totalActivities = activities.length;
    
    // Step 2: Chunking
    this.logger.log('✂️ Starting text chunking...');
    const chunkResults = await this.chunkingService.processActivities(activities);
    
    // Step 3: Embedding Generation
    this.logger.log('🤖 Starting embedding generation...');
    const allChunks = chunkResults.flatMap(cr => cr.chunks);
    const embeddings = await this.embeddingService.generateEmbeddings(allChunks);
    result.totalEmbeddings = embeddings.length;
    
    // Step 4: Vector Storage
    this.logger.log('💾 Starting vector storage...');
    await this.vectorStoreService.storeEmbeddings(embeddings);
    
    result.processedActivities = activities.length;
    result.duration = Date.now() - startTime;
    
    this.logger.log(`✅ Pipeline completed: ${result.processedActivities}/${result.totalActivities} activities processed`);
    
  } catch (error) {
    result.errors.push(error.message);
    this.logger.error('❌ Pipeline failed:', error);
  }
  
  return result;
}
```

#### 6.2. Incremental Updates
```typescript
async runIncrementalUpdate(since: Date): Promise<IngestionResult> {
  const activities = await this.dataPreparationService.getUpdatedActivities(since);
  
  const result: IngestionResult = {
    totalActivities: activities.length,
    processedActivities: 0,
    totalEmbeddings: 0,
    errors: [],
    duration: 0
  };
  
  for (const activity of activities) {
    try {
      await this.processActivity(activity);
      result.processedActivities++;
    } catch (error) {
      result.errors.push(`Activity ${activity.id}: ${error.message}`);
    }
  }
  
  return result;
}
```

#### 6.3. Progress Monitoring
```typescript
async runWithProgress(onProgress?: (progress: IngestionProgress) => void): Promise<IngestionResult> {
  const activities = await this.dataPreparationService.getAllActivities();
  const total = activities.length;
  
  for (let i = 0; i < activities.length; i++) {
    await this.processActivity(activities[i]);
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        percentage: Math.round(((i + 1) / total) * 100),
        currentActivity: activities[i].name
      });
    }
  }
}
```

### ⚙️ Configuration
```typescript
interface IngestionConfig {
  batchSize: number; // Number of activities per batch
  maxConcurrency: number; // Parallel processing limit
  progressReporting: boolean;
  errorHandling: {
    continueOnError: boolean;
    maxErrors: number;
    retryFailedItems: boolean;
  };
}
```

---

## 🔗 BƯỚC 7: LIFECYCLE HOOKS & AUTO-UPDATES

### 📝 TypeORM Subscribers Setup
**File:** `backend/src/ctxh-chat/subscribers/ctxh-activity.subscriber.ts`

### 🎯 Implementation Details

#### 7.1. Activity Change Detection
```typescript
@EventSubscriber()
export class CtxhActivitySubscriber implements EntitySubscriberInterface<CtxhActivity> {
  
  listenTo() {
    return CtxhActivity;
  }
  
  async afterInsert(event: InsertEvent<CtxhActivity>): Promise<void> {
    const activity = event.entity;
    
    if (this.shouldProcessActivity(activity)) {
      await this.queueForEmbedding(activity, 'INSERT');
    }
  }
  
  async afterUpdate(event: UpdateEvent<CtxhActivity>): Promise<void> {
    const activity = event.entity;
    const updatedColumns = event.updatedColumns.map(col => col.propertyName);
    
    // Only process if relevant fields changed
    const relevantFields = ['name', 'description', 'start_date', 'end_date', 'location', 'status'];
    const hasRelevantChanges = updatedColumns.some(col => relevantFields.includes(col));
    
    if (hasRelevantChanges && this.shouldProcessActivity(activity)) {
      await this.queueForEmbedding(activity, 'UPDATE');
    }
  }
  
  async beforeRemove(event: RemoveEvent<CtxhActivity>): Promise<void> {
    const activityId = event.entityId;
    await this.queueForDeletion(activityId);
  }
}
```

#### 7.2. Background Processing Queue
```typescript
interface EmbeddingJob {
  activityId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  priority: number;
  createdAt: Date;
}

class EmbeddingQueue {
  private queue: EmbeddingJob[] = [];
  private processing = false;
  
  async addJob(job: EmbeddingJob): Promise<void> {
    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority);
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      try {
        await this.processJob(job);
      } catch (error) {
        this.logger.error(`Failed to process embedding job ${job.activityId}:`, error);
      }
    }
    
    this.processing = false;
  }
}
```

---

## 🧪 BƯỚC 8: TESTING STRATEGY

### 📝 Test Coverage Plan

#### 8.1. Unit Tests
**Target Files:**
- `ctxh-data-preparation.service.spec.ts`
- `ctxh-chunking.service.spec.ts`  
- `embedding.service.spec.ts`
- `vector-store.service.spec.ts`
- `ctxh-ingestion-pipeline.service.spec.ts`

**Test Scenarios:**
```typescript
describe('CtxhDataPreparationService', () => {
  it('should format activity data correctly', async () => {
    const mockActivity = createMockActivity();
    const result = await service.formatActivity(mockActivity);
    
    expect(result).toContain('Tên hoạt động:');
    expect(result).toContain(mockActivity.name);
  });
  
  it('should handle missing organization gracefully', async () => {
    const activityWithoutOrg = { ...mockActivity, organization: null };
    const result = await service.formatActivity(activityWithoutOrg);
    
    expect(result).toContain('Không xác định');
  });
});
```

#### 8.2. Integration Tests
**Test Full Pipeline:**
```typescript
describe('RAG Ingestion Pipeline', () => {
  it('should process activity from start to finish', async () => {
    // Insert test activity
    const activity = await createTestActivity();
    
    // Run pipeline
    const result = await pipelineService.runFullIngestion();
    
    // Verify embeddings created
    const embeddings = await embeddingRepo.find({ 
      where: { activity_id: activity.id } 
    });
    
    expect(embeddings).toHaveLength(1);
    expect(embeddings[0].embedding).toHaveLength(1536);
  });
});
```

#### 8.3. Performance Tests
```typescript
describe('Performance Tests', () => {
  it('should process 1000 activities within 5 minutes', async () => {
    const activities = await createTestActivities(1000);
    const startTime = Date.now();
    
    await pipelineService.runFullIngestion();
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5 * 60 * 1000); // 5 minutes
  });
});
```

---

## 📊 BƯỚC 9: MONITORING & METRICS

### 📝 Monitoring Dashboard

#### 9.1. Key Metrics to Track
```typescript
interface IngestionMetrics {
  // Volume metrics
  totalActivities: number;
  totalEmbeddings: number;
  dailyIngestionRate: number;
  
  // Performance metrics
  averageProcessingTime: number; // per activity
  embeddingGenerationTime: number; // per batch
  vectorStoreInsertTime: number;
  
  // Quality metrics
  successRate: number; // percentage
  errorRate: number;
  cacheHitRate: number; // for embeddings
  
  // Cost metrics
  openaiApiCalls: number;
  tokenUsage: number;
  estimatedCost: number;
}
```

#### 9.2. Health Checks
```typescript
@Controller('health')
export class IngestionHealthController {
  
  @Get('embedding-service')
  async checkEmbeddingService(): Promise<HealthStatus> {
    try {
      // Test embedding generation
      const testEmbedding = await this.embeddingService.embedQuery('test');
      return {
        status: 'healthy',
        lastCheck: new Date(),
        details: { dimensions: testEmbedding.length }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date()
      };
    }
  }
  
  @Get('vector-store')
  async checkVectorStore(): Promise<HealthStatus> {
    const stats = await this.vectorStoreService.getStorageStats();
    return {
      status: 'healthy',
      lastCheck: new Date(),
      details: stats
    };
  }
}
```

---

## 🗓️ TIMELINE CHI TIẾT

### Phase 1A: Core Services (Ngày 1-5)
**Day 1-2:**
- ✅ CtxhDataPreparationService implementation
- ✅ Unit tests cho data preparation
- ✅ CtxhChunkingService implementation

**Day 3-4:**  
- ✅ EmbeddingService với OpenAI integration
- ✅ Redis caching implementation
- ✅ Error handling và retry logic

**Day 5:**
- ✅ VectorStoreService với bulk operations
- ✅ Transaction safety và performance optimization

### Phase 1B: Pipeline Integration (Ngày 6-10)
**Day 6-7:**
- ✅ CtxhIngestionPipeline orchestration
- ✅ Progress monitoring và logging
- ✅ Configuration management

**Day 8-9:**
- ✅ TypeORM subscribers cho lifecycle hooks
- ✅ Background job queue implementation
- ✅ Auto-update mechanisms

**Day 10:**
- ✅ Integration testing
- ✅ Performance optimization
- ✅ Error handling refinement

### Phase 1C: Testing & Production Readiness (Ngày 11-14)
**Day 11-12:**
- ✅ Comprehensive test suite
- ✅ Performance benchmarking
- ✅ Load testing với sample data

**Day 13:**
- ✅ Monitoring dashboard setup
- ✅ Health checks implementation
- ✅ Documentation completion

**Day 14:**
- ✅ Initial data seeding
- ✅ Production deployment preparation
- ✅ Handoff to Phase 2 team

---

## 🎯 ACCEPTANCE CRITERIA

### ✅ Technical Requirements
- [ ] All 6 core services implemented và tested
- [ ] Pipeline processes 1000+ activities trong <5 minutes  
- [ ] Error rate <1% cho embedding generation
- [ ] Cache hit rate >70% cho repeated content
- [ ] Database indexes optimized cho vector search
- [ ] TypeORM subscribers working cho auto-updates

### ✅ Quality Requirements  
- [ ] Unit test coverage >90%
- [ ] Integration tests covering full pipeline
- [ ] Performance tests passing benchmarks
- [ ] Error handling comprehensive
- [ ] Logging và monitoring complete
- [ ] Documentation updated

### ✅ Data Requirements
- [ ] All existing CTXH activities processed
- [ ] Embeddings stored với correct dimensions
- [ ] Metadata properly structured
- [ ] Vector indexes functional
- [ ] Search performance acceptable (<100ms)

---

## 🚨 RISKS & MITIGATION

### Risk 1: OpenAI API Rate Limiting
**Mitigation:**
- Implement exponential backoff
- Use batch processing với appropriate delays
- Monitor API usage dashboards
- Have fallback to local models

### Risk 2: Large Data Volume Processing
**Mitigation:**
- Incremental processing strategies
- Memory-efficient batch operations
- Database connection pooling
- Progress checkpointing

### Risk 3: Vector Search Performance
**Mitigation:**  
- Optimize HNSW index parameters
- Monitor query performance
- Implement caching layers
- Regular index maintenance

---

## 📚 NEXT STEPS TO PHASE 2

**Handoff Requirements:**
1. ✅ Phase 1 acceptance criteria met
2. ✅ All embeddings generated và stored
3. ✅ Pipeline running stable trong production
4. ✅ Monitoring dashboards operational
5. ✅ Documentation complete cho Phase 2 team

**Phase 2 Dependencies:**
- Vector similarity search implementation
- Retrieval service development  
- LLM integration cho response generation
- Conversation management system

**Success Metrics for Handoff:**
- Pipeline uptime >99%
- Data freshness <1 hour lag
- Error rate <0.5%
- Vector search response time <50ms

---

*📌 Kế hoạch này sẽ được review và update hàng tuần dựa trên progress thực tế và feedback từ team.*