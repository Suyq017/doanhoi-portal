import {
  IsString,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class OldSystemCtxhRecordDto {
  @ApiProperty({ description: "Mã số sinh viên" })
  @IsString()
  studentCode: string;

  @ApiProperty({ description: "Số ngày CTXH từ hệ thống cũ" })
  @IsNumber()
  @Min(0)
  days: number;
}

export class ImportOldSystemCtxhDto {
  @ApiProperty({
    type: [OldSystemCtxhRecordDto],
    description: "Danh sách bản ghi CTXH từ hệ thống cũ",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OldSystemCtxhRecordDto)
  records: OldSystemCtxhRecordDto[];
}

export class ImportOldSystemCtxhResultDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  successful: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ type: [String] })
  errors: string[];

  @ApiProperty()
  message: string;
}

export class ValidateOldSystemCtxhDto {
  @ApiProperty({
    type: [OldSystemCtxhRecordDto],
    description: "Danh sách bản ghi CTXH cần validate",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OldSystemCtxhRecordDto)
  records: OldSystemCtxhRecordDto[];
}

export class ValidationError {
  @ApiProperty()
  row: number;

  @ApiProperty()
  column: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  severity: "error" | "warning";
}

export class ValidateOldSystemCtxhResultDto {
  @ApiProperty()
  isValid: boolean;

  @ApiProperty()
  total: number;

  @ApiProperty()
  valid: number;

  @ApiProperty()
  invalid: number;

  @ApiProperty({ type: [ValidationError] })
  errors: ValidationError[];

  @ApiProperty({ type: [ValidationError] })
  warnings: ValidationError[];
}
