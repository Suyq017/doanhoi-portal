import { IsString, IsArray, IsNumber, IsDate, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SourceDto {
  @ApiProperty({
    description: 'Activity unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsString()
  activityId: string;

  @ApiProperty({
    description: 'Name of the CTXH activity',
    example: 'Chiến dịch Mùa hè xanh 2025',
  })
  @IsString()
  activityName: string;

  @ApiProperty({
    description: 'Organization hosting the activity',
    example: 'Đoàn Trường ĐHBK',
  })
  @IsString()
  organizationName: string;

  @ApiProperty({
    description: 'Similarity score between query and document (0-1)',
    example: 0.87,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  similarityScore: number;

  @ApiProperty({
    description: 'Optional link to activity details',
    example: '/activities/123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  link?: string;
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'Session ID for conversation tracking',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: 'Generated response from the chat agent',
    example: 'Hiện có 3 hoạt động tình nguyện đang mở đăng ký...',
  })
  @IsString()
  response: string;

  @ApiProperty({
    description: 'List of source documents used to generate the response',
    type: [SourceDto],
  })
  @IsArray()
  sources: SourceDto[];

  @ApiProperty({
    description: 'Total processing time in milliseconds',
    example: 1250,
  })
  @IsNumber()
  responseTime: number;

  @ApiProperty({
    description: 'Timestamp when response was generated',
    example: '2025-12-15T10:30:00.000Z',
  })
  @IsDate()
  timestamp: Date;

  @ApiProperty({
    description: 'Optional follow-up question suggestions',
    type: [String],
    required: false,
  })
  followUpSuggestions?: string[];

  @ApiProperty({
    description: 'Confidence score of the response (0-100)',
    example: 85,
    required: false,
  })
  confidence?: number;
}
