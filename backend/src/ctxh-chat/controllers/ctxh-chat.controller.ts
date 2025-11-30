import { Controller, Post, Get, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CtxhChatService } from '@/ctxh-chat/services/ctxh-chat.service';
import { CtxhIngestionPipelineService } from '@/ctxh-chat/services/ctxh-ingestion-pipeline.service';
import { EmbeddingService } from '@/ctxh-chat/services/embedding.service';
import { VectorStoreService } from '@/ctxh-chat/services/vector-store.service';
import { ChatMessageDto, ChatResponseDto, ConversationHistoryDto } from '../dto/chat.dto';

@ApiTags('ctxh-chat')
@Controller('api/ctxh-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CtxhChatController {
  constructor(
    private readonly ctxhChatService: CtxhChatService,
    private readonly ingestionPipelineService: CtxhIngestionPipelineService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  // ========== CHAT ENDPOINTS ==========

  @Post('message')
  @ApiOperation({ summary: 'Send a message to the CTXH chatbot' })
  @ApiResponse({
    status: 200,
    description: 'Chat response received',
    type: ChatResponseDto
  })
  async sendMessage(@Body() chatMessageDto: ChatMessageDto): Promise<ChatResponseDto> {
    return this.ctxhChatService.processMessage(chatMessageDto);
  }

  @Get('history/:sessionId')
  @ApiOperation({ summary: 'Get conversation history' })
  @ApiResponse({
    status: 200,
    description: 'Conversation history retrieved',
    type: ConversationHistoryDto
  })
  async getHistory(@Param('sessionId') sessionId: string): Promise<ConversationHistoryDto> {
    return this.ctxhChatService.getConversationHistory(sessionId);
  }

  @Delete('session/:sessionId')
  @ApiOperation({ summary: 'Clear conversation session' })
  @ApiResponse({
    status: 200,
    description: 'Session cleared successfully'
  })
  async clearSession(@Param('sessionId') sessionId: string): Promise<{ message: string }> {
    await this.ctxhChatService.clearSession(sessionId);
    return { message: 'Session cleared successfully' };
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Submit feedback for chat response' })
  async submitFeedback(
    @Body() feedback: { sessionId: string; messageId: string; rating: 'positive' | 'negative'; comment?: string }
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
