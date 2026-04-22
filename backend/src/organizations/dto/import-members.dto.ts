import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ImportMemberDto {
  @ApiProperty({ description: "Mã số sinh viên", example: "2052001" })
  @IsString()
  @IsNotEmpty()
  studentCode: string;

  @ApiProperty({
    description: "Mã lớp/đơn vị (chỉ cần cho level 2)",
    example: "KTPM01",
    required: false,
  })
  @IsString()
  @IsOptional()
  classOrUnitCode?: string;
}

export class ImportMembersDto {
  @ApiProperty({ description: "ID của tổ chức", example: "org-123" })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ type: [ImportMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMemberDto)
  members: ImportMemberDto[];
}

export class ValidateImportDto {
  @ApiProperty({
    description: "Session ID từ upload file",
    example: "session-123",
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class ExecuteImportDto {
  @ApiProperty({
    description: "Session ID từ upload file",
    example: "session-123",
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: "Có bỏ qua lỗi và import những record hợp lệ không",
    required: false,
    default: false,
  })
  @IsOptional()
  skipErrors?: boolean;
}
