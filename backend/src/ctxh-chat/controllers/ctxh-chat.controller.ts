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
import { UniversalEmbeddingsService } from '../services/universal-embeddings.service';
import { UniversalLLMService } from '../services/universal-llm.service';
import { CtxhVectorSyncService } from '../services/ctxh-vector-sync.service';
import { ChatRequestDto, ChatResponseDto } from '../dto';
import { ParticipationService } from '../../ctxh/activity/services/participation.service';
import { UserContextService } from '../services/user-context.service';
import { StaffAgentService } from '../services/staff-agent.service';
import type { Request } from 'express';

@ApiTags('ctxh-chat')
@Controller('ctxh-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CtxhChatController {
  constructor(
    private readonly ragChainService: LangChainRagChainService,
    private readonly memoryService: LangChainMemoryService,
    private readonly ingestionService: LangChainIngestionService,
    private readonly vectorStoreService: LangChainVectorStoreService,
    private readonly universalEmbeddingsService: UniversalEmbeddingsService,
    private readonly universalLLMService: UniversalLLMService,
    private readonly vectorSyncService: CtxhVectorSyncService,
    private readonly participationService: ParticipationService,
    private readonly userContextService: UserContextService,
    private readonly staffAgentService: StaffAgentService,
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
    const userType = (request as any).user?.userType;
    const sessionId = chatRequestDto.sessionId || `session_${userId}_${Date.now()}`;

    // Lấy thời gian thực (GMT+7)
    const now = new Date();
    const currentDate = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD

    // ── Route staff users to StaffAgentService ──────────────────────────────
    if (userType === 'staff') {
      const startTime = Date.now();
      const staffResponse = await this.staffAgentService.invoke(
        chatRequestDto.message,
        sessionId,
        userId,
        { currentDate },
      );
      return {
        sessionId,
        response: staffResponse,
        sources: [],
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        followUpSuggestions: [],
        confidence: 0.9,
      };
    }

    // ── Student / default flow ─────────────────────────────────────────────
    const currentDayOfWeek = now.toLocaleDateString('vi-VN', { weekday: 'long', timeZone: 'Asia/Ho_Chi_Minh' });
    const currentDatetime = now.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

    const userOrgName = await this.userContextService.getTrainingDepartmentName(userId);

    const response = await this.ragChainService.invoke(
      chatRequestDto.message,
      sessionId,
      {
        k: 5,
        useMMR: false,
        includeHistory: true,
        currentDate,
        currentDayOfWeek,
        currentDatetime,
        userOrg: userOrgName ?? undefined,
      }
    );

    // ── Handle REGISTER_ACTIVITY: call ParticipationService on behalf of user ──
    if (response.intent === 'REGISTER_ACTIVITY' && response.registrationTarget) {
      try {
        await this.participationService.registerSelf(
          String(response.registrationTarget.activityId),
          userId,
        );
        response.response = `Đã đăng ký thành công bạn vào hoạt động **${response.registrationTarget.activityName}**! Bạn có thể xem tại trang báo cáo cá nhân để xem các hoạt động đã đăng ký.`;
      } catch (err: any) {
        const errorMsg = err?.message || 'Vui lòng thử lại sau.';
        response.response = `Không thể đăng ký: ${errorMsg}`;
      }
    }

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
        similarityScore: doc.metadata?.score ?? 0,
      })),
      responseTime: response.responseTime,
      timestamp: new Date(),
      followUpSuggestions,
      confidence: this.calculateConfidence(response.sources.length),
      // Include full context text for RAGAS evaluation
      ...(chatRequestDto.evaluation_mode && {
        contexts: response.sources.map(doc => doc.pageContent),
      }),
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

    // Lấy thời gian thực (GMT+7)
    const now = new Date();
    const currentDate = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
    const currentDayOfWeek = now.toLocaleDateString('vi-VN', { weekday: 'long', timeZone: 'Asia/Ho_Chi_Minh' });
    const currentDatetime = now.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

    return new Observable(observer => {
      (async () => {
        try {
          const userOrgName = await this.userContextService.getTrainingDepartmentName(userId);
          const chunks: string[] = [];

          for await (const chunk of this.ragChainService.stream(
            chatRequestDto.message,
            sessionId,
            { currentDate, currentDayOfWeek, currentDatetime, userOrg: userOrgName ?? undefined },
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

  // ========== DATA INGESTION ENDPOINTS ==========

  @Post('ingestion/full')
  //@UseGuards() // Bỏ authentication cho ingestion endpoints
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

  // ========== QUEUE ENDPOINTS (Auto-ingestion pipeline) ==========

  @Get('ingestion/queue-status')
  @UseGuards()
  @ApiOperation({ summary: 'Get BullMQ queue stats (waiting/active/completed/failed/delayed)' })
  @ApiResponse({ status: 200, description: 'Queue statistics from Redis' })
  async getQueueStatus() {
    return this.vectorSyncService.getQueueStatus();
  }

  @Post('ingestion/force-sync-all')
  @UseGuards()
  @ApiOperation({ summary: 'Add a full re-index job to the BullMQ queue' })
  @ApiResponse({ status: 201, description: 'Full sync job queued' })
  async forceSyncAll() {
    await this.vectorSyncService.forceSyncAll();
    return { message: 'Full sync job added to queue', queueName: 'vectorize_queue' };
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

  @Get('health/models')
  @UseGuards() // Bỏ authentication
  @ApiOperation({ summary: 'Health check for AI models (Ollama/Gemini)' })
  @ApiResponse({
    status: 200,
    description: 'AI models health status',
  })
  async checkModelsHealth() {
    const embeddingsHealth = await this.universalEmbeddingsService.healthCheck();
    const llmHealth = await this.universalLLMService.healthCheck();
    const isLocalModel = this.universalEmbeddingsService.isUsingLocalModel();

    return {
      status: embeddingsHealth && llmHealth ? 'healthy' : 'unhealthy',
      modelType: isLocalModel ? 'Ollama (Local)' : 'Gemini (Cloud)',
      embeddings: {
        healthy: embeddingsHealth,
        model: this.universalEmbeddingsService.getModelName(),
        dimension: this.universalEmbeddingsService.getDimension(),
      },
      llm: {
        healthy: llmHealth,
        model: this.universalLLMService.getModelName(),
      },
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
