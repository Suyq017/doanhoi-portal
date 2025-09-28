import { IsNotEmpty, IsInt, Min, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LimitConfigStatus } from '../../../entities/ctxh-limit-config.entity';

export class CreateLimitConfigDto {
  @ApiProperty({
    description: 'ID tổ chức (khoa/viện) áp dụng cấu hình này',
    example: 'uuid-string',
  })
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @ApiProperty({
    description: 'Số ngày CTXH tối đa mà khoa có thể cấp cho sinh viên trong 1 học kỳ',
    example: 50,
    minimum: 15,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(15, { message: 'Số ngày tối đa phải ít nhất 15 ngày (bằng yêu cầu tối thiểu)' })
  max_days_per_semester: number;

  @ApiPropertyOptional({
    description: 'Mô tả cấu hình',
    example: 'Cấu hình CTXH cho Khoa Khoa học máy tính',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái cấu hình',
    enum: LimitConfigStatus,
    example: LimitConfigStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(LimitConfigStatus)
  status?: LimitConfigStatus;
}