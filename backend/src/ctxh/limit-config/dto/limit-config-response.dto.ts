import { Expose, Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LimitConfigStatus } from '../../../entities/ctxh-limit-config.entity';

export class LimitConfigResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  organization_id: string;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj.max_days) 
  maxDays: number;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  status: LimitConfigStatus;

  @ApiProperty()
  @Expose()
  created_by: string;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  created_at: Date;

  @ApiPropertyOptional()
  @Expose()
  updated_by?: string;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  updated_at?: Date;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Object)
  organization?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Object)
  creator?: {
    id: string;
    fullName: string;
    email: string;
  };
}