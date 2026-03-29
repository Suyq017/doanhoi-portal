import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueStalled,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { LangChainIngestionService } from '../services/langchain-ingestion.service';
import {
  VECTOR_QUEUE,
  VECTOR_JOB,
  VectorJobPayload,
} from '../constants/vector-queue.constants';

/**
 * VectorIngestionProcessor — BullMQ Worker
 *
 * concurrency: 1 → Ollama chỉ nhận đúng 1 embedding request tại một thời điểm.
 * Retry 3 lần với exponential backoff được quản lý tự động bởi Bull.
 */
@Processor(VECTOR_QUEUE)
export class VectorIngestionProcessor {
  private readonly logger = new Logger(VectorIngestionProcessor.name);

  constructor(
    private readonly ingestionService: LangChainIngestionService,
  ) {}

  // ─── Job Processors ─────────────────────────────────────────────

  /**
   * Embed (insert or update) vectors for a single activity.
   */
  @Process({ name: VECTOR_JOB.UPSERT, concurrency: 1 })
  async handleUpsert(job: Job<VectorJobPayload>): Promise<void> {
    const { activityId, activityName } = job.data;
    this.logger.log(
      `⚙️  [${job.id}] upsert — "${activityName ?? activityId}"`,
    );

    await job.progress(10);
    await this.ingestionService.processActivity(activityId);
    await job.progress(100);
  }

  /**
   * Remove all vectors belonging to a deleted activity.
   */
  @Process({ name: VECTOR_JOB.DELETE, concurrency: 1 })
  async handleDelete(job: Job<VectorJobPayload>): Promise<void> {
    const { activityId, activityName } = job.data;
    this.logger.log(
      `⚙️  [${job.id}] delete — "${activityName ?? activityId}"`,
    );

    await this.ingestionService.deleteActivity(activityId);
  }

  /**
   * Full re-index OR incremental update of all activities.
   * Both the nightly cron and manual forceSyncAll() land here.
   */
  @Process({ name: VECTOR_JOB.FULL_SYNC, concurrency: 1 })
  async handleFullSync(job: Job<VectorJobPayload>): Promise<void> {
    const triggeredBy = job.data.triggeredBy ?? 'unknown';
    this.logger.log(`⚙️  [${job.id}] full_sync — triggered by: ${triggeredBy}`);

    if (job.data.activityId === 'incremental') {
      // Hourly safety-net: incremental update covering ≥ last 65 min
      const since = new Date(Date.now() - 65 * 60 * 1000);
      await this.ingestionService.runIncrementalUpdate(since);
    } else {
      await this.ingestionService.runFullIngestion();
    }
  }

  // ─── Queue Event Hooks ───────────────────────────────────────────

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.debug(`▶️  Job active: [${job.id}] ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job): void {
    this.logger.log(
      `✅  Job done: [${job.id}] ${job.name} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    const attempt = job.attemptsMade;
    const maxAttempts = job.opts.attempts ?? 3;

    if (attempt < maxAttempts) {
      this.logger.warn(
        `⚠️  Job failed [${job.id}] ${job.name} — attempt ${attempt}/${maxAttempts}: ${error.message} — will retry`,
      );
    } else {
      this.logger.error(
        `❌  Job exhausted retries [${job.id}] ${job.name} — ${error.message}`,
      );
    }
    // Bull tự động retry dựa trên opts.attempts + backoff, không cần xử lý thủ công
  }

  @OnQueueStalled()
  onStalled(job: Job): void {
    this.logger.warn(
      `⏸️  Job stalled (Ollama timeout?): [${job.id}] ${job.name} — Bull sẽ tự retry`,
    );
  }
}
