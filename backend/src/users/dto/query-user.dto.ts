import { IsOptional, IsString, IsEnum, IsNumber, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { UserType, MembershipStatus } from "../../entities/user.entity";

export class QueryUserDto {
  @ApiPropertyOptional({ description: "Trang hiện tại", default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Số lượng mỗi trang", default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: "Tìm kiếm theo tên, email, mã số" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: UserType,
    description: "Lọc theo loại người dùng",
  })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({
    enum: MembershipStatus,
    description: "Lọc theo trạng thái thành viên",
  })
  @IsOptional()
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;
}
