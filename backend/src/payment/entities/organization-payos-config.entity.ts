import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Organization } from '../../entities/organization.entity';

@Entity('organization_payos_configs')
@Index(['organization_id'], { unique: true })
export class OrganizationPayOSConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organization_id: string;

  @Column({ type: 'varchar', length: 255 })
  client_id: string;

  @Column({ type: 'varchar', length: 255 })
  api_key: string;

  @Column({ type: 'varchar', length: 255 })
  checksum_key: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
