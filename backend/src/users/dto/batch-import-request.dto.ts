import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested, Min, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BatchInfoDto {
  @ApiProperty({
    description: 'Batch number in sequence (1, 2, 3, ...)',
    example: 1,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  batchNumber: number;

  @ApiProperty({
    description: 'Total number of batches in this import session',
    example: 5,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  totalBatches: number;

  @ApiProperty({
    description: 'Unique session ID for tracking batch imports',
    example: 'import_1633024800000_abc123'
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class ImportOptionsDto {
  @ApiProperty({
    description: 'Skip duplicate records instead of failing',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean = true;

  @ApiProperty({
    description: 'Update existing records if found',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean = true;
}

export class UserImportDto {
  // Required fields
  @ApiProperty({ description: 'Student ID', example: 'SV001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Family name and middle name', example: 'Nguyễn Văn' })
  @IsString()
  @IsNotEmpty()
  familyName: string;

  @ApiProperty({ description: 'Given name', example: 'An' })
  @IsString()
  @IsNotEmpty()
  givenName: string;

  // Optional fields that exist in User entity
  @ApiProperty({ description: 'Email address', example: 'sv001@example.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Phone number', example: '0123456789', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Gender (NAM/NU)', example: 'NAM', required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ description: 'Date of birth', example: '2000-01-01', required: false })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiProperty({ description: 'National ID number', example: '123456789', required: false })
  @IsOptional()
  @IsString()
  identityCard?: string;

  @ApiProperty({ description: 'Admission year', example: '2023', required: false })
  @IsOptional()
  @IsString()
  admissionYear?: string;

  @ApiProperty({ description: 'Curriculum year', example: '2023', required: false })
  @IsOptional()
  @IsString()
  curriculumYear?: string;

  @ApiProperty({ description: 'Faculty code', example: 'CNTT', required: false })
  @IsOptional()
  @IsString()
  facultyCode?: string;

  @ApiProperty({ description: 'Training system (CQ/VLVH/QT/DTTX)', example: 'CQ', required: false })
  @IsOptional()
  @IsString()
  trainingSystem?: string;

  @ApiProperty({ description: 'Training level (DH)', example: 'DH', required: false })
  @IsOptional()
  @IsString()
  trainingLevel?: string;

  // Reference fields (for resolving relationships)
  @ApiProperty({ description: 'Department code', example: 'DEPT001', required: false })
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiProperty({ description: 'Class name', example: 'CNTT2023', required: false })
  @IsOptional()
  @IsString()
  className?: string;
}

export class BatchImportRequestDto {
  @ApiProperty({
    description: 'Array of users to import (max 200 per batch)',
    type: [UserImportDto],
    maxItems: 200,
    minItems: 1
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 user required per batch' })
  @ArrayMaxSize(200, { message: 'Maximum 200 users per batch' })
  @ValidateNested({ each: true })
  @Type(() => UserImportDto)
  users: UserImportDto[];

  @ApiProperty({
    description: 'Batch information for tracking',
    type: BatchInfoDto
  })
  @ValidateNested()
  @Type(() => BatchInfoDto)
  batchInfo: BatchInfoDto;

  @ApiProperty({
    description: 'Import options',
    type: ImportOptionsDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImportOptionsDto)
  options?: ImportOptionsDto;
}