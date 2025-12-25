import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from "typeorm";
import { Template } from "./template.entity";
import { User } from "./user.entity";

export enum SubmissionStatus {
  DRAFT = "draft", // Đang lưu nháp
  SUBMITTED = "submitted", // Đã nộp, đang generate
  COMPLETED = "completed", // Đã hoàn thành, có file
  FAILED = "failed", // Lỗi khi generate
}

@Entity("template_submissions")
@Index(["userId", "createdAt"]) // Index cho query submissions của user
@Index(["templateId", "status"]) // Index cho query submissions theo template
export class TemplateSubmission {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "template_id", type: "uuid" })
  templateId: string;

  @ManyToOne(() => Template, (template) => template.submissions, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: "template_id" })
  template: Template;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => User, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    name: "form_data",
    type: "jsonb",
    comment:
      'User input data: {student_name: "Nguyễn Văn A", birth_date: "2000-01-01", ...}',
  })
  formData: Record<string, any>;

  @Column({ name: "output_file_url", type: "varchar", nullable: true })
  outputFileUrl: string; // URL file Word kết quả trên S3

  @Column({ name: "output_file_name", type: "varchar", nullable: true })
  outputFileName: string; // Tên file kết quả: so_yeu_ly_lich_nguyen_van_a.docx

  @Column({ name: "output_file_size", type: "integer", nullable: true })
  outputFileSize: number; // Kích thước file output (bytes)

  @Column({
    type: "enum",
    enum: SubmissionStatus,
    default: SubmissionStatus.DRAFT,
  })
  status: SubmissionStatus;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage: string; // Lưu lỗi nếu generate fail

  @Column({ name: "submitted_at", type: "timestamp", nullable: true })
  submittedAt: Date; // Thời gian submit (chuyển từ draft -> submitted)

  @Column({ name: "completed_at", type: "timestamp", nullable: true })
  completedAt: Date; // Thời gian hoàn thành generate

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
