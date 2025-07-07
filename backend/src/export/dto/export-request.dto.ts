import { IsArray, IsEnum, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ExportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
}

export class ExportRequestDto {
  @ApiProperty({
    description: 'Danh sách các trường muốn xuất',
    example: ['code', 'fullName', 'email', 'phone'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất một trường để xuất' })
  @IsString({ each: true })
  fields: string[];

  @ApiProperty({
    description: 'Định dạng file xuất',
    enum: ExportFormat,
    default: ExportFormat.XLSX,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.XLSX;
}

export class ExportResponseDto {
  @ApiProperty({
    description: 'Trạng thái xuất file',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Tên file đã xuất',
    example: 'danh_sach_nguoi_dung_2025-01-07.xlsx',
    required: false,
  })
  fileName?: string;

  @ApiProperty({
    description: 'Thông báo lỗi nếu có',
    example: 'Không tìm thấy dữ liệu để xuất',
    required: false,
  })
  error?: string;
}
