import { IsOptional, IsString, IsEnum, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { TemplateStatus } from "../../entities/template.entity";

export class UpdateTemplateDto {
  @ApiProperty({
    description: "Template name",
    example: "Sơ yếu lý lịch sinh viên (Updated)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: "Template description",
    example: "Mô tả đã cập nhật",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Template status",
    enum: TemplateStatus,
    example: TemplateStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;
}
