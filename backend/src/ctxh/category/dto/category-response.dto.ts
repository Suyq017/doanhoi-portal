import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class CategoryResponseDto {
  @ApiProperty({
    description: "ID của danh mục",
    example: "uuid-string",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "Tên danh mục",
    example: "Hoạt động tình nguyện",
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: "Mô tả danh mục",
    example: "Các hoạt động tình nguyện phục vụ cộng đồng",
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: "ID người tạo",
    example: "uuid-string",
  })
  @Expose()
  created_by: string;

  @ApiProperty({
    description: "Thời gian tạo",
    example: "2024-01-01T00:00:00Z",
  })
  @Expose()
  created_at: Date;

  @ApiPropertyOptional({
    description: "ID người cập nhật cuối",
    example: "uuid-string",
  })
  @Expose()
  updated_by?: string;

  @ApiProperty({
    description: "Thời gian cập nhật cuối",
    example: "2024-01-01T00:00:00Z",
  })
  @Expose()
  updated_at: Date;

  @ApiPropertyOptional({
    description: "Số lượng hoạt động thuộc danh mục",
    example: 5,
  })
  @Expose()
  activities_count?: number;
}
