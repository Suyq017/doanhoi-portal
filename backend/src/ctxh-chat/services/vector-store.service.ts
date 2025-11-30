import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { CtxhEmbedding } from '../../entities/ctxh-embedding.entity';

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
  batchSize: number;
  enableTransactions: boolean;
  performanceLogging: boolean;
  autoVacuum: boolean;
  indexOptimization: {
    enabled: boolean;
    threshold: number;
  };
}

/**
 * Embedding data for storage
 */
export interface EmbeddingData {
  activityId: string;
  contentText: string;
  embedding: number[];
  chunkIndex: number;
  metadata: Record<string, any>;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  total_embeddings: number;
  unique_activities: number;
  avg_text_length: number;
  table_size: string;
}

/**
 * Bulk insert result
 */
export interface BulkInsertResult {
  success: boolean;
  insertedCount: number;
  errors: string[];
  duration: number;
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  private readonly config: VectorStoreConfig = {
    batchSize: 100,
    enableTransactions: true,
    performanceLogging: true,
    autoVacuum: true,
    indexOptimization: {
      enabled: true,
      threshold: 1000,
    },
  };

  constructor(
    @InjectRepository(CtxhEmbedding)
    private readonly embeddingRepository: Repository<CtxhEmbedding>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Store a single embedding
   */
  async storeEmbedding(
    activityId: string,
    contentText: string,
    embedding: number[],
    chunkIndex: number = 0,
    metadata: Record<string, any> = {}
  ): Promise<CtxhEmbedding> {
    this.logger.debug(`Storing embedding for activity: ${activityId}, chunk: ${chunkIndex}`);

    const embeddingEntity = this.embeddingRepository.create({
      activityId,
      contentText,
      embedding,
      chunkIndex,
      metadata,
    });

    return this.embeddingRepository.save(embeddingEntity);
  }

  /**
   * Store multiple embeddings in bulk with transaction
   */
  async storeEmbeddings(embeddingDataList: EmbeddingData[]): Promise<BulkInsertResult> {
    const startTime = Date.now();
    
    this.logger.log(`Starting bulk insert of ${embeddingDataList.length} embeddings...`);

    const result: BulkInsertResult = {
      success: false,
      insertedCount: 0,
      errors: [],
      duration: 0,
    };

    if (embeddingDataList.length === 0) {
      result.success = true;
      result.duration = Date.now() - startTime;
      return result;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    if (this.config.enableTransactions) {
      await queryRunner.startTransaction();
    }

    try {
      // Process in batches
      for (let i = 0; i < embeddingDataList.length; i += this.config.batchSize) {
        const batch = embeddingDataList.slice(i, i + this.config.batchSize);
        const batchNumber = Math.floor(i / this.config.batchSize) + 1;
        const totalBatches = Math.ceil(embeddingDataList.length / this.config.batchSize);

        this.logger.debug(`Inserting batch ${batchNumber}/${totalBatches} (${batch.length} records)`);

        // Build values string for raw query (more performant than ORM for bulk inserts)
        const values = batch
          .map((emb) => {
            const embeddingArray = `[${emb.embedding.join(',')}]`;
            const metadataJson = JSON.stringify(emb.metadata).replace(/'/g, "''");
            const contentText = emb.contentText.replace(/'/g, "''");
            
            return `('${emb.activityId}', '${contentText}', '${embeddingArray}', ${emb.chunkIndex}, '${metadataJson}')`;
          })
          .join(',');

        const query = `
          INSERT INTO ctxh_embeddings (activity_id, content_text, embedding, chunk_index, metadata)
          VALUES ${values}
        `;

        await queryRunner.query(query);
        result.insertedCount += batch.length;
      }

      if (this.config.enableTransactions) {
        await queryRunner.commitTransaction();
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      this.logger.log(
        `Bulk insert completed: ${result.insertedCount} embeddings in ${result.duration}ms`
      );

      // Check if we should optimize indexes
      if (this.config.indexOptimization.enabled && 
          result.insertedCount >= this.config.indexOptimization.threshold) {
        await this.optimizeIndexes();
      }

    } catch (error) {
      if (this.config.enableTransactions) {
        await queryRunner.rollbackTransaction();
      }
      
      this.logger.error('Bulk insert failed:', error);
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      
      throw new Error(`Vector store bulk insert failed: ${error.message}`);
    } finally {
      await queryRunner.release();
    }

    return result;
  }

  /**
   * Update embeddings for a specific activity
   */
  async updateActivityEmbeddings(
    activityId: string,
    newEmbeddingData: EmbeddingData[]
  ): Promise<void> {
    this.logger.log(`Updating embeddings for activity: ${activityId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete old embeddings
      await queryRunner.query('DELETE FROM ctxh_embeddings WHERE activity_id = $1', [activityId]);

      // Insert new embeddings
      if (newEmbeddingData.length > 0) {
        const values = newEmbeddingData
          .map((emb) => {
            const embeddingArray = `[${emb.embedding.join(',')}]`;
            const metadataJson = JSON.stringify(emb.metadata).replace(/'/g, "''");
            const contentText = emb.contentText.replace(/'/g, "''");
            
            return `('${emb.activityId}', '${contentText}', '${embeddingArray}', ${emb.chunkIndex}, '${metadataJson}')`;
          })
          .join(',');

        const query = `
          INSERT INTO ctxh_embeddings (activity_id, content_text, embedding, chunk_index, metadata)
          VALUES ${values}
        `;

        await queryRunner.query(query);
      }

      await queryRunner.commitTransaction();
      
      this.logger.log(
        `Updated ${newEmbeddingData.length} embeddings for activity ${activityId}`
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update embeddings for activity ${activityId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete embeddings for a specific activity
   */
  async deleteEmbeddingsByActivityId(activityId: string): Promise<void> {
    this.logger.log(`Deleting embeddings for activity: ${activityId}`);

    const result = await this.embeddingRepository.delete({ activityId });
    
    this.logger.log(`Deleted ${result.affected || 0} embeddings for activity ${activityId}`);
  }

  /**
   * Delete multiple activities' embeddings
   */
  async deleteMultipleActivities(activityIds: string[]): Promise<number> {
    if (activityIds.length === 0) {
      return 0;
    }

    this.logger.log(`Deleting embeddings for ${activityIds.length} activities...`);

    const result = await this.embeddingRepository
      .createQueryBuilder()
      .delete()
      .where('activity_id IN (:...ids)', { ids: activityIds })
      .execute();

    const deletedCount = result.affected || 0;
    this.logger.log(`Deleted ${deletedCount} embeddings`);

    return deletedCount;
  }

  /**
   * Get embeddings for a specific activity
   */
  async getEmbeddingsByActivityId(activityId: string): Promise<CtxhEmbedding[]> {
    return this.embeddingRepository.find({
      where: { activityId },
      order: { chunkIndex: 'ASC' },
    });
  }

  /**
   * Check if activity has embeddings
   */
  async hasEmbeddings(activityId: string): Promise<boolean> {
    const count = await this.embeddingRepository.count({
      where: { activityId },
    });
    
    return count > 0;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const stats = await this.embeddingRepository.query(`
      SELECT 
        COUNT(*) as total_embeddings,
        COUNT(DISTINCT activity_id) as unique_activities,
        AVG(LENGTH(content_text)) as avg_text_length,
        pg_size_pretty(pg_total_relation_size('ctxh_embeddings')) as table_size
      FROM ctxh_embeddings
    `);

    return stats[0];
  }

  /**
   * Get detailed statistics by activity
   */
  async getActivityStats(): Promise<Array<{
    activity_id: string;
    chunk_count: number;
    total_text_length: number;
    last_updated: Date;
  }>> {
    return this.embeddingRepository.query(`
      SELECT 
        activity_id,
        COUNT(*) as chunk_count,
        SUM(LENGTH(content_text)) as total_text_length,
        MAX(updated_at) as last_updated
      FROM ctxh_embeddings
      GROUP BY activity_id
      ORDER BY last_updated DESC
      LIMIT 100
    `);
  }

  /**
   * Optimize vector search indexes
   */
  private async optimizeIndexes(): Promise<void> {
    this.logger.log('Optimizing vector search indexes...');

    try {
      // Analyze table for query planner
      await this.embeddingRepository.query('ANALYZE ctxh_embeddings');

      // Vacuum if enabled
      if (this.config.autoVacuum) {
        // Note: VACUUM cannot run inside a transaction
        await this.embeddingRepository.query('VACUUM ANALYZE ctxh_embeddings');
      }

      this.logger.log('Index optimization completed');
    } catch (error) {
      this.logger.error('Failed to optimize indexes:', error);
    }
  }

  /**
   * Perform similarity search (basic - will be enhanced in Phase 2)
   */
  async similaritySearch(
    queryEmbedding: number[],
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<CtxhEmbedding[]> {
    // This is a placeholder - full implementation in Phase 2
    const query = `
      SELECT *, 
             1 - (embedding <=> $1::vector) as similarity
      FROM ctxh_embeddings
      WHERE 1 - (embedding <=> $1::vector) > $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `;

    const embeddingVector = `[${queryEmbedding.join(',')}]`;
    
    return this.embeddingRepository.query(query, [embeddingVector, threshold, limit]);
  }

  /**
   * Get total count of embeddings
   */
  async getTotalCount(): Promise<number> {
    return this.embeddingRepository.count();
  }

  /**
   * Clear all embeddings (use with caution!)
   */
  async clearAllEmbeddings(): Promise<number> {
    this.logger.warn('Clearing ALL embeddings from database...');
    
    const result = await this.embeddingRepository
      .createQueryBuilder()
      .delete()
      .execute();

    const deletedCount = result.affected || 0;
    this.logger.warn(`Cleared ${deletedCount} embeddings`);

    return deletedCount;
  }

  /**
   * Get configuration
   */
  getConfig(): VectorStoreConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<VectorStoreConfig>): void {
    Object.assign(this.config, updates);
    this.logger.log('Vector store config updated', updates);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const stats = await this.getStorageStats();
      
      return {
        status: 'healthy',
        details: {
          connected: true,
          totalEmbeddings: stats.total_embeddings,
          uniqueActivities: stats.unique_activities,
          tableSize: stats.table_size,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
        },
      };
    }
  }
}
