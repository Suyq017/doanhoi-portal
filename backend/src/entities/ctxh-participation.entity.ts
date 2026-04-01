import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from "typeorm";
import { User } from "./user.entity";
import { CtxhActivity } from "./ctxh-activity.entity";

export enum ParticipationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  // Legacy value kept for backward compatibility with old data/scripts
  REGISTERED = "REGISTERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

@Entity("ctxh_participation")
export class CtxhParticipation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  activity_id: string;

  @Column({ type: "uuid", nullable: true })
  student_id: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  student_code: string;

  @Column({ type: "decimal", precision: 5, scale: 1, nullable: true })
  actual_days: number;

  @Column({
    type: "enum",
    enum: ParticipationStatus,
    default: ParticipationStatus.APPROVED,
  })
  status: ParticipationStatus;

  @Column({ type: "text", nullable: true })
  note: string;

  @Column({ type: "uuid", nullable: true })
  graded_by: string;

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
  @ManyToOne(() => CtxhActivity, "participations")
  @JoinColumn({ name: "activity_id" })
  activity: CtxhActivity;

  @ManyToOne(() => User)
  @JoinColumn({ name: "student_id" })
  student: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "graded_by" })
  grader: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  creator: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updated_by" })
  updater: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "deleted_by" })
  deleter: User;
}
