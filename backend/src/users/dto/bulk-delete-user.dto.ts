import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class BulkDeleteUserDto {
  @ApiProperty({
    description: "Danh sách ID người dùng cần xóa",
    example: ["uuid1", "uuid2", "uuid3"],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
