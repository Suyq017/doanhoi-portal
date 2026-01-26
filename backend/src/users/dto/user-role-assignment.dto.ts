import { IsString, IsOptional, IsBoolean, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserRoleAssignmentDto {
  @ApiProperty({ description: "ID của vai trò" })
  @IsString()
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({
    description: "ID của tổ chức (null = áp dụng toàn hệ thống)",
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description: "Trạng thái kích hoạt của assignment",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
