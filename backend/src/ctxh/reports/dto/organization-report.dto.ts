import { Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class OrganizationReportDto {
  @ApiProperty()
  @Expose()
  organization_id: string;

  @ApiProperty()
  @Expose()
  organization_name: string;

  @ApiProperty()
  @Expose()
  total_activities: number;

  @ApiProperty()
  @Expose()
  total_students_participated: number;

  @ApiProperty()
  @Expose()
  total_students_qualified: number;

  @ApiProperty()
  @Expose()
  total_days_allocated: number;

  @ApiProperty()
  @Expose()
  qualification_rate: number;

  @ApiProperty()
  @Expose()
  @Type(() => Object)
  categories_summary: {
    category_name: string;
    activities_count: number;
    participants_count: number;
    total_days_completed: number;
  }[];

  @ApiProperty()
  @Expose()
  @Type(() => Object)
  activities_detail: {
    activity_name: string;
    category_name: string;
    participants_count: number;
    completed_count: number;
    total_days_allocated: number;
    start_date?: Date;
    end_date?: Date;
  }[];
}
