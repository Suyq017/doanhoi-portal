import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ActivityCreatedEvent,
  ActivityUpdatedEvent,
  ActivityDeletedEvent,
  ActivityRestoredEvent,
  ActivityStatusChangedEvent,
  ACTIVITY_EVENTS,
} from '../../ctxh/activity/events/activity.events';
import {
  VECTOR_QUEUE,
  VECTOR_JOB,
  VectorJobPayload,
} from '../constants/vector-queue.constants';
import { LangChainIngestionService } from './langchain-ingestion.service';

/**
 * Fields that affect embedded content.
 * Only re-embed when at least one of these changes.
 * Names match exactly the keys of UpdateActivityDto (snake_case).
 */
const CONTENT_FIELDS: string[] = [
  'name',
  'description',
  'location',
  'start_date',
  'end_date',
  'total_days',
  'category_id',
  'organization_id',
  'status',
];

/** Default Bull job options — 3 retries with exponential backoff */
const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }, // 2s -> 4s -> 8s
  // removeOnComplete: true — QUAN TRỌNG: phải xóa ngay sau khi completed.
  // Nếu giữ lại (removeOnComplete: 100), Bull v4 vẫn giữ key `jobId` trong Redis.
  // Khi add job mới với cùng jobId, Bull thấy key đã tồn tại -> bỏ qua silently
  // -> activity bị update xong nhưng vector store không được re-embed.
  removeOnComplete: true,
  removeOnFail: 50,
};

/**
 * CtxhVectorSyncService — Event Bridge
 *
 * Listens to domain events emitted by ActivitiesService and converts them
 * into BullMQ jobs on the `vectorize_queue`. The actual Ollama embedding work
 * is done by VectorIngestionProcessor (concurrency: 1).
 *
 * Also owns the scheduled safety-net cron jobs.
 */
@Injectable()
export class CtxhVectorSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CtxhVectorSyncService.name);

  constructor(
    @InjectQueue(VECTOR_QUEUE)
    private readonly vectorQueue: Queue<VectorJobPayload>,
    private readonly ingestionService: LangChainIngestionService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * On startup: find activities that have no embedding in ctxh_embedding
   * and queue an upsert job for each. This catches rows inserted via raw SQL
   * (seeds, migrations) that bypassed the event-driven pipeline.
   * Runs non-blocking — backend boot is not delayed.
   */
  async onApplicationBootstrap(): Promise<void> {
    // Fire-and-forget — do not await so startup is not blocked
    this.syncMissingEmbeddingsOnStartup().catch((err) =>
      this.logger.error('Startup embedding sync failed', err),
    );
  }

  private async syncMissingEmbeddingsOnStartup(): Promise<void> {
    try {
      const rows: Array<{ id: string; name: string }> = await this.dataSource.query(`
        SELECT ca.id, ca.name
        FROM ctxh_activity ca
        WHERE ca.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM ctxh_embeddings ce
            WHERE ce.activity_id = ca.id
          )
        ORDER BY ca.created_at ASC
      `);

      if (rows.length === 0) {
        this.logger.log('✅ [startup] All activities already have embeddings.');
        return;
      }

      this.logger.log(
        `🔍 [startup] Found ${rows.length} activities without embeddings — queuing upsert jobs.`,
      );

      for (const row of rows) {
        await this.addUpsertJob(row.id, row.name, 'startup:missing-embedding');
      }

      this.logger.log(
        `📥 [startup] Queued ${rows.length} upsert jobs for missing embeddings.`,
      );
    } catch (err: any) {
      this.logger.error('[startup] Failed to sync missing embeddings', err?.message);
    }
  }

  // ─── Event Listeners -> Add to BullMQ (non-blocking) ────────────

  @OnEvent(ACTIVITY_EVENTS.CREATED, { async: true })
  async handleActivityCreated(event: ActivityCreatedEvent): Promise<void> {
    this.logger.log(
      `📥 [created] Queuing upsert: "${event.activityName}" (${event.activityId})`,
    );
    await this.addUpsertJob(event.activityId, event.activityName, event.createdBy);
  }

  @OnEvent(ACTIVITY_EVENTS.UPDATED, { async: true })
  async handleActivityUpdated(event: ActivityUpdatedEvent): Promise<void> {
    const hasContentChange = event.changedFields.some((f) =>
      CONTENT_FIELDS.includes(f),
    );

    if (!hasContentChange) {
      this.logger.debug(
        `⏭️  [updated] Skipping re-embed — no content fields changed for "${event.activityName}"`,
      );
      return;
    }

    this.logger.log(
      `📝 [updated] Queuing re-embed: "${event.activityName}" (${event.activityId}) — changed: ${event.changedFields.join(', ')}`,
    );
    await this.addUpsertJob(event.activityId, event.activityName, event.updatedBy);
  }

  @OnEvent(ACTIVITY_EVENTS.DELETED, { async: true })
  async handleActivityDeleted(event: ActivityDeletedEvent): Promise<void> {
    this.logger.log(
      `🗑️  [deleted] Queuing delete: "${event.activityName}" (${event.activityId})`,
    );
    await this.addDeleteJob(event.activityId, event.activityName);
  }

  @OnEvent(ACTIVITY_EVENTS.RESTORED, { async: true })
  async handleActivityRestored(event: ActivityRestoredEvent): Promise<void> {
    this.logger.log(
      `♻️  [restored] Queuing re-embed: "${event.activityName}" (${event.activityId})`,
    );
    await this.addUpsertJob(event.activityId, event.activityName, event.restoredBy);
  }

  @OnEvent(ACTIVITY_EVENTS.STATUS_CHANGED, { async: true })
  async handleStatusChanged(event: ActivityStatusChangedEvent): Promise<void> {
    this.logger.log(
      `🔄 [status_changed] ${event.oldStatus} -> ${event.newStatus} for "${event.activityName}" — queuing re-embed`,
    );
    await this.addUpsertJob(event.activityId, event.activityName);
  }

  // ─── Scheduled Safety-Net Cron Jobs ────────────────────────────

  /**
   * Chạy mỗi giờ: incremental sync — bắt các activity thay đổi bị bỏ sót.
   * Sử dụng runIncrementalUpdate() qua BullMQ để vẫn giữ concurrency: 1.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledIncrementalSync(): Promise<void> {
    this.logger.log('⏰ [cron] Hourly incremental sync — adding to queue');
    await this.vectorQueue.add(
      VECTOR_JOB.FULL_SYNC,
      {
        activityId: 'incremental',
        triggeredBy: 'cron:hourly',
        timestamp: new Date().toISOString(),
      },
      { ...JOB_OPTIONS, jobId: 'incremental_sync_latest' },
    );
  }

  /**
   * Chạy lúc 2:00 AM mỗi ngày: full re-index để đảm bảo consistency.
   */
  // @Cron('0 2 * * *')
  // async scheduledFullSync(): Promise<void> {
  //   this.logger.log('🌙 [cron] Nightly full re-index — adding to queue');
  //   await this.forceSyncAll();
  // }

  // ─── Manual Controls (dùng cho API endpoints) ──────────────────

  async forceSyncAll(): Promise<void> {
    this.logger.log('🚀 Force full sync triggered — adding to queue');
    await this.vectorQueue.add(
      VECTOR_JOB.FULL_SYNC,
      { activityId: 'all', triggeredBy: 'manual', timestamp: new Date().toISOString() },
      { ...JOB_OPTIONS, jobId: 'full_sync_latest' },
    );
  }

  async getQueueStatus() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.vectorQueue.getWaitingCount(),
      this.vectorQueue.getActiveCount(),
      this.vectorQueue.getCompletedCount(),
      this.vectorQueue.getFailedCount(),
      this.vectorQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }

  // ─── Private Queue Helpers ──────────────────────────────────────

  /**
   * Add or replace an upsert job.
   * jobId = `upsert_{activityId}` -> BullMQ deduplicates automatically:
   * if a job with the same jobId is already waiting/delayed, it is skipped.
   */
  async addUpsertJob(
    activityId: string,
    activityName?: string,
    triggeredBy?: string,
  ): Promise<void> {
    await this.vectorQueue.add(
      VECTOR_JOB.UPSERT,
      { activityId, activityName, triggeredBy, timestamp: new Date().toISOString() },
      { ...JOB_OPTIONS, jobId: `upsert_${activityId}` },
    );
  }

  async addDeleteJob(activityId: string, activityName?: string): Promise<void> {
    await this.vectorQueue.add(
      VECTOR_JOB.DELETE,
      { activityId, activityName, timestamp: new Date().toISOString() },
      { ...JOB_OPTIONS, jobId: `delete_${activityId}` },
    );
  }
}
