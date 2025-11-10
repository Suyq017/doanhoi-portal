import { IsNotEmpty, IsUUID, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({
    description: 'Template ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  @IsUUID()
  templateId: string;

  @ApiProperty({
    description: 'Form data as key-value pairs matching template fields',
    example: {
      student_name: 'Nguyễn Văn A',
      birth_date: '2000-01-01',
      student_id: '2012345',
      gender: 'male'
    }
  })
  @IsNotEmpty()
  @IsObject()
  formData: Record<string, any>;
}
