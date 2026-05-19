import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class BulkRemoveMembersDto {
  @ApiProperty({
    description: "Danh sách ID người dùng cần loại bỏ khỏi tổ chức",
    example: ["uuid1", "uuid2", "uuid3"],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  userIds: string[];
}
