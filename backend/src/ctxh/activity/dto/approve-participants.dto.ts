import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsUUID } from "class-validator";

export class ApproveParticipantsDto {
  @ApiProperty({
    description: "Danh sách participation ID cần duyệt",
    example: [
      "2f12cc3d-6f4e-4f4f-a7f3-2c1d672e7d2e",
      "8f2e4f72-2ac8-49bb-b16b-d53e4fb51e9e",
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  participation_ids: string[];
}
