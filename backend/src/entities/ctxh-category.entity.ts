import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("ctxh_category")
export class CtxhCategory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  // Không cần organization_id vì chỉ có trường mới có thể tạo categories

  // Audit fields
  @Column({ type: "uuid" })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: "uuid", nullable: true })
  updated_by: string;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: "uuid", nullable: true })
  deleted_by: string;

  @DeleteDateColumn()
  deleted_at: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  creator: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updated_by" })
  updater: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "deleted_by" })
  deleter: User;

  @OneToMany("CtxhActivity", "category")
  activities: any[];
}
