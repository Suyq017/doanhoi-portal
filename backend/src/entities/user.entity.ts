import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { UserOrganization } from './user-organization.entity';
import { Department } from './department.entity';
import { Class } from './class.entity';
import { UserRole } from './user-role.entity';

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

// New enums for import system
export enum Gender {
  NAM = 'NAM',
  NU = 'NU'
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  code: string; // Mã số sinh viên/cán bộ

  @Column()
  familyName: string; // Họ và tên lót

  @Column()
  givenName: string; // Tên

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  password: string; // For local auth

  @Column({ nullable: true })
  googleId: string; // For Google OAuth

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLogin: Date;

  @Column({ nullable: true, type: 'text' })
  refreshToken: string;

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

  @OneToMany(() => UserRole, 'user')
  userRoles: UserRole[];

  // New fields for enhanced import system
  @Column({ name: 'cccd', nullable: true })
  identityCard: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @Column({ name: 'gender', type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ name: 'nam_vao', nullable: true })
  admissionYear: string;
  //năm vào

  @Column({ name: 'nam_ctdt', nullable: true })
  curriculumYear: string;
  //năm chương trình đào tạo

  @Column({ name: 'faculty_code', nullable: true })
  facultyCode: string;
  //mã khoa

  @Column({ name: 'he_dao_tao', nullable: true })
  trainingSystem: string;
  //hệ đào tạo

  @Column({ name: 'bac_dao_tao', nullable: true })
  trainingLevel: string;
  //bậc đào tạo

  // Getter cho fullName để tương thích với code cũ
  get fullName(): string {
    return `${this.familyName} ${this.givenName}`.trim();
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
