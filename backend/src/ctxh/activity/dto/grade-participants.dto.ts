import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GradeParticipantDto {
  @ApiProperty({
    description: "ID của participation record",
    example: "uuid-string",
  })
  @IsNotEmpty()
  @IsUUID()
  participation_id: string;

  @ApiProperty({
    description: "Số ngày CTXH thực tế của sinh viên",
    example: 3,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  actual_days: number;

  @ApiPropertyOptional({
    description: "Ghi chú về điểm số",
    example: "Tham gia đầy đủ và tích cực",
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class GradeParticipantsDto {
  @ApiProperty({
    description: "Danh sách chấm điểm",
    type: [GradeParticipantDto],
  })
  @IsNotEmpty()
  participants: GradeParticipantDto[];
}
