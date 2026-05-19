import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LimitConfigStatus } from "../../../entities/ctxh-limit-config.entity";
import { Transform } from "class-transformer";

export class CreateLimitConfigDto {
  @ApiProperty({
    description: "ID tổ chức (khoa/viện) áp dụng cấu hình này",
    example: "uuid-string",
  })
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @ApiProperty({
    description:
      "Số ngày CTXH tối đa mà tổ chức có thể cấp cho sinh viên trong 1 học kỳ",
    example: 50.5,
    minimum: 0.1,
  })
  @IsNotEmpty()
  @IsNumber(
    { maxDecimalPlaces: 1 },
    { message: "Số ngày phải là số thập phân với tối đa 1 chữ số thập phân" },
  )
  @Min(0.1, { message: "Số ngày tối đa phải ít nhất 0.1 ngày" })
  @Transform(({ value }) => parseFloat(value))
  max_days: number;

  @ApiPropertyOptional({
    description: "Mô tả cấu hình",
    example: "Cấu hình CTXH cho Khoa Khoa học máy tính",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Trạng thái cấu hình",
    enum: LimitConfigStatus,
    example: LimitConfigStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(LimitConfigStatus)
  status?: LimitConfigStatus;
}
