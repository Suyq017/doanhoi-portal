import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ActivityReportItemDto {
  @ApiProperty()
  @Expose()
  activity_name: string;

  @ApiProperty()
  @Expose()
  category_name: string;

  @ApiProperty()
  @Expose()
  days_completed: number;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty({ required: false })
  @Expose()
  completed_date?: Date;

  @ApiProperty()
  @Expose()
  created_at: Date;
}

export class StudentReportDto {
  @ApiProperty()
  @Expose()
  student_id: string;

  @ApiProperty()
  @Expose()
  student_code: string;

  @ApiProperty()
  @Expose()
  student_name: string;

  @ApiProperty()
  @Expose()
  student_email: string;

  @ApiProperty({ description: 'Tổng số ngày CTXH (hệ thống mới + cũ)' })
  @Expose()
  total_days_completed: number;

  @ApiProperty({ description: 'Số ngày CTXH từ hoạt động đã hoàn thành (hệ thống mới)', required: false })
  @Expose()
  ctxh_days_new_system?: number;

  @ApiProperty({ description: 'Số ngày CTXH từ hệ thống cũ', required: false })
  @Expose()
  ctxh_days_old_system?: number;

  @ApiProperty()
  @Expose()
  total_activities_participated: number;

  @ApiProperty()
  @Expose()
  required_days: number;

  @ApiProperty()
  @Expose()
  is_qualified: boolean;

  @ApiProperty({ type: [ActivityReportItemDto] })
  @Expose()
  @Type(() => ActivityReportItemDto)
  activities: ActivityReportItemDto[];
}