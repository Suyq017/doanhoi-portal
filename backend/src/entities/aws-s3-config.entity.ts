import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("aws_s3_configs")
export class AwsS3Config {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "access_key_id", length: 255 })
  accessKeyId: string;

  @Column({ name: "secret_access_key", length: 255 })
  secretAccessKey: string;

  @Column({ name: "region", length: 100 })
  region: string;

  @Column({ name: "s3_bucket", length: 255 })
  s3Bucket: string;

  @Column({ name: "s3_endpoint", length: 255 })
  s3Endpoint: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
