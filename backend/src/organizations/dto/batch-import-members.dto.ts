import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class OrganizationMemberDataDto {
  @ApiProperty({ description: "Mã số sinh viên", example: "SV001" })
  @IsString()
  studentCode: string;

  @ApiProperty({
    description: "Mã lớp/đơn vị (bắt buộc cho Level 2)",
    example: "CNTT01",
    required: false,
  })
  @IsOptional()
  @IsString()
  classOrUnitCode?: string;
}

export class BatchInfoDto {
  @ApiProperty({ description: "Số thứ tự của batch", example: 1 })
  @IsNumber()
  batchNumber: number;

  @ApiProperty({ description: "Tổng số batch", example: 5 })
  @IsNumber()
  totalBatches: number;

  @ApiProperty({
    description: "ID của session import",
    example: "org_import_1234567890_abc123",
  })
  @IsString()
  sessionId: string;
}

export class ImportOptionsDto {
  @ApiProperty({
    description: "Cấp độ tổ chức (2 hoặc 3)",
    example: 2,
    enum: [2, 3],
  })
  @IsNumber()
  @IsIn([2, 3])
  level: 2 | 3;

  @ApiProperty({
    description: "ID của tổ chức đích (bắt buộc cho Level 3)",
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    description: "Bỏ qua các bản ghi trùng lặp",
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;

  @ApiProperty({
    description: "Kiểm tra các quy tắc nghiệp vụ",
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  validateBusinessRules?: boolean;
}

export class BatchImportMembersDto {
  @ApiProperty({
    description: "Danh sách thành viên cần import",
    type: [OrganizationMemberDataDto],
    example: [
      { studentCode: "SV001", classOrUnitCode: "CNTT01" },
      { studentCode: "SV002", classOrUnitCode: "CNTT02" },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrganizationMemberDataDto)
  members: OrganizationMemberDataDto[];

  @ApiProperty({ description: "Thông tin batch", type: BatchInfoDto })
  @ValidateNested()
  @Type(() => BatchInfoDto)
  batchInfo: BatchInfoDto;

  @ApiProperty({ description: "Các tùy chọn import", type: ImportOptionsDto })
  @ValidateNested()
  @Type(() => ImportOptionsDto)
  options: ImportOptionsDto;
}
