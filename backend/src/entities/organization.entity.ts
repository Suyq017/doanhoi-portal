import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Tree,
  TreeParent,
  TreeChildren,
} from "typeorm";
import { UserOrganization } from "./user-organization.entity";

export enum OrganizationType {
  // Đoàn system
  DOAN_TRUONG = "doan_truong",
  DOAN_CO_SO = "doan_co_so",
  CHI_DOAN = "chi_doan",

  // Hội system
  HOI_SINH_VIEN_TRUONG = "hoi_sinh_vien_truong",
  LIEN_CHI_HOI = "lien_chi_hoi",
  CHI_HOI = "chi_hoi",

  // Câu lạc bộ
  CLB_TRUONG = "clb_truong",
  CLB_KHOA = "clb_khoa",
}

@Entity("organizations")
@Tree("closure-table")
export class Organization {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: OrganizationType,
  })
  type: OrganizationType;

  @Column({ nullable: true })
  code: string; // Mã tổ chức

  // Getter method to generate slug from name
  get slug(): string {
    return this.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (Vietnamese accent marks)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // Remove special chars
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/--+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ""); // Remove leading and trailing hyphens
  }

  @TreeParent()
  parent: Organization;

  @TreeChildren()
  children: Organization[];

  @OneToMany(() => UserOrganization, (userOrg) => userOrg.organization)
  members: UserOrganization[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
