import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { GoogleGenAI } from '@google/genai';

import { CtxhEmbedding } from '../entities/ctxh-embedding.entity';
import { CtxhActivity } from '@/entities/ctxh-activity.entity';
import { CtxhChatController } from '@/ctxh-chat/controllers/ctxh-chat.controller';
import { CtxhChatService } from '@/ctxh-chat/services/ctxh-chat.service';
import { EmbeddingService } from '@/ctxh-chat/services/embedding.service';
import { VectorStoreService } from '@/ctxh-chat/services/vector-store.service';
import { CtxhDataPreparationService } from '@/ctxh-chat/services/ctxh-data-preparation.service';
import { CtxhRetrievalService } from '@/ctxh-chat/services/ctxh-retrieval.service';
import { ConversationService } from '@/ctxh-chat/services/conversation.service';
import { CtxhChunkingService } from '@/ctxh-chat/services/ctxh-chunking.service';
import { CtxhIngestionPipelineService } from '@/ctxh-chat/services/ctxh-ingestion-pipeline.service';
import { ResponseFormatterService } from './services/response-formatter.service';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([CtxhEmbedding, CtxhActivity]),
  ],
  controllers: [CtxhChatController],
  providers: [
    // Core Services
    CtxhChatService,
    EmbeddingService,
    VectorStoreService,
    CtxhDataPreparationService,
    CtxhChunkingService,
    CtxhIngestionPipelineService,
    CtxhRetrievalService,
    ConversationService,
    ResponseFormatterService,

    // // Rate Limiting Interceptor (Global)
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: RateLimitInterceptor,
    // },

    // Google Gemini AI Client
    {
      provide: 'GEMINI_CLIENT',
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY is not configured');
        }
        return new GoogleGenAI({ apiKey });
      },
      inject: [ConfigService],
    },

    // Chat Model Configuration
    {
      provide: 'CHAT_MODEL',
      useFactory: () => 'gemini-2.5-flash',
    },

    // Embedding Model Configuration
    {
      provide: 'EMBEDDING_MODEL',
      useFactory: () => 'text-embedding-004',
    },

    // Embedding Dimensions
    {
      provide: 'EMBEDDING_DIMENSIONS',
      useFactory: () => 768,
    },

    // Redis Client for Session Management
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        return new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    CtxhChatService,
    EmbeddingService,
    VectorStoreService,
    CtxhDataPreparationService,
    CtxhChunkingService,
    CtxhIngestionPipelineService,
    CtxhRetrievalService,
    ConversationService,
  ],
})
export class CtxhChatModule {}
