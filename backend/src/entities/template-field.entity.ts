import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne,
  CreateDateColumn, 
  JoinColumn, 
  Index 
} from 'typeorm';
import { Template } from './template.entity';

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  EMAIL = 'email',
  PHONE = 'phone',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

@Entity('template_fields')
@Index(['templateId', 'position']) // Index cho sort nhanh
export class TemplateField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => Template, template => template.fields, { 
    onDelete: 'CASCADE',
    nullable: false 
  })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @Column({ name: 'field_name', type: 'varchar', length: 100 })
  fieldName: string; // student_name (từ {{student_name}})

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string; // "Họ và tên sinh viên"

  @Column({ 
    name: 'field_type', 
    type: 'enum', 
    enum: FieldType, 
    default: FieldType.TEXT 
  })
  fieldType: FieldType;

  @Column({ 
    name: 'validation_rules', 
    type: 'jsonb', 
    nullable: true,
    comment: 'Validation rules: {required, minLength, maxLength, pattern, min, max}'
  })
  validationRules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string; // Regex pattern
    min?: number;     // For number fields
    max?: number;     // For number fields
    message?: string; // Custom error message
  };

  @Column({ 
    name: 'options', 
    type: 'jsonb', 
    nullable: true,
    comment: 'Options for select/radio: [{label, value}]'
  })
  options: Array<{
    label: string;
    value: string;
  }>;

  @Column({ 
    name: 'date_parts_mapping', 
    type: 'jsonb', 
    nullable: true,
    comment: 'Mapping for DATE fields created from 3 separate fields: {dayField, monthField, yearField}'
  })
  datePartsMapping?: {
    dayField: string;    // Tên field gốc cho ngày (ví dụ: "1", "day", "ngay")
    monthField: string;  // Tên field gốc cho tháng (ví dụ: "2", "month", "thang")
    yearField: string;   // Tên field gốc cho năm (ví dụ: "3", "year", "nam")
  };

  @Column({ type: 'integer', default: 0 })
  position: number; // Thứ tự hiển thị trong form (0, 1, 2...)

  @Column({ type: 'varchar', length: 255, nullable: true })
  placeholder: string; // Placeholder text cho input

  @Column({ name: 'help_text', type: 'text', nullable: true })
  helpText: string; // Text hướng dẫn dưới field

  @Column({ name: 'default_value', type: 'varchar', nullable: true })
  defaultValue: string; // Giá trị mặc định

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean; // Có hiển thị field này không

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
