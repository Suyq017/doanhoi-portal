import { ApiProperty } from "@nestjs/swagger";
import { TemplateStatus } from "../../entities/template.entity";
import { FieldType } from "../../entities/template-field.entity";

export class TemplateFieldResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fieldName: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ enum: FieldType })
  fieldType: FieldType;

  @ApiProperty()
  position: number;

  @ApiProperty({ required: false })
  validationRules?: any;

  @ApiProperty({ required: false })
  options?: any[];

  @ApiProperty({ required: false })
  placeholder?: string;

  @ApiProperty({ required: false })
  helpText?: string;

  @ApiProperty({ required: false })
  defaultValue?: string;

  @ApiProperty()
  isVisible: boolean;
}

export class TemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  fileUrl: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty({ enum: TemplateStatus })
  status: TemplateStatus;

  @ApiProperty({ type: () => Object, required: false })
  schema?: any;

  @ApiProperty({ required: false })
  organizationId?: string;

  @ApiProperty()
  createdById: string;

  @ApiProperty({ type: [TemplateFieldResponseDto], required: false })
  fields?: TemplateFieldResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  errorMessage?: string;
}
