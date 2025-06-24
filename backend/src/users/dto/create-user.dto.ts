import { IsString, IsEmail, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType, MembershipStatus } from '../../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: 'Mã số sinh viên/cán bộ' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Họ và tên lót' })
  @IsString()
  familyName: string;

  @ApiProperty({ description: 'Tên' })
  @IsString()
  givenName: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Số điện thoại' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Mật khẩu' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Google ID' })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiPropertyOptional({ enum: UserType, description: 'Loại người dùng' })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({ enum: MembershipStatus, description: 'Trạng thái thành viên' })
  @IsOptional()
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  @ApiPropertyOptional({ description: 'ID đơn vị quản lý' })
  @IsOptional()
  @IsUUID()
  managementDepartmentId?: string;

  @ApiPropertyOptional({ description: 'ID đơn vị đào tạo' })
  @IsOptional()
  @IsUUID()
  trainingDepartmentId?: string;

  @ApiPropertyOptional({ description: 'ID lớp' })
  @IsOptional()
  @IsUUID()
  classId?: string;
}
