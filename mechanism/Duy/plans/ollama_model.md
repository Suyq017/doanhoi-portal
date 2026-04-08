Collecting workspace information# Kế hoạch thay thế Gemini sang Ollama (BGE-M3 + Qwen2.5:7b)

## 📋 Tổng quan
Hệ thống hỗ trợ **chuyển đổi linh hoạt** giữa Gemini và Ollama thông qua biến môi trường:
- **Embeddings**: Gemini `text-embeddings-04` (dimension: 768) ↔ Ollama `bge-m3` (dimension: 1024)
- **LLM**: Gemini `gemini-flash-2.5` ↔ Ollama `qwen2.5:7b`
- **Toggle**: Sử dụng `USE_LOCAL_MODEL=true/false` để chuyển đổi

---

## 🎯 Bước 1: Tạo Dockerfile cho Ollama (giai đoạn này hãy bỏ qua bước 1 vì tôi đã sử dụng ollama)

### 1.1. Tạo custom Ollama image với pre-loaded models

**File mới**: `ollama/Dockerfile`
```dockerfile
FROM ollama/ollama:latest

# Copy script để pull models
COPY pull-models.sh /pull-models.sh
RUN chmod +x /pull-models.sh

# Expose port
EXPOSE 11434

# Entrypoint sẽ start ollama và pull models
CMD ["/bin/bash", "-c", "ollama serve & sleep 5 && /pull-models.sh && tail -f /dev/null"]
```

### 1.2. Tạo script pull models

**File mới**: `ollama/pull-models.sh`
```bash
#!/bin/bash
echo "Pulling BGE-M3 embedding model..."
ollama pull bge-m3

echo "Pulling Qwen2.5:7b LLM model..."
ollama pull qwen2.5:7b

echo "Models pulled successfully!"
ollama list
```

### 1.3. Cập nhật docker-compose

**Thêm vào**: docker-compose.yml và docker-compose.prod.yml
```yaml
services:
  ollama:
    build:
      context: ./ollama
      dockerfile: Dockerfile
    container_name: ollama-server
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  ollama-data:
    driver: local
```

---

## 🎯 Bước 2: Cập nhật Backend Dependencies

### 2.1. Cài đặt Ollama packages cho LangChain

**Cập nhật**: package.json
```bash
npm install @langchain/ollama @langchain/community
```

**Command**:
```bash
cd backend
npm install @langchain/ollama @langchain/community
```

---

## 🎯 Bước 3: Cập nhật Configuration

### 3.1. Thêm Ollama config và biến toggle

**Cập nhật**: .env và .env.example
```env
# Model Toggle - Set to true to use Ollama, false to use Gemini
USE_LOCAL_MODEL=false

# Ollama Configuration (used when USE_LOCAL_MODEL=true)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=bge-m3
OLLAMA_EMBEDDING_DIMENSION=1024
OLLAMA_LLM_MODEL=qwen2.5:7b
OLLAMA_TIMEOUT=60000
OLLAMA_NUM_CTX=4096

# Gemini Configuration (used when USE_LOCAL_MODEL=false)
GOOGLE_API_KEY=your-api-key
GEMINI_MODEL=gemini-flash-2.5
GEMINI_EMBEDDING_MODEL=text-embedding-004
GEMINI_EMBEDDING_DIMENSION=768
```

**Production**: .env.production
```env
OLLAMA_BASE_URL=http://ollama:11434
```

---

## 🎯 Bước 4: Tạo Ollama Integration Services

### 4.1. Tạo Universal Embeddings Service (hỗ trợ cả Ollama và Gemini)

**File mới**: `backend/src/ctxh-chat/services/universal-embeddings.service.ts`
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaEmbeddings } from '@langchain/ollama';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Embeddings } from '@langchain/core/embeddings';

@Injectable()
export class UniversalEmbeddingsService {
  private readonly logger = new Logger(UniversalEmbeddingsService.name);
  private embeddings: Embeddings;
  private readonly useLocalModel: boolean;
  private readonly dimension: number;

  constructor(private readonly configService: ConfigService) {
    this.useLocalModel = this.configService.get('USE_LOCAL_MODEL', 'false') === 'true';
    this.initializeEmbeddings();
  }

  private initializeEmbeddings(): void {
    if (this.useLocalModel) {
      // Use Ollama BGE-M3 (dimension: 1024)
      const baseUrl = this.configService.get('OLLAMA_BASE_URL');
      const model = this.configService.get('OLLAMA_EMBEDDING_MODEL', 'bge-m3');
      this.dimension = this.configService.get('OLLAMA_EMBEDDING_DIMENSION', 1024);

      this.embeddings = new OllamaEmbeddings({
        baseUrl,
        model,
        requestOptions: {
          timeout: this.configService.get('OLLAMA_TIMEOUT', 60000),
        },
      });

      this.logger.log(`✅ Using LOCAL Ollama Embeddings: ${model} (dimension: ${this.dimension}) at ${baseUrl}`);
    } else {
      // Use Gemini (dimension: 768)
      const apiKey = this.configService.get('GOOGLE_API_KEY');
      const model = this.configService.get('GEMINI_EMBEDDING_MODEL', 'text-embedding-004');
      this.dimension = this.configService.get('GEMINI_EMBEDDING_DIMENSION', 768);

      this.embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey,
        modelName: model,
      });

      this.logger.log(`✅ Using GEMINI Embeddings: ${model} (dimension: ${this.dimension})`);
    }
  }

  getEmbeddings(): Embeddings {
    return this.embeddings;
  }

  getDimension(): number {
    return this.dimension;
  }

  isUsingLocalModel(): boolean {
    return this.useLocalModel;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.embeddings.embedQuery('health check');
      return true;
    } catch (error) {
      this.logger.error('Embeddings health check failed', error);
      return false;
    }
  }
}
```

### 4.2. Tạo Universal LLM Service (hỗ trợ cả Ollama và Gemini)

**File mới**: `backend/src/ctxh-chat/services/universal-llm.service.ts`
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

@Injectable()
export class UniversalLLMService {
  private readonly logger = new Logger(UniversalLLMService.name);
  private llm: BaseChatModel;
  private readonly useLocalModel: boolean;

  constructor(private readonly configService: ConfigService) {
    this.useLocalModel = this.configService.get('USE_LOCAL_MODEL', 'false') === 'true';
    this.initializeLLM();
  }

  private initializeLLM(): void {
    if (this.useLocalModel) {
      // Use Ollama Qwen2.5:7b
      const baseUrl = this.configService.get('OLLAMA_BASE_URL');
      const model = this.configService.get('OLLAMA_LLM_MODEL', 'qwen2.5:7b');

      this.llm = new ChatOllama({
        baseUrl,
        model,
        temperature: 0.7,
        numCtx: this.configService.get('OLLAMA_NUM_CTX', 4096),
      });

      this.logger.log(`✅ Using LOCAL Ollama LLM: ${model} at ${baseUrl}`);
    } else {
      // Use Gemini
      const apiKey = this.configService.get('GOOGLE_API_KEY');
      const model = this.configService.get('GEMINI_MODEL', 'gemini-flash-2.5');

      this.llm = new ChatGoogleGenerativeAI({
        apiKey,
        modelName: model,
        temperature: 0.7,
      });

      this.logger.log(`✅ Using GEMINI LLM: ${model}`);
    }
  }

  getLLM(): BaseChatModel {
    return this.llm;
  }

  isUsingLocalModel(): boolean {
    return this.useLocalModel;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.llm.invoke('ping');
      return true;
    } catch (error) {
      this.logger.error('LLM health check failed', error);
      return false;
    }
  }
}
```

---

## 🎯 Bước 5: Refactor LangChain Services

### 5.1. Cập nhật Vector Store Service

**Cập nhật**: `backend/src/ctxh-chat/services/langchain-vector-store.service.ts`

Thay thế:
```typescript
// Old
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

constructor() {
  this.embeddings = new GoogleGenerativeAIEmbeddings({...});
}

// New
import { UniversalEmbeddingsService } from './universal-embeddings.service';

constructor(
  private readonly universalEmbeddingsService: UniversalEmbeddingsService,
) {
  this.embeddings = this.universalEmbeddingsService.getEmbeddings();
  
  // Log which model is being used
  const modelType = this.universalEmbeddingsService.isUsingLocalModel() ? 'Ollama' : 'Gemini';
  const dimension = this.universalEmbeddingsService.getDimension();
  this.logger.log(`Vector Store initialized with ${modelType} (dimension: ${dimension})`);
}
```

### 5.2. Cập nhật Chat Service

**Cập nhật**: `backend/src/ctxh-chat/services/langchain-chat.service.ts`

Thay thế:
```typescript
// Old
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

this.llm = new ChatGoogleGenerativeAI({...});

// New
import { UniversalLLMService } from './universal-llm.service';

constructor(
  private readonly universalLLMService: UniversalLLMService,
) {
  this.llm = this.universalLLMService.getLLM();
  
  // Log which model is being used
  const modelType = this.universalLLMService.isUsingLocalModel() ? 'Ollama' : 'Gemini';
  this.logger.log(`Chat Service initialized with ${modelType} LLM`);
}
```

### 5.3. Cập nhật Module

**Cập nhật**: `backend/src/ctxh-chat/ctxh-chat.module.ts`
```typescript
import { UniversalEmbeddingsService } from './services/universal-embeddings.service';
import { UniversalLLMService } from './services/universal-llm.service';

@Module({
  providers: [
    UniversalEmbeddingsService,
    UniversalLLMService,
    LangChainVectorStoreService,
    LangChainChatService,
    LangChainIngestionService,
    // ...existing providers
  ],
})
```

---

## 🎯 Bước 6: Cập nhật NPM Scripts

### 6.0. Thêm scripts vào package.json

**Cập nhật**: `backend/package.json`
```json
{
  "scripts": {
    "check:models": "ts-node src/scripts/check-model-status.ts",
    "migrate:embeddings": "ts-node src/scripts/migrate-embeddings.ts"
  }
}
```

---

## 🎯 Bước 7: Testing & Migration

### 6.1. Tạo script kiểm tra và migration

**File mới**: `backend/src/scripts/check-model-status.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UniversalEmbeddingsService } from '../ctxh-chat/services/universal-embeddings.service';
import { UniversalLLMService } from '../ctxh-chat/services/universal-llm.service';

async function checkModelStatus() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const embeddingsService = app.get(UniversalEmbeddingsService);
  const llmService = app.get(UniversalLLMService);

  console.log('\n🔍 Current Model Configuration:');
  console.log('================================');
  console.log(`Embeddings: ${embeddingsService.isUsingLocalModel() ? 'Ollama BGE-M3' : 'Gemini'}`);
  console.log(`Dimension: ${embeddingsService.getDimension()}`);
  console.log(`LLM: ${llmService.isUsingLocalModel() ? 'Ollama Qwen2.5:7b' : 'Gemini Flash'}`);
  console.log('================================\n');

  const embeddingsHealth = await embeddingsService.healthCheck();
  const llmHealth = await llmService.healthCheck();

  console.log(`Embeddings Health: ${embeddingsHealth ? '✅ OK' : '❌ FAILED'}`);
  console.log(`LLM Health: ${llmHealth ? '✅ OK' : '❌ FAILED'}`);

  await app.close();
}

checkModelStatus();
```

**File mới**: `backend/src/scripts/migrate-embeddings.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LangChainIngestionService } from '../ctxh-chat/services/langchain-ingestion.service';
import { UniversalEmbeddingsService } from '../ctxh-chat/services/universal-embeddings.service';

async function migrateEmbeddings() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ingestionService = app.get(LangChainIngestionService);
  const embeddingsService = app.get(UniversalEmbeddingsService);

  const modelType = embeddingsService.isUsingLocalModel() ? 'Ollama BGE-M3 (1024d)' : 'Gemini (768d)';
  console.log(`\n🚀 Starting full re-ingestion with ${modelType}...`);
  
  const result = await ingestionService.runFullIngestion();
  console.log('✅ Migration completed:', result);

  await app.close();
}

migrateEmbeddings();
```

### 6.2. Health check endpoint

**Cập nhật**: `backend/src/ctxh-chat/controllers/ctxh-chat.controller.ts`
```typescript
@Get('health/models')
async checkModelsHealth() {
  const embeddingsHealth = await this.universalEmbeddingsService.healthCheck();
  const llmHealth = await this.universalLLMService.healthCheck();
  const isLocalModel = this.universalEmbeddingsService.isUsingLocalModel();
  
  return {
    status: embeddingsHealth && llmHealth ? 'healthy' : 'unhealthy',
    modelType: isLocalModel ? 'Ollama (Local)' : 'Gemini (Cloud)',
    embeddings: {
      healthy: embeddingsHealth,
      model: isLocalModel ? 'bge-m3' : 'text-embedding-004',
      dimension: this.universalEmbeddingsService.getDimension(),
    },
    llm: {
      healthy: llmHealth,
      model: isLocalModel ? 'qwen2.5:7b' : 'gemini-flash-2.5',
    },
  };
}
```

---

## 🎯 Bước 7: Deployment Plan

### 7.1. Development

**Sử dụng Gemini (mặc định)**:
```bash
# Set USE_LOCAL_MODEL=false trong .env
USE_LOCAL_MODEL=false

# Start services
docker-compose up -d postgres
docker-compose up -d backend

# Check model status
npm run check:models
```

**Chuyển sang Ollama**:
```bash
# Build và start Ollama service
docker-compose build ollama
docker-compose up -d ollama

# Wait for models to download (5-10 minutes)
docker logs -f ollama-server

# Update .env
USE_LOCAL_MODEL=true

# Restart backend
docker-compose restart backend

# Check model status
npm run check:models

# Run re-ingestion (vì dimension khác: 768 → 1024)
npm run migrate:embeddings
```

### 7.2. Production

**Option 1: Tiếp tục dùng Gemini**
```bash
# Không cần thay đổi gì, đảm bảo USE_LOCAL_MODEL=false
USE_LOCAL_MODEL=false
```

**Option 2: Chuyển sang Ollama**
```bash
# Build Ollama image
docker-compose -f docker-compose.prod.yml build ollama

# Start Ollama service
docker-compose -f docker-compose.prod.yml up -d ollama

# Wait for models (5-10 minutes)
docker-compose -f docker-compose.prod.yml logs -f ollama

# Update environment variable
USE_LOCAL_MODEL=true

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend

# Verify health
curl http://your-api/ctxh-chat/health/models

# Run full re-ingestion
curl -X POST http://your-api/ctxh-chat/ingestion/full
```

---

## 📊 Checklist Implementation

### Phase 1: Setup Infrastructure
- [ ] Tạo `ollama/Dockerfile` và `pull-models.sh`
- [ ] Cập nhật `docker-compose.yml` với Ollama service
- [ ] Cập nhật `docker-compose.prod.yml` với Ollama service
- [ ] Cài đặt `@langchain/ollama` package

### Phase 2: Configuration
- [ ] Thêm `USE_LOCAL_MODEL` vào `.env`
- [ ] Thêm `USE_LOCAL_MODEL` vào `.env.example`
- [ ] Cập nhật Ollama config với `OLLAMA_EMBEDDING_DIMENSION=1024`
- [ ] Cập nhật Gemini config với `GEMINI_EMBEDDING_DIMENSION=768`

### Phase 3: Service Implementation
- [ ] Tạo `UniversalEmbeddingsService` (hỗ trợ toggle)
- [ ] Tạo `UniversalLLMService` (hỗ trợ toggle)
- [ ] Refactor `langchain-vector-store.service.ts`
- [ ] Refactor `langchain-chat.service.ts`
- [ ] Cập nhật `ctxh-chat.module.ts`

### Phase 4: Testing & Scripts
- [ ] Tạo `check-model-status.ts` script
- [ ] Tạo `migrate-embeddings.ts` script
- [ ] Cập nhật health check endpoint
- [ ] Thêm npm scripts vào `package.json`

### Phase 5: Testing
- [ ] Test với `USE_LOCAL_MODEL=false` (Gemini)
- [ ] Test với `USE_LOCAL_MODEL=true` (Ollama)
- [ ] Test chuyển đổi giữa 2 modes
- [ ] Verify embedding dimensions (768 vs 1024)
- [ ] Monitor performance comparison

### Phase 6: Documentation
- [ ] Update README với hướng dẫn toggle models
- [ ] Document performance benchmarks
- [ ] Update deployment guide

---

## ⚠️ Lưu ý quan trọng

### 1. **Embedding Dimension khác nhau**
- **Gemini**: `text-embedding-004` → dimension **768**
- **Ollama**: `bge-m3` → dimension **1024**
- ⚠️ **CRITICAL**: Khi chuyển đổi giữa 2 models, **BẮT BUỘC phải re-ingestion toàn bộ** vì dimension khác nhau
- Database column `embedding` trong `CtxhEmbedding` phải support cả 2 dimensions

### 2. **Performance Comparison**
| Metric | Gemini (Cloud) | Ollama (Local) |
|--------|----------------|----------------|
| Latency | ~200-500ms | ~1-3s |
| Throughput | High | Medium |
| Cost | Pay per request | Free (self-hosted) |
| Privacy | Data sent to Google | Data stays local |

### 3. **Resource Requirements**
- **Ollama Server**: 
  - Qwen2.5:7b → ~8GB RAM, 4GB VRAM (recommended)
  - BGE-M3 → ~2GB RAM, 1GB VRAM
  - Total: **~10GB RAM minimum**
- **Gemini**: No local resources needed

### 4. **Migration Strategy**
```bash
# Scenario 1: Gemini → Ollama
1. Backup database
2. Set USE_LOCAL_MODEL=true
3. Start Ollama service
4. Run full re-ingestion (dimension 768 → 1024)
5. Verify results

# Scenario 2: Ollama → Gemini
1. Backup database
2. Set USE_LOCAL_MODEL=false
3. Run full re-ingestion (dimension 1024 → 768)
4. Verify results
5. (Optional) Stop Ollama service to save resources
```

### 5. **Database Compatibility**
- Vector column phải support variable dimensions
- Recommend: Keep separate tables or add `dimension` metadata
- Consider indexing strategy for different dimensions

### 6. **Backup Strategy**
```bash
# Backup before switching models
pg_dump -h localhost -U postgres -d doanhoi_db -t ctxh_embeddings > backup_embeddings_$(date +%Y%m%d).sql
```

### 7. **Rollback Plan**
- Keep old embeddings in backup
- Can switch back by toggling `USE_LOCAL_MODEL` and re-ingesting
- Estimated rollback time: 10-30 minutes depending on data size