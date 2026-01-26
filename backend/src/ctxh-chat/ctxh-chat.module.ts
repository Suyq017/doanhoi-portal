import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { CtxhEmbedding } from '../entities/ctxh-embedding.entity';
import { CtxhActivity } from '../entities/ctxh-activity.entity';
import { CtxhChatController } from './controllers/ctxh-chat.controller';

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
    // LangChain Services
    LangChainVectorStoreService,
    LangChainMemoryService,
    LangChainRagChainService,
    LangChainAdvancedRetrieverService,
    LangChainIngestionService,
  ],
  exports: [
    // LangChain Services
    LangChainVectorStoreService,
    LangChainMemoryService,
    LangChainRagChainService,
    LangChainAdvancedRetrieverService,
    LangChainIngestionService,
  ],
})
export class CtxhChatModule {}
