import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { CtxhEmbedding } from '../entities/ctxh-embedding.entity';
import { CtxhActivity } from '../entities/ctxh-activity.entity';
import { CtxhChatController } from './controllers/ctxh-chat.controller';

// Universal Services (Ollama/Gemini toggle)
import { UniversalEmbeddingsService } from './services/universal-embeddings.service';
import { UniversalLLMService } from './services/universal-llm.service';

// LangChain Services
import { LangChainVectorStoreService } from './services/langchain-vector-store.service';
import { LangChainMemoryService } from './services/langchain-memory.service';
import { LangChainRagChainService } from './services/langchain-rag-chain.service';
import { LangChainAdvancedRetrieverService } from './services/langchain-advanced-retriever.service';
import { LangChainIngestionService } from './services/langchain-ingestion.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([CtxhEmbedding, CtxhActivity]),
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
  ],
})
export class CtxhChatModule {}
