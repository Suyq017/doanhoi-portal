import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";

export class RoleAssignmentDto {
  @ApiProperty({
    description: "Array of role IDs to assign",
    example: ["role-id-1", "role-id-2"],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  roleIds: string[];

  @ApiProperty({
    description:
      "Array of organization IDs for the roles. Empty array means global roles.",
    example: ["org-id-1", "org-id-2"],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  organizationIds?: string[];

  @ApiProperty({
    description:
      "Whether this is a global role assignment (ignores organizationIds)",
    example: false,
    default: false,
  })
  @IsOptional()
  isGlobal?: boolean;
}

export class GrantRolesDto {
  @ApiProperty({
    description: "User ID to grant roles to",
    example: "user-id-123",
  })
  @IsString()
  userId: string;
  @ApiProperty({
    description:
      "Array of role assignments. Empty array will remove all user roles.",
    type: [RoleAssignmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  roleAssignments: RoleAssignmentDto[];
}
