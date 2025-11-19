import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CtxhEmbedding } from '../entities/ctxh-embedding.entity';
import { CtxhActivity } from '@/entities/ctxh-activity.entity';
import { CtxhChatController } from '@/ctxh-chat/controllers/ctxh-chat.controller';
import { CtxhChatService } from '@/ctxh-chat/services/ctxh-chat.service';
import { EmbeddingService } from '@/ctxh-chat/services/embedding.service';
import { VectorStoreService } from '@/ctxh-chat/services/vector-store.service';
import { CtxhDataPreparationService } from '@/ctxh-chat/services/ctxh-data-preparation.service';
import { CtxhRetrievalService } from '@/ctxh-chat/services/ctxh-retrieval.service';
import { ConversationService } from '@/ctxh-chat/services/conversation.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([CtxhEmbedding, CtxhActivity]),
  ],
  controllers: [CtxhChatController],
  providers: [
    CtxhChatService,
    EmbeddingService,
    VectorStoreService,
    CtxhDataPreparationService,
    CtxhRetrievalService,
    ConversationService,
  ],
  exports: [
    CtxhChatService,
    EmbeddingService,
    VectorStoreService,
  ],
})
export class CtxhChatModule {}