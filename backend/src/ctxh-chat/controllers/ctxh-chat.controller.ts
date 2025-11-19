import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CtxhChatService } from '@/ctxh-chat/services/ctxh-chat.service';
import { ChatMessageDto, ChatResponseDto, ConversationHistoryDto } from '../dto/chat.dto';

@ApiTags('ctxh-chat')
@Controller('api/ctxh-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CtxhChatController {
  constructor(private readonly ctxhChatService: CtxhChatService) {}

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
}