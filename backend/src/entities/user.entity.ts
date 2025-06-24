import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { UserOrganization } from './user-organization.entity';
import { Department } from './department.entity';
import { Class } from './class.entity';

export enum UserType {
  STUDENT = 'student',
  STAFF = 'staff',
}

export enum MembershipStatus {
  DOAN_VIEN = 'doan_vien',
  HOI_VIEN = 'hoi_vien',
  BOTH = 'both',
  NONE = 'none',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // Mã số sinh viên/cán bộ

  @Column()
  familyName: string; // Họ và tên lót

  @Column()
  givenName: string; // Tên

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  password: string; // For local auth

  @Column({ nullable: true })
  googleId: string; // For Google OAuth

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.STUDENT,
  })
  userType: UserType;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.NONE,
  })
  membershipStatus: MembershipStatus;

  // Optional fields
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'managementDepartmentId' })
  managementDepartment: Department;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'trainingDepartmentId' })
  trainingDepartment: Department;

  @ManyToOne(() => Class, { nullable: true })
  @JoinColumn({ name: 'classId' })
  class: Class;

  @OneToMany('UserOrganization', 'user')
  organizations: UserOrganization[];

  // Getter cho fullName để tương thích với code cũ
  get fullName(): string {
    return `${this.familyName} ${this.givenName}`.trim();
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
