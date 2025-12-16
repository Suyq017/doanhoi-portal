import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CtxhChatService } from '@/ctxh-chat/services/ctxh-chat.service';
import { CtxhIngestionPipelineService } from '@/ctxh-chat/services/ctxh-ingestion-pipeline.service';
import { EmbeddingService } from '@/ctxh-chat/services/embedding.service';
import { VectorStoreService } from '@/ctxh-chat/services/vector-store.service';
import { ConversationService } from '@/ctxh-chat/services/conversation.service';
import { ChatRequestDto, ChatResponseDto } from '../dto';
import type { Request } from 'express';

@ApiTags('ctxh-chat')
@Controller('api/ctxh-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CtxhChatController {
  constructor(
    private readonly ctxhChatService: CtxhChatService,
    private readonly conversationService: ConversationService,
    private readonly ingestionPipelineService: CtxhIngestionPipelineService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  // ========== PHASE 2: RAG CHAT ENDPOINTS ==========

  @Post('message')
  @ApiOperation({ summary: '[Phase 2] Send a message to the CTXH RAG chatbot' })
  @ApiResponse({
    status: 200,
    description: 'Chat response with sources and follow-up suggestions',
    type: ChatResponseDto
  })
  async sendMessage(
    @Body() chatRequestDto: ChatRequestDto,
    @Req() request: Request,
  ): Promise<ChatResponseDto> {
    const userId = (request as any).user?.id;
    
    const response = await this.ctxhChatService.processMessage(
      chatRequestDto.message,
      chatRequestDto.sessionId,
      userId,
      {
        includeSourceLinks: true,
        enableMarkdown: true,
        addFollowUpSuggestions: true,
      }
    );

    return {
      sessionId: response.sessionId,
      response: response.response,
      sources: response.sources,
      responseTime: response.responseTime,
      timestamp: response.timestamp,
      followUpSuggestions: response.followUpSuggestions,
      confidence: response.confidence,
    };
  }

  @Sse('stream')
  @ApiOperation({ summary: '[Phase 2] Stream chat response with Server-Sent Events' })
  @ApiResponse({
    status: 200,
    description: 'Streamed chat response',
  })
  streamMessage(
    @Body() chatRequestDto: ChatRequestDto,
    @Req() request: Request,
  ): Observable<MessageEvent> {
    const userId = (request as any).user?.id;
    
    return new Observable(observer => {
      this.ctxhChatService.processMessage(
        chatRequestDto.message,
        chatRequestDto.sessionId,
        userId,
        {
          includeSourceLinks: true,
          enableMarkdown: true,
          addFollowUpSuggestions: true,
        }
      ).then(response => {
        // Stream response in chunks
        const chunks = response.response.split('\n');
        
        chunks.forEach((chunk, index) => {
          observer.next({
            data: {
              type: 'content',
              content: chunk,
              isLast: index === chunks.length - 1,
            }
          } as any);
        });

        // Send sources
        observer.next({
          data: {
            type: 'sources',
            sources: response.sources,
          }
        } as any);

        // Send follow-up suggestions
        observer.next({
          data: {
            type: 'suggestions',
            suggestions: response.followUpSuggestions,
          }
        } as any);

        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  @Get('history/:sessionId')
  @ApiOperation({ summary: '[Phase 2] Get conversation history with metadata' })
  @ApiResponse({
    status: 200,
    description: 'Full conversation history retrieved',
  })
  async getHistory(
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
  ) {
    const userId = (request as any).user?.id;
    const session = await this.conversationService.getOrCreateSession(userId, sessionId);
    
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      messages: session.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
      metadata: session.metadata,
      context: session.context,
    };
  }

  @Delete('session/:sessionId')
  @ApiOperation({ summary: '[Phase 2] Clear conversation session' })
  @ApiResponse({
    status: 200,
    description: 'Session cleared successfully'
  })
  async clearSession(
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    const userId = (request as any).user?.id;
    await this.ctxhChatService.clearSession(sessionId, userId);
    return { message: 'Session cleared successfully' };
  }

  @Post('feedback')
  @ApiOperation({ summary: '[Phase 2] Submit feedback for chat response' })
  @ApiResponse({
    status: 200,
    description: 'Feedback submitted successfully'
  })
  async submitFeedback(
    @Body() feedback: { 
      sessionId: string; 
      messageId?: string; 
      rating: 'positive' | 'negative'; 
      comment?: string 
    }
  ): Promise<{ message: string }> {
    await this.ctxhChatService.submitFeedback(feedback);
    return { message: 'Feedback submitted successfully' };
  }

  // ========== DATA INGESTION ENDPOINTS (PHASE 1) ==========

  @Post('ingestion/full')
  @ApiOperation({ summary: '[Phase 1] Run full ingestion pipeline for all activities' })
  @ApiResponse({
    status: 200,
    description: 'Full ingestion completed',
  })
  async runFullIngestion() {
    const result = await this.ingestionPipelineService.runFullIngestion();
    return {
      success: result.errors.length === 0,
      ...result,
    };
  }

  @Post('ingestion/incremental')
  @ApiOperation({ summary: '[Phase 1] Run incremental update for recently modified activities' })
  @ApiResponse({
    status: 200,
    description: 'Incremental update completed',
  })
  async runIncrementalUpdate(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
    
    const result = await this.ingestionPipelineService.runIncrementalUpdate(sinceDate);
    return {
      success: result.errors.length === 0,
      ...result,
    };
  }

  @Post('ingestion/activity/:activityId')
  @ApiOperation({ summary: '[Phase 1] Process a single activity' })
  @ApiResponse({
    status: 200,
    description: 'Activity processed successfully',
  })
  async processActivity(@Param('activityId') activityId: string) {
    await this.ingestionPipelineService.processActivity(activityId);
    return {
      success: true,
      message: `Activity ${activityId} processed successfully`,
    };
  }

  @Delete('ingestion/activity/:activityId')
  @ApiOperation({ summary: '[Phase 1] Delete embeddings for an activity' })
  @ApiResponse({
    status: 200,
    description: 'Activity embeddings deleted',
  })
  async deleteActivity(@Param('activityId') activityId: string) {
    await this.ingestionPipelineService.deleteActivity(activityId);
    return {
      success: true,
      message: `Embeddings for activity ${activityId} deleted successfully`,
    };
  }

  @Get('ingestion/stats')
  @ApiOperation({ summary: '[Phase 1] Get ingestion statistics' })
  @ApiResponse({
    status: 200,
    description: 'Ingestion statistics',
  })
  async getIngestionStats() {
    return this.ingestionPipelineService.getIngestionStats();
  }

  // ========== HEALTH CHECK ENDPOINTS ==========

  @Get('health')
  @ApiOperation({ summary: '[Phase 1] Health check for all pipeline components' })
  @ApiResponse({
    status: 200,
    description: 'Health check results',
  })
  async healthCheck() {
    return this.ingestionPipelineService.healthCheck();
  }

  @Get('health/embeddings')
  @ApiOperation({ summary: '[Phase 1] Health check for embedding service' })
  @ApiResponse({
    status: 200,
    description: 'Embedding service health',
  })
  async embeddingHealthCheck() {
    return this.embeddingService.healthCheck();
  }

  @Get('health/vector-store')
  @ApiOperation({ summary: '[Phase 1] Health check for vector store' })
  @ApiResponse({
    status: 200,
    description: 'Vector store health',
  })
  async vectorStoreHealthCheck() {
    return this.vectorStoreService.healthCheck();
  }

  // ========== STATS AND MONITORING ==========

  @Get('stats/storage')
  @ApiOperation({ summary: '[Phase 1] Get vector storage statistics' })
  @ApiResponse({
    status: 200,
    description: 'Storage statistics',
  })
  async getStorageStats() {
    return this.vectorStoreService.getStorageStats();
  }

  @Get('stats/cache')
  @ApiOperation({ summary: '[Phase 1] Get embedding cache statistics' })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics',
  })
  async getCacheStats() {
    return this.embeddingService.getCacheStats();
  }

  @Delete('cache/clear')
  @ApiOperation({ summary: '[Phase 1] Clear embedding cache' })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared',
  })
  async clearCache() {
    const clearedCount = await this.embeddingService.clearCache();
    return {
      success: true,
      message: `Cleared ${clearedCount} cache entries`,
      clearedCount,
    };
  }
}
