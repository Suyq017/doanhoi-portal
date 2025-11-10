import { IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubmissionDto {
  @ApiProperty({
    description: 'Updated form data',
    example: {
      student_name: 'Nguyễn Văn A',
      birth_date: '2000-01-15'
    },
    required: false
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, any>;
}
