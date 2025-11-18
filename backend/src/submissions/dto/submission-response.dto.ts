import { ApiProperty } from '@nestjs/swagger';
import { SubmissionStatus } from '../../entities/template-submission.entity';
import { TemplateResponseDto } from '../../templates/dto';

export class SubmissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  templateId: string;

  @ApiProperty({ type: () => TemplateResponseDto, required: false })
  template?: TemplateResponseDto;

  @ApiProperty()
  userId: string;

  @ApiProperty({ type: () => Object })
  formData: Record<string, any>;

  @ApiProperty({ required: false })
  outputFileUrl?: string;

  @ApiProperty({ required: false })
  outputFileName?: string;

  @ApiProperty({ required: false })
  outputFileSize?: number;

  @ApiProperty({ enum: SubmissionStatus })
  status: SubmissionStatus;

  @ApiProperty({ required: false })
  errorMessage?: string;

  @ApiProperty({ required: false })
  submittedAt?: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
