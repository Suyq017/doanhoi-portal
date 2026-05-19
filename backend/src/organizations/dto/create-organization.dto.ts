import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrganizationType } from "../../entities/organization.entity";

export class CreateOrganizationDto {
  @ApiProperty({ description: "Tên tổ chức" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Mô tả tổ chức" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: OrganizationType, description: "Loại tổ chức" })
  @IsEnum(OrganizationType)
  type: OrganizationType;

  @ApiPropertyOptional({ description: "Mã tổ chức" })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: "ID tổ chức cha" })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: "Trạng thái hoạt động", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
