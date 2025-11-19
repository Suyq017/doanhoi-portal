import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CtxhEmbedding } from '../../entities/ctxh-embedding.entity';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    @InjectRepository(CtxhEmbedding)
    private readonly embeddingRepository: Repository<CtxhEmbedding>,
  ) {}

  async storeEmbedding(
    activityId: string,
    contentText: string,
    embedding: number[],
    chunkIndex: number = 0,
    metadata: Record<string, any> = {}
  ): Promise<CtxhEmbedding> {
    // TODO: Implement in Phase 1
    this.logger.log(`Storing embedding for activity: ${activityId}`);
    
    const embeddingEntity = this.embeddingRepository.create({
      activityId,
      contentText,
      embedding,
      chunkIndex,
      metadata,
    });

    return this.embeddingRepository.save(embeddingEntity);
  }

  async deleteEmbeddingsByActivityId(activityId: string): Promise<void> {
    // TODO: Implement in Phase 1
    this.logger.log(`Deleting embeddings for activity: ${activityId}`);
    
    await this.embeddingRepository.delete({ activityId });
  }

  async getEmbeddingsByActivityId(activityId: string): Promise<CtxhEmbedding[]> {
    return this.embeddingRepository.find({
      where: { activityId },
      order: { chunkIndex: 'ASC' }
    });
  }
}