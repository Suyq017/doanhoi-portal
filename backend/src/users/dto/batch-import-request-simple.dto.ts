import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class BatchInfoDto {
  @ApiProperty({
    description: "Batch number in sequence (1, 2, 3, ...)",
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  batchNumber: number;

  @ApiProperty({
    description: "Total number of batches in this import session",
    example: 5,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  totalBatches: number;

  @ApiProperty({
    description: "Unique session ID for tracking batch imports",
    example: "import_1633024800000_abc123",
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class ImportOptionsDto {
  @ApiProperty({
    description: "Skip duplicate records instead of failing",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean = true;

  @ApiProperty({
    description: "Update existing records if found",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean = true;
}

export class UserImportDto {
  @ApiProperty({
    description: "Mã số sinh viên | mã số cán bộ",
    example: "2210000",
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: "Họ", example: "Nguyễn Văn" })
  @IsString()
  @IsNotEmpty()
  familyName: string;

  @ApiProperty({ description: "Tên", example: "An" })
  @IsString()
  @IsNotEmpty()
  givenName: string;

  @ApiProperty({
    description: "Email",
    example: "an.nguyen@hcmut.edu.vn",
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: "Số điện thoại",
    example: "0901234567",
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: "Giới tính", example: "NAM", required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({
    description: "Ngày sinh",
    example: "2004-01-01",
    required: false,
  })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiProperty({
    description: "Số cccd",
    example: "123456789",
    required: false,
  })
  @IsOptional()
  @IsString()
  identityCard?: string;

  @ApiProperty({ description: "Năm vào", example: "2023", required: false })
  @IsOptional()
  @IsString()
  admissionYear?: string;

  @ApiProperty({
    description: "Năm nhập học",
    example: "2023",
    required: false,
  })
  @IsOptional()
  @IsString()
  curriculumYear?: string;

  @ApiProperty({ description: "Mã ngành", example: "MT", required: false })
  @IsOptional()
  @IsString()
  facultyCode?: string;

  @ApiProperty({ description: "Hệ đào tạo", example: "CQ", required: false })
  @IsOptional()
  @IsString()
  trainingSystem?: string;

  @ApiProperty({ description: "Bậc đào tạo", example: "DH", required: false })
  @IsOptional()
  @IsString()
  trainingLevel?: string;

  @ApiProperty({
    description: "Mã đơn vị quản lý",
    example: "MT",
    required: false,
  })
  @IsOptional()
  @IsString()
  managementDepartment?: string;

  @ApiProperty({ description: "Mã khoa", example: "MT", required: false })
  @IsOptional()
  @IsString()
  trainingDepartment?: string;

  @ApiProperty({ description: "Tên lớp", example: "MT22KH01", required: false })
  @IsOptional()
  @IsString()
  className?: string;
}

export class BatchImportRequestDto {
  @ApiProperty({
    description: "Array of users to import (1-500 per batch)",
    type: [UserImportDto],
    minItems: 1,
    maxItems: 500,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserImportDto)
  users: UserImportDto[];

  @ApiProperty({
    description: "Batch information for tracking",
    type: BatchInfoDto,
  })
  @ValidateNested()
  @Type(() => BatchInfoDto)
  batchInfo: BatchInfoDto;

  @ApiProperty({
    description: "Import options",
    type: ImportOptionsDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImportOptionsDto)
  options?: ImportOptionsDto;
}
