import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  DataSource,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { CtxhActivity, ActivityStatus } from '@/entities/ctxh-activity.entity';

/**
 * Embedding job for background processing
 */
export interface EmbeddingJob {
  activityId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  priority: number;
  createdAt: Date;
  retryCount: number;
}

/**
 * Background queue for processing embedding jobs
 */
@Injectable()
export class EmbeddingQueue {
  private readonly logger = new Logger(EmbeddingQueue.name);
  private queue: EmbeddingJob[] = [];
  private processing = false;
  private processingJob: EmbeddingJob | null = null;

  /**
   * Add a job to the queue
   */
  async addJob(job: Omit<EmbeddingJob, 'createdAt' | 'retryCount'>): Promise<void> {
    const fullJob: EmbeddingJob = {
      ...job,
      createdAt: new Date(),
      retryCount: 0,
    };

    // Check if job already exists in queue
    const existingIndex = this.queue.findIndex(
      j => j.activityId === job.activityId && j.operation === job.operation
    );

    if (existingIndex >= 0) {
      this.logger.debug(`Job for activity ${job.activityId} already in queue, skipping`);
      return;
    }

    this.queue.push(fullJob);
    this.queue.sort((a, b) => b.priority - a.priority);

    this.logger.log(
      `Added ${job.operation} job for activity ${job.activityId} (queue size: ${this.queue.length})`
    );

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process jobs in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    this.logger.log('Starting embedding queue processing...');

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;

      this.processingJob = job;

      try {
        this.logger.debug(`Processing ${job.operation} job for activity ${job.activityId}`);
        await this.processJob(job);
        this.logger.debug(`Successfully processed job for activity ${job.activityId}`);
      } catch (error) {
        this.logger.error(
          `Failed to process ${job.operation} job for activity ${job.activityId}:`,
          error.message
        );

        // Retry logic
        if (job.retryCount < 3) {
          job.retryCount++;
          job.priority = Math.max(0, job.priority - 1); // Lower priority on retry
          this.queue.push(job);
          this.logger.log(`Re-queued job for activity ${job.activityId} (retry ${job.retryCount}/3)`);
        } else {
          this.logger.error(`Max retries reached for activity ${job.activityId}, giving up`);
        }
      }

      this.processingJob = null;

      // Small delay between jobs to avoid overwhelming the system
      await this.delay(100);
    }

    this.processing = false;
    this.logger.log('Embedding queue processing completed');
  }

  /**
   * Process a single job (placeholder - will be connected to pipeline service)
   */
  private async processJob(job: EmbeddingJob): Promise<void> {
    // This will be implemented to call the CtxhIngestionPipelineService
    // For now, it's a placeholder that logs the job
    
    // TODO: Inject CtxhIngestionPipelineService and call appropriate methods
    // Example:
    // if (job.operation === 'INSERT' || job.operation === 'UPDATE') {
    //   await this.pipelineService.processActivity(job.activityId);
    // } else if (job.operation === 'DELETE') {
    //   await this.pipelineService.deleteActivity(job.activityId);
    // }

    this.logger.debug(`Job processed: ${job.operation} for ${job.activityId}`);
    
    // Simulate processing time
    await this.delay(50);
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueSize: number;
    processing: boolean;
    currentJob: EmbeddingJob | null;
  } {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      currentJob: this.processingJob,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.logger.log('Embedding queue cleared');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * TypeORM Subscriber for CTXH Activity lifecycle events
 */
@EventSubscriber()
@Injectable()
export class CtxhActivitySubscriber implements EntitySubscriberInterface<CtxhActivity> {
  private readonly logger = new Logger(CtxhActivitySubscriber.name);
  private embeddingQueue: EmbeddingQueue;

  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
    this.embeddingQueue = new EmbeddingQueue();
  }

  /**
   * Specify which entity this subscriber listens to
   */
  listenTo() {
    return CtxhActivity;
  }

  /**
   * Called after entity is inserted
   */
  async afterInsert(event: InsertEvent<CtxhActivity>): Promise<void> {
    const activity = event.entity;

    this.logger.log(`Activity inserted: ${activity.id} (${activity.name})`);

    if (this.shouldProcessActivity(activity)) {
      await this.embeddingQueue.addJob({
        activityId: activity.id,
        operation: 'INSERT',
        priority: 5, // Medium priority for new activities
      });
    } else {
      this.logger.debug(`Activity ${activity.id} skipped (status: ${activity.status})`);
    }
  }

  /**
   * Called after entity is updated
   */
  async afterUpdate(event: UpdateEvent<CtxhActivity>): Promise<void> {
    const activity = event.entity as CtxhActivity;
    
    if (!activity) {
      this.logger.warn('Update event without entity');
      return;
    }

    this.logger.log(`Activity updated: ${activity.id} (${activity.name})`);

    // Check which columns were updated
    const updatedColumns = event.updatedColumns?.map(col => col.propertyName) || [];
    
    // Only process if relevant fields changed
    const relevantFields = [
      'name',
      'description',
      'start_date',
      'end_date',
      'location',
      'status',
      'category_id',
      'organization_id',
      'total_days',
    ];

    const hasRelevantChanges = updatedColumns.some(col => relevantFields.includes(col));

    if (hasRelevantChanges && this.shouldProcessActivity(activity)) {
      this.logger.log(
        `Relevant fields changed: ${updatedColumns.filter(c => relevantFields.includes(c)).join(', ')}`
      );

      await this.embeddingQueue.addJob({
        activityId: activity.id,
        operation: 'UPDATE',
        priority: 7, // Higher priority for updates
      });
    } else {
      this.logger.debug(
        `Activity ${activity.id} update skipped (no relevant changes or wrong status)`
      );
    }
  }

  /**
   * Called before entity is removed
   */
  async beforeRemove(event: RemoveEvent<CtxhActivity>): Promise<void> {
    const activity = event.entity as CtxhActivity;
    
    if (!activity) {
      this.logger.warn('Remove event without entity');
      return;
    }

    this.logger.log(`Activity being removed: ${activity.id} (${activity.name})`);

    await this.embeddingQueue.addJob({
      activityId: activity.id,
      operation: 'DELETE',
      priority: 10, // Highest priority for deletions
    });
  }

  /**
   * Check if activity should be processed for embeddings
   */
  private shouldProcessActivity(activity: CtxhActivity): boolean {
    // Only process ACTIVE and COMPLETED activities
    const validStatuses = [ActivityStatus.ACTIVE, ActivityStatus.COMPLETED];
    
    if (!validStatuses.includes(activity.status)) {
      return false;
    }

    // Don't process soft-deleted activities
    if (activity.deleted_at) {
      return false;
    }

    // Must have a name
    if (!activity.name || activity.name.trim().length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Get embedding queue instance (for external access)
   */
  getQueue(): EmbeddingQueue {
    return this.embeddingQueue;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return this.embeddingQueue.getStatus();
  }
}
