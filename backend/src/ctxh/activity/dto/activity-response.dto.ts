import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { ActivityStatus } from "../../../entities/ctxh-activity.entity";

export class ActivityResponseDto {
  @ApiProperty({
    description: "ID của hoạt động",
    example: "uuid-string",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "Tên hoạt động",
    example: "Hỗ trợ người già neo đơn",
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: "Mô tả hoạt động",
    example: "Hoạt động hỗ trợ người già neo đơn tại phường 1",
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: "ID danh mục",
    example: "uuid-string",
  })
  @Expose()
  category_id: string;

  @ApiProperty({
    description: "Thông tin danh mục",
  })
  @Expose()
  category?: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: "ID tổ chức",
    example: "uuid-string",
  })
  @Expose()
  organization_id: string;

  @ApiProperty({
    description: "Thông tin tổ chức",
  })
  @Expose()
  organization?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({
    description: "Ngày bắt đầu",
    example: "2024-01-01",
  })
  @Expose()
  start_date?: Date;

  @ApiPropertyOptional({
    description: "Ngày kết thúc",
    example: "2024-01-07",
  })
  @Expose()
  end_date?: Date;

  @ApiPropertyOptional({
    description: "Tổng số ngày tối đa",
    example: 3,
  })
  @Expose()
  total_days?: number;

  @ApiPropertyOptional({
    description: "Địa điểm tổ chức hoạt động",
    example: "Hội trường A1, Trường ĐH Bách Khoa TPHCM",
  })
  @Expose()
  location?: string;

  @ApiProperty({
    description: "Hoạt động có yêu cầu xét duyệt đăng ký tham gia hay không",
    example: false,
  })
  @Expose()
  requires_approval: boolean;

  @ApiPropertyOptional({
    description: "Số lượng sinh viên tối đa có thể tham gia (null = không giới hạn)",
    example: 200,
  })
  @Expose()
  max_participants?: number;

  @ApiProperty({
    description: "Trạng thái hoạt động",
    enum: ActivityStatus,
    example: ActivityStatus.ACTIVE,
  })
  @Expose()
  status: ActivityStatus;

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
    description: "Số lượng sinh viên tham gia",
    example: 25,
  })
  @Expose()
  participants_count?: number;

  @ApiPropertyOptional({
    description: "Số lượng sinh viên đã được chấm điểm",
    example: 20,
  })
  @Expose()
  graded_count?: number;
}
