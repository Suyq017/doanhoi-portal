import { IsString, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDepartmentDto {
  @ApiProperty({ description: "Tên đơn vị" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Mã đơn vị" })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: "Mô tả đơn vị" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Trạng thái hoạt động", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
