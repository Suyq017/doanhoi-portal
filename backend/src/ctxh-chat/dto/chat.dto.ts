import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ description: 'The user message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Session ID for conversation continuity', required: false })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class ChatResponseDto {
  @ApiProperty({ description: 'The chatbot response' })
  response: string;

  @ApiProperty({ description: 'Session ID for conversation continuity' })
  sessionId: string;

  @ApiProperty({ description: 'Source documents used for the response' })
  sources: {
    activityId: string;
    activityName: string;
    score: number;
    content: string;
  }[];

  @ApiProperty({ description: 'Response metadata' })
  metadata: {
    processingTime: number;
    model: string;
    tokensUsed?: number;
  };
}

export class ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class ConversationHistoryDto {
  @ApiProperty({ description: 'Conversation messages' })
  messages: ConversationMessage[];

  @ApiProperty({ description: 'Session metadata' })
  metadata: {
    sessionId: string;
    startTime: Date;
    lastActive: Date;
    turnCount: number;
  };
}