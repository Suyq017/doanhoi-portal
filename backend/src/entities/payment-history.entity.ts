import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { PaymentAssignment } from "./payment-assignment.entity";

export enum PaymentHistoryStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export enum PaymentMethod {
  MANUAL = "MANUAL", // Đóng thủ công
  ONLINE = "ONLINE", // Đóng online
}

@Entity("payment_history")
export class PaymentHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  assignment_id: string;

  @Column("decimal", { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: "enum",
    enum: PaymentHistoryStatus,
    default: PaymentHistoryStatus.PENDING,
  })
  status: PaymentHistoryStatus;

  @Column({
    type: "enum",
    enum: PaymentMethod,
    default: PaymentMethod.ONLINE,
  })
  payment_method: PaymentMethod;

  @Column("bigint", { unique: true })
  order_code: number;

  @Column("timestamp", { nullable: true })
  paid_at: Date;

  // PayOS Configuration fields
  @Column("varchar", { length: 255, nullable: true })
  client_id: string;

  @Column("varchar", { length: 255, nullable: true })
  api_key: string;

  @Column("varchar", { length: 255, nullable: true })
  checksum_key: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => PaymentAssignment, { eager: true })
  @JoinColumn({ name: "assignment_id" })
  assignment: PaymentAssignment;
}
