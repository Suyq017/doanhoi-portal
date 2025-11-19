import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { CtxhActivity } from '@/entities/ctxh-activity.entity';

@Entity('ctxh_embeddings')
@Index('idx_ctxh_embeddings_activity_id', ['activityId'])
@Index('idx_ctxh_embeddings_chunk_index', ['activityId', 'chunkIndex'])
@Index('idx_ctxh_embeddings_created_at', ['createdAt'])
export class CtxhEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'activity_id' })
  activityId: string;

  @Column('text', { name: 'content_text' })
  contentText: string;

  @Column('vector', { length: 1536 })
  embedding: number[];

  @Column('integer', { name: 'chunk_index', default: 0 })
  chunkIndex: number;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CtxhActivity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: CtxhActivity;
}