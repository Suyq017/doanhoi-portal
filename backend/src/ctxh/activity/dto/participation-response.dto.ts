import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ParticipationStatus } from '../../../entities/ctxh-participation.entity';

export class ParticipationResponseDto {
  @ApiProperty({
    description: 'ID của participation',
    example: 'uuid-string',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'ID hoạt động',
    example: 'uuid-string',
  })
  @Expose()
  activity_id: string;

  @ApiProperty({
    description: 'ID sinh viên',
    example: 'uuid-string',
  })
  @Expose()
  student_id: string;

  @ApiPropertyOptional({
    description: 'Mã số sinh viên',
    example: '2150001',
  })
  @Expose()
  student_code?: string;

  @ApiProperty({
    description: 'Thông tin sinh viên',
  })
  @Expose()
  student?: {
    id: string;
    student_code: string;
    full_name: string;
    email: string;
  };

  @ApiPropertyOptional({
    description: 'Số ngày CTXH thực tế',
    example: 3,
  })
  @Expose()
  actual_days?: number;

  @ApiProperty({
    description: 'Trạng thái tham gia',
    enum: ParticipationStatus,
    example: ParticipationStatus.REGISTERED,
  })
  @Expose()
  status: ParticipationStatus;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Tham gia đầy đủ và tích cực',
  })
  @Expose()
  note?: string;

  @ApiPropertyOptional({
    description: 'ID người chấm điểm',
    example: 'uuid-string',
  })
  @Expose()
  graded_by?: string;

  @ApiProperty({
    description: 'Thời gian tạo',
    example: '2024-01-01T00:00:00Z',
  })
  @Expose()
  created_at: Date;
}