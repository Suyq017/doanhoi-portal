import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ErrorMessages } from "../../common/constants/error-messages";

export class CreateTemplateDto {
  @ApiProperty({
    description: "Template name",
    example: "Sơ yếu lý lịch sinh viên",
    maxLength: 255,
  })
  @IsNotEmpty({ message: ErrorMessages.TEMPLATE_NAME_REQUIRED })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: "Template description",
    example: "Mẫu sơ yếu lý lịch dành cho sinh viên",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description:
      "Organization ID (optional, for organization-specific templates)",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: false,
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
