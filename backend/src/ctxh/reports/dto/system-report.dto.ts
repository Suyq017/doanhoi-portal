import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SystemReportDto {
  @ApiProperty()
  @Expose()
  total_categories: number;

  @ApiProperty()
  @Expose()
  total_activities: number;

  @ApiProperty()
  @Expose()
  total_participations: number;

  @ApiProperty()
  @Expose()
  total_completed_participations: number;

  @ApiProperty()
  @Expose()
  total_students_registered: number;

  @ApiProperty()
  @Expose()
  total_students_qualified: number;

  @ApiProperty()
  @Expose()
  overall_qualification_rate: number;

  @ApiProperty()
  @Expose()
  total_days_allocated: number;

  @ApiProperty()
  @Expose()
  @Type(() => Object)
  categories_summary: {
    category_id: string;
    category_name: string;
    activities_count: number;
    participants_count: number;
    total_days_allocated: number;
  }[];

  @ApiProperty()
  @Expose()
  @Type(() => Object)
  monthly_stats: {
    month: string;
    activities_created: number;
    new_participants: number;
    completed_activities: number;
  }[];
}