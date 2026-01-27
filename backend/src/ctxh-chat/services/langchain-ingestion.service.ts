import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { CtxhActivity } from '../../entities/ctxh-activity.entity';
import { CtxhEmbedding } from '../../entities/ctxh-embedding.entity';
import { LangChainVectorStoreService } from './langchain-vector-store.service';

/**
 * Ingestion result interface
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
 * Activity data for ingestion
 */
interface ActivityData {
  id: string;
  name: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: string;
  organizationName: string;
  registrationLink?: string;
}

/**
 * LangChain Ingestion Service
 * Handles data ingestion pipeline using LangChain vector store
 */
@Injectable()
export class LangChainIngestionService {
  private readonly logger = new Logger(LangChainIngestionService.name);
  private readonly batchSize: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly vectorStoreService: LangChainVectorStoreService,
    @InjectRepository(CtxhActivity)
    private readonly activityRepository: Repository<CtxhActivity>,
    @InjectRepository(CtxhEmbedding)
    private readonly embeddingRepository: Repository<CtxhEmbedding>,
  ) {
    this.batchSize = this.configService.get('INGESTION_BATCH_SIZE', 50);
  }

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

    this.logger.log('🚀 Starting full ingestion pipeline with LangChain...');

    try {
      // Get all activities
      const activities = await this.activityRepository.find({
        relations: ['organization'],
      });
      result.totalActivities = activities.length;

      this.logger.log(`Found ${activities.length} activities to process`);

      if (activities.length === 0) {
        result.duration = Date.now() - startTime;
        result.endTime = new Date();
        return result;
      }

      // Clear existing embeddings
      await this.embeddingRepository.clear();
      this.logger.log('Cleared existing embeddings');

      // Process in batches
      for (let i = 0; i < activities.length; i += this.batchSize) {
        const batch = activities.slice(i, i + this.batchSize);
        
        try {
          const documents = this.prepareDocuments(batch);
          await this.vectorStoreService.addDocuments(documents);
          
          result.processedActivities += batch.length;
          result.totalEmbeddings += documents.length;
          
          this.logger.log(`Processed batch ${Math.floor(i / this.batchSize) + 1}: ${batch.length} activities`);
        } catch (error) {
          const errorMsg = `Batch error: ${error.message}`;
          result.errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      result.duration = Date.now() - startTime;
      result.endTime = new Date();
      
      this.logger.log(`✅ Ingestion completed: ${result.processedActivities}/${result.totalActivities} activities, ${result.totalEmbeddings} embeddings`);
      
      return result;
    } catch (error) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      result.endTime = new Date();
      this.logger.error('Ingestion failed', error);
      return result;
    }
  }

  /**
   * Run incremental update for recently modified activities
   */
  async runIncrementalUpdate(since: Date): Promise<IngestionResult> {
    const startTime = Date.now();
    const result: IngestionResult = {
      totalActivities: 0,
      processedActivities: 0,
      totalEmbeddings: 0,
      errors: [],
      duration: 0,
      startTime: new Date(),
    };

    this.logger.log(`🔄 Running incremental update since ${since.toISOString()}`);

    try {
      const activities = await this.activityRepository.find({
        where: { updated_at: MoreThan(since) },
        relations: ['organization'],
      });
      result.totalActivities = activities.length;

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
          result.totalEmbeddings++;
        } catch (error) {
          result.errors.push(`Activity ${activity.id}: ${error.message}`);
        }
      }

      result.duration = Date.now() - startTime;
      result.endTime = new Date();
      
      return result;
    } catch (error) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      result.endTime = new Date();
      return result;
    }
  }

  /**
   * Process a single activity
   */
  async processActivity(activityId: string): Promise<void> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['organization'],
    });

    if (!activity) {
      throw new Error(`Activity ${activityId} not found`);
    }

    // Delete existing embeddings for this activity
    await this.deleteActivity(activityId);

    // Create and add new document
    const documents = this.prepareDocuments([activity]);
    await this.vectorStoreService.addDocuments(documents);

    this.logger.log(`Processed activity: ${activityId}`);
  }

  /**
   * Delete embeddings for an activity
   */
  async deleteActivity(activityId: string): Promise<void> {
    await this.embeddingRepository.delete({ activityId });
    this.logger.log(`Deleted embeddings for activity: ${activityId}`);
  }

  /**
   * Get ingestion statistics
   */
  async getIngestionStats(): Promise<{
    totalEmbeddings: number;
    totalActivities: number;
    lastUpdated: Date | null;
  }> {
    const totalEmbeddings = await this.embeddingRepository.count();
    const totalActivities = await this.activityRepository.count();
    
    const lastEmbedding = await this.embeddingRepository.findOne({
      order: { createdAt: 'DESC' },
    });

    return {
      totalEmbeddings,
      totalActivities,
      lastUpdated: lastEmbedding?.createdAt || null,
    };
  }

  /**
   * Health check for ingestion pipeline
   */
  async healthCheck(): Promise<{
    status: string;
    vectorStore: boolean;
    database: boolean;
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {};
    let vectorStoreOk = false;
    let databaseOk = false;

    // Check vector store
    try {
      vectorStoreOk = this.vectorStoreService.isInitialized();
      details.vectorStore = vectorStoreOk ? 'connected' : 'not initialized';
    } catch (error) {
      details.vectorStore = `error: ${error.message}`;
    }

    // Check database
    try {
      await this.embeddingRepository.count();
      databaseOk = true;
      details.database = 'connected';
    } catch (error) {
      details.database = `error: ${error.message}`;
    }

    return {
      status: vectorStoreOk && databaseOk ? 'healthy' : 'unhealthy',
      vectorStore: vectorStoreOk,
      database: databaseOk,
      details,
    };
  }

  /**
   * Prepare LangChain documents from activities
   */
  private prepareDocuments(activities: CtxhActivity[]): Document[] {
    return activities.map(activity => {
      const content = this.formatActivityContent(activity);
      
      return new Document({
        pageContent: content,
        metadata: {
          activityId: activity.id,
          activityName: activity.name,
          organizationName: activity.organization?.name || 'N/A',
          startDate: activity.start_date?.toISOString(),
          endDate: activity.end_date?.toISOString(),
          totalDays: activity.total_days,
          location: activity.location,
          status: activity.status,
          chunkType: 'full_activity',
        },
      });
    });
  }

  /**
   * Format activity content for embedding
   */
  private formatActivityContent(activity: CtxhActivity): string {
    const parts: string[] = [
      `Hoạt động CTXH: ${activity.name}`,
      `Mô tả: ${activity.description || 'Không có mô tả'}`,
      `Tổ chức: ${activity.organization?.name || 'N/A'}`,
      `Địa điểm: ${activity.location || 'N/A'}`,
      `Thời gian: ${this.formatDate(activity.start_date)} - ${this.formatDate(activity.end_date)}`,
      `Số ngày CTXH: ${activity.total_days || 0} ngày`,
      `Trạng thái: ${activity.status || 'N/A'}`,
    ];

    return parts.join('\n');
  }

  /**
   * Format date to Vietnamese locale
   */
  private formatDate(date: Date | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('vi-VN');
  }
}
