import { IsNotEmpty, IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({
    description: "Tên danh mục hoạt động CTXH",
    example: "Hoạt động tình nguyện",
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Mô tả chi tiết về danh mục",
    example: "Các hoạt động tình nguyện phục vụ cộng đồng",
  })
  @IsOptional()
  @IsString()
  description?: string;
}
