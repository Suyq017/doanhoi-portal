import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AddStudentDto {
  @ApiProperty({
    description: "Mã số sinh viên (MSSV)",
    example: "2150001",
  })
  @IsNotEmpty()
  @IsString()
  student_code: string;
}
