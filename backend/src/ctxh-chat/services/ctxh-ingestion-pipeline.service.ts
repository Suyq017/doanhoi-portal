import { Injectable, Logger } from '@nestjs/common';
import { CtxhDataPreparationService } from './ctxh-data-preparation.service';
import { CtxhChunkingService, ChunkResult } from './ctxh-chunking.service';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService, EmbeddingData } from './vector-store.service';

/**
 * Ingestion configuration
 */
export interface IngestionConfig {
  batchSize: number;
  maxConcurrency: number;
  progressReporting: boolean;
  errorHandling: {
    continueOnError: boolean;
    maxErrors: number;
    retryFailedItems: boolean;
  };
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  totalActivities: number;
  processedActivities: number;
  totalEmbeddings: number;
  errors: string[];
  duration: number;
  startTime: Date;
  endTime?: Date;
}

/**
 * Ingestion progress callback
 */
export interface IngestionProgress {
  current: number;
  total: number;
  percentage: number;
  currentActivity: string;
  phase: 'preparation' | 'chunking' | 'embedding' | 'storage';
}

@Injectable()
export class CtxhIngestionPipelineService {
  private readonly logger = new Logger(CtxhIngestionPipelineService.name);

  private readonly config: IngestionConfig = {
    batchSize: 50,
    maxConcurrency: 5,
    progressReporting: true,
    errorHandling: {
      continueOnError: true,
      maxErrors: 10,
      retryFailedItems: false,
    },
  };

  constructor(
    private readonly dataPreparationService: CtxhDataPreparationService,
    private readonly chunkingService: CtxhChunkingService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  /**
   * Run full ingestion pipeline for all activities
   */
  async runFullIngestion(): Promise<IngestionResult> {
    const startTime = Date.now();
    const result: IngestionResult = {
      totalActivities: 0,
      processedActivities: 0,
      totalEmbeddings: 0,
      errors: [],
      duration: 0,
      startTime: new Date(),
    };

    this.logger.log('🚀 Starting full ingestion pipeline...');

    try {
      // Step 1: Data Preparation
      this.logger.log('📋 Step 1/4: Data Preparation');
      const activities = await this.dataPreparationService.getAllActivities();
      result.totalActivities = activities.length;
      
      this.logger.log(`Found ${activities.length} activities to process`);

      if (activities.length === 0) {
        this.logger.warn('No activities found to process');
        result.duration = Date.now() - startTime;
        result.endTime = new Date();
        return result;
      }

      // Step 2: Prepare activity data
      this.logger.log('📝 Step 2/4: Formatting activities');
      const preparedData = await this.dataPreparationService.prepareMultipleActivities(activities);

      // Step 3: Chunking
      this.logger.log('✂️ Step 3/4: Text chunking');
      const chunkResults = await this.chunkingService.processActivities(preparedData);
      
      const chunkStats = this.chunkingService.getChunkingStats(chunkResults);
      this.logger.log(
        `Chunking complete: ${chunkStats.totalChunks} chunks, ` +
        `avg ${chunkStats.avgTokensPerChunk} tokens/chunk`
      );

      // Step 4: Embedding Generation
      this.logger.log('🤖 Step 4/4: Generating embeddings and storing...');
      
      // Process in batches
      const embeddingDataList: EmbeddingData[] = [];
      
      for (const chunkResult of chunkResults) {
        try {
          const texts = chunkResult.chunks.map(c => c.text);
          const batchResult = await this.embeddingService.batchGenerateEmbeddings(texts);

          // Combine embeddings with chunk data
          for (let i = 0; i < batchResult.results.length; i++) {
            const embResult = batchResult.results[i];
            const chunk = chunkResult.chunks[i];

            embeddingDataList.push({
              activityId: chunkResult.activityId,
              contentText: chunk.text,
              embedding: embResult.embedding,
              chunkIndex: chunk.index,
              metadata: chunk.metadata,
            });
          }

          result.processedActivities++;
        } catch (error) {
          this.logger.error(`Failed to process activity ${chunkResult.activityId}:`, error);
          result.errors.push(`Activity ${chunkResult.activityId}: ${error.message}`);

          if (!this.config.errorHandling.continueOnError) {
            throw error;
          }

          if (result.errors.length >= this.config.errorHandling.maxErrors) {
            throw new Error(
              `Max errors reached (${this.config.errorHandling.maxErrors}), stopping ingestion`
            );
          }
        }
      }

      // Step 5: Bulk store embeddings
      this.logger.log('💾 Storing embeddings in database...');
      const storeResult = await this.vectorStoreService.storeEmbeddings(embeddingDataList);
      result.totalEmbeddings = storeResult.insertedCount;

      result.duration = Date.now() - startTime;
      result.endTime = new Date();

      this.logger.log(
        `✅ Pipeline completed successfully!\n` +
        `   - Processed: ${result.processedActivities}/${result.totalActivities} activities\n` +
        `   - Embeddings: ${result.totalEmbeddings}\n` +
        `   - Duration: ${(result.duration / 1000).toFixed(2)}s\n` +
        `   - Errors: ${result.errors.length}`
      );

    } catch (error) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      result.endTime = new Date();
      
      this.logger.error('❌ Pipeline failed:', error);
      throw error;
    }

    return result;
  }

  /**
   * Run incremental update for activities modified since a specific date
   */
  async runIncrementalUpdate(since: Date): Promise<IngestionResult> {
    this.logger.log(`🔄 Starting incremental update since ${since.toISOString()}...`);

    const startTime = Date.now();
    const result: IngestionResult = {
      totalActivities: 0,
      processedActivities: 0,
      totalEmbeddings: 0,
      errors: [],
      duration: 0,
      startTime: new Date(),
    };

    try {
      const activities = await this.dataPreparationService.getUpdatedActivities(since);
      result.totalActivities = activities.length;

      this.logger.log(`Found ${activities.length} activities to update`);

      if (activities.length === 0) {
        this.logger.log('No activities to update');
        result.duration = Date.now() - startTime;
        result.endTime = new Date();
        return result;
      }

      for (const activity of activities) {
        try {
          await this.processActivity(activity.id);
          result.processedActivities++;
        } catch (error) {
          result.errors.push(`Activity ${activity.id}: ${error.message}`);
          
          if (!this.config.errorHandling.continueOnError) {
            throw error;
          }
        }
      }

      result.duration = Date.now() - startTime;
      result.endTime = new Date();

      this.logger.log(
        `✅ Incremental update completed: ${result.processedActivities}/${result.totalActivities} activities`
      );

    } catch (error) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      result.endTime = new Date();
      
      this.logger.error('❌ Incremental update failed:', error);
      throw error;
    }

    return result;
  }

  /**
   * Process a single activity through the full pipeline
   */
  async processActivity(activityId: string): Promise<void> {
    this.logger.debug(`Processing activity ${activityId}...`);

    // Step 1: Prepare data
    const preparedData = await this.dataPreparationService.prepareActivityData(activityId);

    // Step 2: Chunk
    const chunkResult = await this.chunkingService.processActivity(preparedData);

    // Step 3: Generate embeddings
    const texts = chunkResult.chunks.map(c => c.text);
    const embeddingResult = await this.embeddingService.batchGenerateEmbeddings(texts);

    // Step 4: Prepare embedding data
    const embeddingDataList: EmbeddingData[] = embeddingResult.results.map((embResult, i) => ({
      activityId: chunkResult.activityId,
      contentText: chunkResult.chunks[i].text,
      embedding: embResult.embedding,
      chunkIndex: chunkResult.chunks[i].index,
      metadata: chunkResult.chunks[i].metadata,
    }));

    // Step 5: Update embeddings in database
    await this.vectorStoreService.updateActivityEmbeddings(activityId, embeddingDataList);

    this.logger.debug(
      `Activity ${activityId} processed: ${embeddingDataList.length} embeddings stored`
    );
  }

  /**
   * Delete embeddings for a specific activity
   */
  async deleteActivity(activityId: string): Promise<void> {
    this.logger.log(`Deleting embeddings for activity ${activityId}...`);
    await this.vectorStoreService.deleteEmbeddingsByActivityId(activityId);
  }

  /**
   * Run ingestion with progress callback
   */
  async runWithProgress(
    onProgress?: (progress: IngestionProgress) => void
  ): Promise<IngestionResult> {
    const startTime = Date.now();
    const result: IngestionResult = {
      totalActivities: 0,
      processedActivities: 0,
      totalEmbeddings: 0,
      errors: [],
      duration: 0,
      startTime: new Date(),
    };

    try {
      // Get all activities
      if (onProgress) {
        onProgress({
          current: 0,
          total: 1,
          percentage: 0,
          currentActivity: 'Loading activities...',
          phase: 'preparation',
        });
      }

      const activities = await this.dataPreparationService.getAllActivities();
      result.totalActivities = activities.length;

      // Process each activity with progress reporting
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];

        try {
          // Report progress
          if (onProgress) {
            onProgress({
              current: i + 1,
              total: activities.length,
              percentage: Math.round(((i + 1) / activities.length) * 100),
              currentActivity: activity.name,
              phase: 'embedding',
            });
          }

          await this.processActivity(activity.id);
          result.processedActivities++;

        } catch (error) {
          result.errors.push(`Activity ${activity.id}: ${error.message}`);
        }
      }

      result.duration = Date.now() - startTime;
      result.endTime = new Date();

    } catch (error) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      result.endTime = new Date();
      throw error;
    }

    return result;
  }

  /**
   * Get ingestion statistics
   */
  async getIngestionStats(): Promise<{
    storageStats: any;
    embeddingCacheStats: any;
    lastIngestionTime?: Date;
  }> {
    const storageStats = await this.vectorStoreService.getStorageStats();
    const cacheStats = await this.embeddingService.getCacheStats();

    return {
      storageStats,
      embeddingCacheStats: cacheStats,
    };
  }

  /**
   * Health check for all pipeline components
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    components: Record<string, any>;
  }> {
    const components: Record<string, any> = {};

    try {
      // Check embedding service
      components.embeddingService = await this.embeddingService.healthCheck();

      // Check vector store
      components.vectorStore = await this.vectorStoreService.healthCheck();

      // Check data preparation (simple check)
      try {
        await this.dataPreparationService.getAllActivities();
        components.dataPreparation = { status: 'healthy' };
      } catch (error) {
        components.dataPreparation = { status: 'unhealthy', error: error.message };
      }

      // Overall status
      const allHealthy = Object.values(components).every(
        (c: any) => c.status === 'healthy'
      );

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        components,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        components: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Get configuration
   */
  getConfig(): IngestionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<IngestionConfig>): void {
    Object.assign(this.config, updates);
    this.logger.log('Ingestion pipeline config updated', updates);
  }
}
