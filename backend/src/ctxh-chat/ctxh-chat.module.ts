import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { CtxhEmbedding } from '../entities/ctxh-embedding.entity';
import { CtxhActivity } from '../entities/ctxh-activity.entity';
import { User } from '../entities/user.entity';
import { CtxhChatController } from './controllers/ctxh-chat.controller';
import { ActivitiesModule } from '../ctxh/activity/activities.module';

// Universal Services (Ollama/Gemini toggle)
import { UniversalEmbeddingsService } from './services/universal-embeddings.service';
import { UniversalLLMService } from './services/universal-llm.service';

// LangChain Services
import { LangChainVectorStoreService } from './services/langchain-vector-store.service';
import { LangChainMemoryService } from './services/langchain-memory.service';
import { LangChainRagChainService } from './services/langchain-rag-chain.service';
import { LangChainAdvancedRetrieverService } from './services/langchain-advanced-retriever.service';
import { LangChainIngestionService } from './services/langchain-ingestion.service';
import { CtxhFilterExtractionService } from './services/ctxh-filter-extraction.service';
import { UserContextService } from './services/user-context.service';

// Vector Auto-Ingestion Pipeline
import { CtxhVectorSyncService } from './services/ctxh-vector-sync.service';
import { VectorIngestionProcessor } from './processors/vector-ingestion.processor';
import { VECTOR_QUEUE } from './constants/vector-queue.constants';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([CtxhEmbedding, CtxhActivity, User]),
    forwardRef(() => ActivitiesModule),
    BullModule.registerQueue({
      name: VECTOR_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true, // xóa ngay để giải phóng jobId cho lần update tiếp theo
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [CtxhChatController],
  providers: [
    // Universal Services (must be initialized first)
    UniversalEmbeddingsService,
    UniversalLLMService,
    // LangChain Services
    LangChainVectorStoreService,
    LangChainMemoryService,
    LangChainRagChainService,
    LangChainAdvancedRetrieverService,
    LangChainIngestionService,
    CtxhFilterExtractionService,
    UserContextService,
    // Vector Auto-Ingestion Pipeline
    CtxhVectorSyncService,
    VectorIngestionProcessor, // Worker với concurrency: 1 per job type
  ],
  exports: [
    // Universal Services
    UniversalEmbeddingsService,
    UniversalLLMService,
    // LangChain Services
    LangChainVectorStoreService,
    LangChainMemoryService,
    LangChainRagChainService,
    LangChainAdvancedRetrieverService,
    LangChainIngestionService,
    CtxhFilterExtractionService,
    UserContextService,
    // Vector Auto-Ingestion Pipeline
    CtxhVectorSyncService,
  ],
})
export class CtxhChatModule {}
