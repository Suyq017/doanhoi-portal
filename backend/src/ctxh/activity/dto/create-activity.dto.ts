import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ActivityStatus } from "../../../entities/ctxh-activity.entity";
import { Transform } from "class-transformer";

export class CreateActivityDto {
  @ApiProperty({
    description: "Tên hoạt động CTXH",
    example: "Mùa Hè Xanh 2024",
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Mô tả chi tiết hoạt động",
    example: "Hoạt động Mùa Hè Xanh tại các vùng sâu vùng xa",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "ID danh mục hoạt động",
    example: "uuid-string",
  })
  @IsNotEmpty()
  @IsUUID()
  category_id: string;

  @ApiProperty({
    description: "ID tổ chức/khoa tổ chức",
    example: "uuid-string",
  })
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @ApiPropertyOptional({
    description: "Ngày bắt đầu hoạt động",
    example: "2024-01-01",
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: "Ngày kết thúc hoạt động",
    example: "2024-01-07",
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: "Tổng số ngày CTXH tối đa SV có thể nhận",
    example: 3.5,
    minimum: 0.1,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 1 },
    { message: "Số ngày phải là số thập phân với tối đa 1 chữ số thập phân" },
  )
  @Min(0.1, { message: "Số ngày phải ít nhất 0.1" })
  @Transform(({ value }) => parseFloat(value))
  total_days?: number;

  @ApiPropertyOptional({
    description: "Địa điểm tổ chức hoạt động",
    example: "Hội trường A1, Trường ĐH Bách Khoa TPHCM",
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: "Hoạt động có yêu cầu xét duyệt đăng ký tham gia hay không",
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return value;
  })
  @IsBoolean()
  requires_approval?: boolean;

  @ApiPropertyOptional({
    description: "Số lượng sinh viên tối đa có thể tham gia (null = không giới hạn)",
    example: 200,
    minimum: 0,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === "") return undefined;
    return parseInt(value, 10);
  })
  @IsInt({ message: "Số lượng tối đa phải là số nguyên" })
  @Min(0, { message: "Số lượng tối đa phải lớn hơn hoặc bằng 0" })
  max_participants?: number;

  @ApiPropertyOptional({
    description: "Trạng thái hoạt động",
    enum: ActivityStatus,
    example: ActivityStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;
}
