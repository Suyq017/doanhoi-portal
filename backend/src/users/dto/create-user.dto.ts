import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateIf,
  ValidateNested,
  IsDateString,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { UserType, MembershipStatus, Gender } from "../../entities/user.entity";
import { UserRoleAssignmentDto } from "./user-role-assignment.dto";

export class CreateUserDto {
  @ApiProperty({ description: "Mã số sinh viên/cán bộ" })
  @IsString()
  code: string;

  @ApiProperty({ description: "Họ và tên lót" })
  @IsString()
  familyName: string;

  @ApiProperty({ description: "Tên" })
  @IsString()
  givenName: string;

  @ApiPropertyOptional({ description: "Email" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Số điện thoại" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: "Mật khẩu" })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: "Google ID" })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiPropertyOptional({ enum: UserType, description: "Loại người dùng" })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({
    enum: MembershipStatus,
    description: "Trạng thái thành viên",
  })
  @IsOptional()
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  @ApiPropertyOptional({ description: "ID đơn vị quản lý" })
  @IsOptional()
  @IsUUID()
  managementDepartmentId?: string;

  @ApiPropertyOptional({ description: "ID đơn vị đào tạo" })
  @IsOptional()
  @IsUUID()
  trainingDepartmentId?: string;

  @ApiPropertyOptional({ description: "ID lớp" })
  @IsOptional()
  @IsUUID()
  classId?: string;

  // NEW: Multiple role-organization assignments
  @ApiPropertyOptional({
    description: "Danh sách các cặp vai trò-tổ chức để gán cho người dùng",
    type: [UserRoleAssignmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserRoleAssignmentDto)
  roleAssignments?: UserRoleAssignmentDto[];

  // DEPRECATED: Single role assignment fields (keep for backward compatibility)
  @ApiPropertyOptional({
    description: "Role ID to assign to user (deprecated - use roleAssignments)",
  })
  @IsOptional()
  @ValidateIf((o, value) => value !== "" && value !== null)
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({
    description:
      "Organization context for role assignment (deprecated - use roleAssignments)",
  })
  @IsOptional()
  @ValidateIf((o, value) => value !== "" && value !== null)
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description:
      "Array of role IDs to assign to user (deprecated - use roleAssignments)",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  roles?: string[];

  // New fields for enhanced import system
  @ApiPropertyOptional({ description: "Số CMND/CCCD" })
  @IsOptional()
  @IsString()
  identityCard?: string;

  @ApiPropertyOptional({ description: "Ngày sinh (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, description: "Giới tính" })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: "Năm vào trường" })
  @IsOptional()
  @IsString()
  admissionYear?: string;

  @ApiPropertyOptional({ description: "Năm chương trình đào tạo" })
  @IsOptional()
  @IsString()
  curriculumYear?: string;

  @ApiPropertyOptional({ description: "Mã ngành" })
  @IsOptional()
  @IsString()
  facultyCode?: string;

  @ApiPropertyOptional({ description: "Hệ đào tạo" })
  @IsOptional()
  @IsString()
  trainingSystem?: string;

  @ApiPropertyOptional({ description: "Bậc đào tạo" })
  @IsOptional()
  @IsString()
  trainingLevel?: string;

  @ApiPropertyOptional({ description: "Trạng thái hoạt động của người dùng" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
