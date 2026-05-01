import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum PermissionContext {
  SYSTEM = "system", // Quyền toàn hệ thống
  ORGANIZATION = "organization", // Quyền theo tổ chức
}

@Entity("permissions")
export class Permission {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  code: string; // Ví dụ: 'users.create', 'organizations.access'

  @Column()
  name: string; // Tên hiển thị tiếng Việt

  @Column({ nullable: true })
  description: string;

  @Column()
  category: string; // 'dashboard', 'users', 'organizations', 'departments', 'classes', 'permissions'

  @Column({
    type: "enum",
    enum: PermissionContext,
    default: PermissionContext.ORGANIZATION,
  })
  context: PermissionContext; // Xác định quyền có cần context tổ chức không

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number; // Thứ tự hiển thị trong UI

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
