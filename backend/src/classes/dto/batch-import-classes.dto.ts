import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for individual class data in batch import
 */
export class ClassDataDto {
  @ApiProperty({
    description: "Tên lớp học",
    example: "Lớp 12A1",
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Năm học",
    example: 2024,
  })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({
    description: "Mã khoa (để tra cứu khoa)",
    example: "CNTT",
  })
  @IsOptional()
  @IsString()
  departmentCode?: string;
}

/**
 * DTO for batch information
 */
export class BatchInfoDto {
  @ApiProperty({
    description: "Số thứ tự của batch hiện tại",
    example: 1,
  })
  @IsNumber()
  batchNumber: number;

  @ApiProperty({
    description: "Tổng số batches",
    example: 5,
  })
  @IsNumber()
  totalBatches: number;

  @ApiProperty({
    description: "ID của session import",
    example: "class_import_1234567890_abc123",
  })
  @IsString()
  sessionId: string;
}

/**
 * DTO for import options
 */
export class ImportOptionsDto {
  @ApiPropertyOptional({
    description: "Bỏ qua các lớp có tên trùng lặp",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;

  @ApiPropertyOptional({
    description: "Kiểm tra mã khoa có tồn tại hay không",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  validateDepartments?: boolean;
}

/**
 * Main DTO for batch import request
 */
export class BatchImportClassesDto {
  @ApiProperty({
    description: "Danh sách lớp học cần import trong batch này",
    type: [ClassDataDto],
    example: [
      { name: "Lớp 12A1", year: 2024, departmentCode: "CNTT" },
      { name: "Lớp 12A2", year: 2024 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassDataDto)
  classes: ClassDataDto[];

  @ApiProperty({
    description: "Thông tin về batch",
    type: BatchInfoDto,
  })
  @ValidateNested()
  @Type(() => BatchInfoDto)
  batchInfo: BatchInfoDto;

  @ApiProperty({
    description: "Các tùy chọn cho quá trình import",
    type: ImportOptionsDto,
  })
  @ValidateNested()
  @Type(() => ImportOptionsDto)
  options: ImportOptionsDto;
}
