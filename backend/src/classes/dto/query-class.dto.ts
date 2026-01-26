import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  IsUUID,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class QueryClassDto {
  @ApiPropertyOptional({ description: "Trang hiện tại", default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Số lượng mỗi trang", default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: "Tìm kiếm theo tên lớp" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Lọc theo năm học" })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: "Lọc theo đơn vị/khoa" })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: "Lọc theo trạng thái hoạt động" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  isActive?: boolean;
}
