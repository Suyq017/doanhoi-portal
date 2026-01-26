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
import { LangChainRagChainService } from '../services/langchain-rag-chain.service';
import { LangChainIngestionService } from '../services/langchain-ingestion.service';
import { LangChainVectorStoreService } from '../services/langchain-vector-store.service';
import { LangChainMemoryService } from '../services/langchain-memory.service';
import { ChatRequestDto, ChatResponseDto } from '../dto';
import type { Request } from 'express';

@ApiTags('ctxh-chat')
@Controller('api/ctxh-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CtxhChatController {
  constructor(
    private readonly ragChainService: LangChainRagChainService,
    private readonly memoryService: LangChainMemoryService,
    private readonly ingestionService: LangChainIngestionService,
    private readonly vectorStoreService: LangChainVectorStoreService,
  ) {}

  // ========== RAG CHAT ENDPOINTS ==========

  @Post('message')
  @ApiOperation({ summary: 'Send a message to the CTXH RAG chatbot' })
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
    const sessionId = chatRequestDto.sessionId || `session_${userId}_${Date.now()}`;
    
    const response = await this.ragChainService.invoke(
      chatRequestDto.message,
      sessionId,
      {
        k: 5,
        useMMR: false,
        includeHistory: true,
      }
    );

    // Generate follow-up suggestions based on response
    const followUpSuggestions = this.generateFollowUpSuggestions(response.response);

    return {
      sessionId: response.sessionId || sessionId,
      response: response.response,
      sources: response.sources.map(doc => ({
        activityId: doc.metadata?.activityId,
        activityName: doc.metadata?.activityName,
        organizationName: doc.metadata?.organizationName,
        content: doc.pageContent.substring(0, 200) + '...',
        similarityScore: doc.metadata?.score || 0,
      })),
      responseTime: response.responseTime,
      timestamp: new Date(),
      followUpSuggestions,
      confidence: this.calculateConfidence(response.sources.length),
    };
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Stream chat response with Server-Sent Events' })
  @ApiResponse({
    status: 200,
    description: 'Streamed chat response',
  })
  streamMessage(
    @Body() chatRequestDto: ChatRequestDto,
    @Req() request: Request,
  ): Observable<MessageEvent> {
    const userId = (request as any).user?.id;
    const sessionId = chatRequestDto.sessionId || `session_${userId}_${Date.now()}`;
    
    return new Observable(observer => {
      (async () => {
        try {
          const chunks: string[] = [];
          
          for await (const chunk of this.ragChainService.stream(
            chatRequestDto.message,
            sessionId,
          )) {
            chunks.push(chunk);
            observer.next({
              data: {
                type: 'content',
                content: chunk,
                isLast: false,
              }
            } as any);
          }

          // Send completion event
          observer.next({
            data: {
              type: 'complete',
              fullResponse: chunks.join(''),
            }
          } as any);

          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }

  @Get('history/:sessionId')
  @ApiOperation({ summary: 'Get conversation history with metadata' })
  @ApiResponse({
    status: 200,
    description: 'Full conversation history retrieved',
  })
  async getHistory(
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
  ) {
    const messages = await this.memoryService.getMessages(sessionId);
    const metadata = this.memoryService.getSessionMetadata(sessionId);
    
    return {
      sessionId,
      messages: messages.map(msg => ({
        role: msg._getType() === 'human' ? 'user' : 'assistant',
        content: msg.content,
      })),
      metadata: {
        turnCount: metadata.turnCount,
        lastAccessed: metadata.lastAccessed,
      },
    };
  }

  @Delete('session/:sessionId')
  @ApiOperation({ summary: 'Clear conversation session' })
  @ApiResponse({
    status: 200,
    description: 'Session cleared successfully'
  })
  async clearSession(
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    await this.memoryService.clearMemory(sessionId);
    return { message: 'Session cleared successfully' };
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Submit feedback for chat response' })
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
    // TODO: Implement feedback storage
    console.log('Feedback received:', feedback);
    return { message: 'Feedback submitted successfully' };
  }

  // ========== DATA INGESTION ENDPOINTS ==========

  @Post('ingestion/full')
  @UseGuards() // Bỏ authentication cho ingestion endpoints
  @ApiOperation({ summary: 'Run full ingestion pipeline for all activities' })
  @ApiResponse({
    status: 200,
    description: 'Full ingestion completed',
  })
  async runFullIngestion() {
    const result = await this.ingestionService.runFullIngestion();
    return {
      success: result.errors.length === 0,
      ...result,
    };
  }

  @Post('ingestion/incremental')
  @UseGuards() // Bỏ authentication
  @ApiOperation({ summary: 'Run incremental update for recently modified activities' })
  @ApiResponse({
    status: 200,
    description: 'Incremental update completed',
  })
  async runIncrementalUpdate(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await this.ingestionService.runIncrementalUpdate(sinceDate);
    return {
      success: result.errors.length === 0,
      ...result,
    };
  }

  @Post('ingestion/activity/:activityId')
  @UseGuards() // Bỏ authentication
  @ApiOperation({ summary: 'Process a single activity' })
  @ApiResponse({
    status: 200,
    description: 'Activity processed successfully',
  })
  async processActivity(@Param('activityId') activityId: string) {
    await this.ingestionService.processActivity(activityId);
    return {
      success: true,
      message: `Activity ${activityId} processed successfully`,
    };
  }

  @Delete('ingestion/activity/:activityId')
  @ApiOperation({ summary: 'Delete embeddings for an activity' })
  @ApiResponse({
    status: 200,
    description: 'Activity embeddings deleted',
  })
  async deleteActivity(@Param('activityId') activityId: string) {
    await this.ingestionService.deleteActivity(activityId);
    return {
      success: true,
      message: `Embeddings for activity ${activityId} deleted successfully`,
    };
  }

  @Get('ingestion/stats')
  @UseGuards() // Bỏ authentication
  @ApiOperation({ summary: 'Get ingestion statistics' })
  @ApiResponse({
    status: 200,
    description: 'Ingestion statistics',
  })
  async getIngestionStats() {
    return this.ingestionService.getIngestionStats();
  }

  // ========== HEALTH CHECK ENDPOINTS ==========

  @Get('health')
  @UseGuards() // Bỏ authentication
  @ApiOperation({ summary: 'Health check for all pipeline components' })
  @ApiResponse({
    status: 200,
    description: 'Health check results',
  })
  async healthCheck() {
    return this.ingestionService.healthCheck();
  }

  @Get('health/vector-store')
  @UseGuards() // Bỏ authentication
  @ApiOperation({ summary: 'Health check for vector store' })
  @ApiResponse({
    status: 200,
    description: 'Vector store health',
  })
  async vectorStoreHealthCheck() {
    return {
      status: this.vectorStoreService.isInitialized() ? 'healthy' : 'not initialized',
      initialized: this.vectorStoreService.isInitialized(),
    };
  }

  // ========== STATS AND MONITORING ==========

  @Get('stats/memory')
  @UseGuards() // Bỏ authentication
  @ApiOperation({ summary: 'Get memory/session statistics' })
  @ApiResponse({
    status: 200,
    description: 'Memory statistics',
  })
  async getMemoryStats() {
    return this.memoryService.getStats();
  }

  @Get('stats/sessions')
  @UseGuards() // Bỏ authentication
  @ApiOperation({ summary: 'Get active sessions list' })
  @ApiResponse({
    status: 200,
    description: 'Active sessions',
  })
  async getActiveSessions() {
    const sessions = this.memoryService.getActiveSessions();
    return {
      count: sessions.length,
      sessions: sessions.slice(0, 100),
    };
  }

  // ========== HELPER METHODS ==========

  /**
   * Generate follow-up suggestions based on response
   */
  private generateFollowUpSuggestions(response: string): string[] {
    const suggestions: string[] = [];
    
    if (response.includes('hoạt động') || response.includes('CTXH')) {
      suggestions.push('Cho tôi biết thêm chi tiết về hoạt động này');
      suggestions.push('Làm sao để đăng ký tham gia?');
    }
    
    if (response.includes('ngày') || response.includes('thời gian')) {
      suggestions.push('Có hoạt động nào khác trong tháng này không?');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Có hoạt động CTXH nào đang mở đăng ký?');
      suggestions.push('Tìm hoạt động CTXH theo địa điểm');
      suggestions.push('Hoạt động nào có nhiều ngày CTXH nhất?');
    }
    
    return suggestions.slice(0, 3);
  }

  /**
   * Calculate confidence based on number of sources
   */
  private calculateConfidence(sourceCount: number): number {
    if (sourceCount === 0) return 0.3;
    if (sourceCount === 1) return 0.6;
    if (sourceCount === 2) return 0.75;
    if (sourceCount >= 3) return 0.9;
    return 0.5;
  }
}
