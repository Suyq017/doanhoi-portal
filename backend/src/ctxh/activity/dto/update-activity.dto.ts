import { PartialType } from '@nestjs/swagger';
import { CreateActivityDto } from './create-activity.dto';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  @ApiPropertyOptional({
    description: 'ID của người cập nhật',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  updated_by?: string;
}