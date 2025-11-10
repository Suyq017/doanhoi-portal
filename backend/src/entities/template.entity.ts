import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  OneToMany,
  CreateDateColumn, 
  UpdateDateColumn, 
  JoinColumn 
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { TemplateField } from './template-field.entity';
import { TemplateSubmission } from './template-submission.entity';

export enum TemplateStatus {
  PROCESSING = 'processing',  // Đang parse file Word
  ACTIVE = 'active',          // Hoạt động, user có thể dùng
  INACTIVE = 'inactive',      // Tạm ngưng
  ERROR = 'error'             // Lỗi khi parse
}

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string; // "Sơ yếu lý lịch", "Đơn xin thực tập"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'original_file_url', type: 'varchar' })
  originalFileUrl: string; // URL trên S3: templates/abc-xyz.docx

  @Column({ name: 'original_file_name', type: 'varchar' })
  originalFileName: string; // Tên file gốc: so_yeu_ly_lich.docx

  @Column({ name: 'file_size', type: 'integer', nullable: true })
  fileSize: number; // Kích thước file (bytes)

  @Column({ 
    type: 'jsonb', 
    nullable: true, 
    comment: 'Auto-parsed schema from docxtemplater' 
  })
  schema: {
    fields: Array<{
      fieldName: string;
      position: number;
    }>;
    parsedAt: Date;
  };

  @Column({ 
    type: 'enum', 
    enum: TemplateStatus, 
    default: TemplateStatus.PROCESSING 
  })
  status: TemplateStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string; // Lưu lỗi nếu parse fail

  // Relations
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User, { eager: false, nullable: false })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, { eager: false, nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => TemplateField, field => field.template, { cascade: true })
  fields: TemplateField[];

  @OneToMany(() => TemplateSubmission, submission => submission.template)
  submissions: TemplateSubmission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
