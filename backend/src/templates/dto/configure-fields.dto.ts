import { IsArray, ValidateNested, IsString, IsEnum, IsOptional, IsInt, IsBoolean, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FieldType } from '../../entities/template-field.entity';

class ValidationRulesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  minLength?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  maxLength?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  min?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  max?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

class FieldOptionDto {
  @ApiProperty({ example: 'Nam' })
  @IsString()
  label: string;

  @ApiProperty({ example: 'male' })
  @IsString()
  value: string;
}

class DatePartsMappingDto {
  @ApiProperty({ 
    description: 'Original field name for day part',
    example: '1' 
  })
  @IsString()
  dayField: string;

  @ApiProperty({ 
    description: 'Original field name for month part',
    example: '2' 
  })
  @IsString()
  monthField: string;

  @ApiProperty({ 
    description: 'Original field name for year part',
    example: '3' 
  })
  @IsString()
  yearField: string;
}

export class ConfigureFieldDto {
  @ApiProperty({
    description: 'Field name extracted from template (e.g., student_name from {{student_name}})',
    example: 'student_name'
  })
  @IsString()
  @MaxLength(100)
  fieldName: string;

  @ApiProperty({
    description: 'Display name shown in form',
    example: 'Họ và tên sinh viên'
  })
  @IsString()
  @MaxLength(255)
  displayName: string;

  @ApiProperty({
    description: 'Field type',
    enum: FieldType,
    example: FieldType.TEXT
  })
  @IsEnum(FieldType)
  fieldType: FieldType;

  @ApiProperty({
    description: 'Display position in form',
    example: 0
  })
  @IsInt()
  position: number;

  @ApiProperty({ required: false, type: ValidationRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationRulesDto)
  validationRules?: ValidationRulesDto;

  @ApiProperty({ required: false, type: [FieldOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @ApiProperty({ 
    required: false, 
    type: DatePartsMappingDto,
    description: 'Mapping for DATE fields created from 3 separate fields' 
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatePartsMappingDto)
  datePartsMapping?: DatePartsMappingDto;

  @ApiProperty({ required: false, example: 'Nhập họ và tên đầy đủ' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiProperty({ required: false, example: 'Nhập đúng họ tên như trong CMND/CCCD' })
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class ConfigureFieldsDto {
  @ApiProperty({
    description: 'Array of field configurations',
    type: [ConfigureFieldDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigureFieldDto)
  fields: ConfigureFieldDto[];
}
