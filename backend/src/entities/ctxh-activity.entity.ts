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
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';

export enum ActivityStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('ctxh_activity')
export class CtxhActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid' })
  category_id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({ type: 'int', nullable: true })
  total_days: number;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.DRAFT,
  })
  status: ActivityStatus;

  // Audit fields
  @Column({ type: 'uuid' })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string;

  @DeleteDateColumn()
  deleted_at: Date;

  // Relations
  @ManyToOne('CtxhCategory', 'activities', { eager: false })
  @JoinColumn({ name: 'category_id' })
  category: any;

  @ManyToOne(() => Organization, { eager: false })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deleted_by' })
  deleter: User;

  @OneToMany('CtxhParticipation', 'activity')
  participations: any[];
}
