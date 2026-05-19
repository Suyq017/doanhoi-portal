Collecting workspace information# Kế Hoạch Pipeline Tự Động Chuyển Đổi Dữ Liệu CTXH sang Vector Embedding

## 1. Phân Tích Hiện Trạng

### APIs Ingestion Đã Có (trong `CtxhChatController`)

| Endpoint | Method | Chức năng | Vấn đề |
|----------|--------|-----------|--------|
| `POST /ingestion/full` | Manual | Chạy full ingestion toàn bộ | Thủ công, không tự động |
| `POST /ingestion/incremental` | Manual | Cập nhật theo khoảng thời gian | Thủ công, không tự động |
| `POST /ingestion/activity/:id` | Manual | Xử lý 1 activity | Thủ công, không tự động |
| `DELETE /ingestion/activity/:id` | Manual | Xóa embedding | Phải gọi thủ công khi xóa |
| `GET /ingestion/stats` | Read | Thống kê | OK |

**Vấn đề cốt lõi**: Không có cơ chế tự động trigger khi dữ liệu thay đổi trong module `CtxhModule`.

---

## 2. Kiến Trúc Pipeline Đề Xuất

> **Lý do dùng Redis BullMQ**: Ollama chạy local, không chịu được nhiều request embedding song song. BullMQ đảm bảo `concurrency: 1` — Ollama chỉ xử lý **tuần tự** từng job, tránh sập server. Ngoài ra job được persist trong Redis, không mất khi server restart.

```
┌─────────────────────────────────────────────────────────────────┐
│                     CTXH Data Layer                              │
│  Create Activity → ActivityService.create()                      │
│  Update Activity → ActivityService.update()                      │
│  Delete Activity → ActivityService.remove()                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ EventEmitter2 / NestJS Events
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           CtxhVectorSyncService (NEW) — Event Bridge             │
│  @OnEvent('activity.created') → queue.add('upsert', { id })     │
│  @OnEvent('activity.updated') → queue.add('upsert', { id })     │
│  @OnEvent('activity.deleted') → queue.add('delete', { id })     │
│  @OnEvent('activity.status_changed') → queue.add('upsert', {id})│
└──────────────────────────┬──────────────────────────────────────┘
                           │ BullMQ — add job (fast, non-blocking)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Redis — vectorize_queue (BullMQ)                   │
│  Persistent job store · Deduplication · Built-in retry          │
│  !! concurrency: 1 → Ollama không bao giờ bị gọi song song !!  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Worker pull job (concurrency: 1)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│          VectorIngestionProcessor (NEW) — BullMQ Worker          │
│  @Process('upsert') → ingestionService.processActivity(id)      │
│  @Process('delete') → ingestionService.deleteActivity(id)       │
│  Retry: 3 lần · Backoff: exponential (delay * 2^attempt)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               LangChainIngestionService (EXISTING)              │
│  processActivity(id) → fetch → chunk → embed → upsert           │
│  deleteActivity(id) → remove vectors from store                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│             LangChainVectorStoreService (EXISTING)              │
│                      pgvector (HNSW index)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Kế Hoạch Triển Khai Chi Tiết

### Phase 1: Event Infrastructure + Redis BullMQ Setup (Ngày 1-2)

**Bước 1.1**: Cài các dependencies

```bash
cd backend && npm install @nestjs/event-emitter @nestjs/bull bull ioredis @nestjs/schedule
npm install -D @types/bull
```

> **Lưu ý**: Dùng `bull` (v4) kết hợp `@nestjs/bull` thay cho `bullmq` thuần để tích hợp native với NestJS decorators (`@Process`, `@OnQueueEvent`). Nếu cần BullMQ v2 API, thay bằng `@nestjs/bullmq bullmq`.

**Bước 1.2**: Đăng ký EventEmitterModule và BullModule vào AppModule

````typescript
// filepath: backend/src/app.module.ts
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ...existing code...
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),
    ScheduleModule.forRoot(),
    // ...existing code...
  ],
})
export class AppModule {}
````

**Bước 1.3**: Thêm biến môi trường Redis vào `.env`

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

### Phase 2: Emit Events từ ActivityService (Ngày 2-3)

**Bước 2.1**: Tạo Event DTOs

````typescript
export class ActivityCreatedEvent {
  constructor(
    public readonly activityId: string,
    public readonly activityName: string,
    public readonly createdBy?: string,
  ) {}
}

export class ActivityUpdatedEvent {
  constructor(
    public readonly activityId: string,
    public readonly activityName: string,
    public readonly changedFields: string[],
    public readonly updatedBy?: string,
  ) {}
}

export class ActivityDeletedEvent {
  constructor(
    public readonly activityId: string,
    public readonly activityName: string,
    public readonly deletedBy?: string,
  ) {}
}

export class ActivityStatusChangedEvent {
  constructor(
    public readonly activityId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
  ) {}
}

export const ACTIVITY_EVENTS = {
  CREATED: 'activity.created',
  UPDATED: 'activity.updated',
  DELETED: 'activity.deleted',
  STATUS_CHANGED: 'activity.status_changed',
} as const;
````

**Bước 2.2**: Inject EventEmitter2 vào ActivityService và emit events

````typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  ActivityCreatedEvent, 
  ActivityUpdatedEvent, 
  ActivityDeletedEvent,
  ACTIVITY_EVENTS 
} from './events/activity.events';

@Injectable()
export class ActivitiesService {
  constructor(
    // ...existing code...
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createDto: CreateActivityDto, userId?: string) {
    // ...existing code...
    const activity = await this.activityRepository.save(newActivity);
    
    // 🔥 Emit event sau khi tạo thành công
    this.eventEmitter.emit(
      ACTIVITY_EVENTS.CREATED,
      new ActivityCreatedEvent(activity.id, activity.name, userId),
    );
    
    return activity;
  }

  async update(id: string, updateDto: UpdateActivityDto, userId?: string) {
    // ...existing code...
    const changedFields = Object.keys(updateDto);
    const updated = await this.activityRepository.save(activity);
    
    // 🔥 Emit event sau khi cập nhật
    this.eventEmitter.emit(
      ACTIVITY_EVENTS.UPDATED,
      new ActivityUpdatedEvent(id, updated.name, changedFields, userId),
    );
    
    return updated;
  }

  async remove(id: string, userId?: string) {
    const activity = await this.findOne(id);
    // ...existing code...
    await this.activityRepository.delete(id);
    
    // 🔥 Emit event sau khi xóa
    this.eventEmitter.emit(
      ACTIVITY_EVENTS.DELETED,
      new ActivityDeletedEvent(id, activity.name, userId),
    );
  }
}
````

---

### Phase 3: BullMQ Integration — Event Bridge + Processor (Ngày 3-4)

> **Thay thế in-memory Map bằng Redis BullMQ**: Không còn `setInterval` polling, không còn mất job khi crash, Ollama được bảo vệ bởi `concurrency: 1`.

**Bước 3.1**: Định nghĩa constants cho queue

````typescript
// filepath: backend/src/ctxh-chat/constants/vector-queue.constants.ts
export const VECTOR_QUEUE = 'vectorize_queue';

export const VECTOR_JOB = {
  UPSERT: 'upsert_activity',
  DELETE: 'delete_activity',
  FULL_SYNC: 'full_sync',
} as const;

export interface VectorJobPayload {
  activityId: string;
  activityName?: string;
  triggeredBy?: string;
  timestamp: string;
}
````

**Bước 3.2**: `CtxhVectorSyncService` — Event Bridge (nhận event → đẩy vào BullMQ)

````typescript
// filepath: backend/src/ctxh-chat/services/ctxh-vector-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  ActivityCreatedEvent,
  ActivityUpdatedEvent,
  ActivityDeletedEvent,
  ActivityStatusChangedEvent,
  ACTIVITY_EVENTS,
} from '../../ctxh/activity/events/activity.events';
import { VECTOR_QUEUE, VECTOR_JOB, VectorJobPayload } from '../constants/vector-queue.constants';

// Các field nội dung — chỉ re-embed khi những field này thay đổi
const CONTENT_FIELDS = [
  'name', 'description', 'location', 'startDate', 'endDate',
  'registrationDeadline', 'ctxhDays', 'organization', 'requirements',
];

// BullMQ job options: retry 3 lần với exponential backoff
const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s
  removeOnComplete: 100,  // giữ 100 completed jobs gần nhất để monitor
  removeOnFail: 50,
};

@Injectable()
export class CtxhVectorSyncService {
  private readonly logger = new Logger(CtxhVectorSyncService.name);

  constructor(
    @InjectQueue(VECTOR_QUEUE) private readonly vectorQueue: Queue<VectorJobPayload>,
  ) {}

  // ─── Event Listeners → Add to BullMQ (non-blocking) ────────────

  @OnEvent(ACTIVITY_EVENTS.CREATED, { async: true })
  async handleActivityCreated(event: ActivityCreatedEvent) {
    this.logger.log(`📥 Queuing upsert for new activity: "${event.activityName}" (${event.activityId})`);
    await this.addUpsertJob(event.activityId, event.activityName, event.createdBy);
  }

  @OnEvent(ACTIVITY_EVENTS.UPDATED, { async: true })
  async handleActivityUpdated(event: ActivityUpdatedEvent) {
    const hasContentChange = event.changedFields.some(f => CONTENT_FIELDS.includes(f));
    if (!hasContentChange) {
      this.logger.debug(`⏭️ Activity updated (non-content fields only): skipping re-embedding`);
      return;
    }
    this.logger.log(`📝 Queuing re-embed for updated activity: "${event.activityName}" (${event.activityId})`);
    await this.addUpsertJob(event.activityId, event.activityName, event.updatedBy);
  }

  @OnEvent(ACTIVITY_EVENTS.DELETED, { async: true })
  async handleActivityDeleted(event: ActivityDeletedEvent) {
    this.logger.log(`🗑️ Queuing delete for activity: "${event.activityName}" (${event.activityId})`);
    await this.addDeleteJob(event.activityId, event.activityName);
  }

  @OnEvent(ACTIVITY_EVENTS.STATUS_CHANGED, { async: true })
  async handleStatusChanged(event: ActivityStatusChangedEvent) {
    this.logger.log(`🔄 Activity status changed: ${event.oldStatus} → ${event.newStatus}, queuing re-embed`);
    await this.addUpsertJob(event.activityId);
  }

  // ─── Queue Helpers ──────────────────────────────────────────────

  private async addUpsertJob(activityId: string, activityName?: string, triggeredBy?: string) {
    // jobId = activityId → BullMQ tự động deduplicate:
    // nếu job này đã ở trạng thái waiting/delayed, job mới sẽ bị bỏ qua
    await this.vectorQueue.add(
      VECTOR_JOB.UPSERT,
      { activityId, activityName, triggeredBy, timestamp: new Date().toISOString() },
      { ...JOB_OPTIONS, jobId: `upsert_${activityId}` },
    );
  }

  private async addDeleteJob(activityId: string, activityName?: string) {
    await this.vectorQueue.add(
      VECTOR_JOB.DELETE,
      { activityId, activityName, timestamp: new Date().toISOString() },
      { ...JOB_OPTIONS, jobId: `delete_${activityId}` },
    );
  }

  // ─── Manual Controls (dùng cho endpoints) ───────────────────────

  async forceSyncAll(): Promise<void> {
    this.logger.log('🚀 Force full sync triggered — adding to queue');
    await this.vectorQueue.add(
      VECTOR_JOB.FULL_SYNC,
      { activityId: 'all', timestamp: new Date().toISOString() },
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
}
````

**Bước 3.3**: `VectorIngestionProcessor` — BullMQ Worker (xử lý job với concurrency: 1)

````typescript
// filepath: backend/src/ctxh-chat/processors/vector-ingestion.processor.ts
import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { LangChainIngestionService } from '../services/langchain-ingestion.service';
import { VECTOR_QUEUE, VECTOR_JOB, VectorJobPayload } from '../constants/vector-queue.constants';

@Processor({ name: VECTOR_QUEUE, concurrency: 1 })
// !! concurrency: 1 — Ollama chỉ xử lý 1 job tại một thời điểm !!
export class VectorIngestionProcessor {
  private readonly logger = new Logger(VectorIngestionProcessor.name);

  constructor(
    private readonly ingestionService: LangChainIngestionService,
  ) {}

  // ─── Job Processors ─────────────────────────────────────────────

  @Process(VECTOR_JOB.UPSERT)
  async handleUpsert(job: Job<VectorJobPayload>) {
    const { activityId, activityName } = job.data;
    this.logger.log(`⚙️ [${job.id}] Embedding activity: "${activityName}" (${activityId})`);
    await job.progress(10);

    await this.ingestionService.processActivity(activityId);
    await job.progress(100);
  }

  @Process(VECTOR_JOB.DELETE)
  async handleDelete(job: Job<VectorJobPayload>) {
    const { activityId, activityName } = job.data;
    this.logger.log(`⚙️ [${job.id}] Deleting vectors for: "${activityName}" (${activityId})`);

    await this.ingestionService.deleteActivity(activityId);
  }

  @Process(VECTOR_JOB.FULL_SYNC)
  async handleFullSync(job: Job<VectorJobPayload>) {
    this.logger.log(`⚙️ [${job.id}] Running full re-index...`);
    await this.ingestionService.runFullIngestion();
  }

  // ─── Queue Event Hooks ───────────────────────────────────────────

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`▶️ Job started: [${job.id}] ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`✅ Job done: [${job.id}] ${job.name} (attempt ${job.attemptsMade})`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `❌ Job failed: [${job.id}] ${job.name} — ${error.message} (attempt ${job.attemptsMade}/${job.opts.attempts})`,
    );
    // BullMQ tự động retry dựa trên job.opts.attempts + backoff
    // Sau khi hết retry, job chuyển sang trạng thái 'failed' — có thể xem qua Bull Board UI
  }
}
````

---

### Phase 4: Module Registration (Ngày 4)

````typescript
// filepath: backend/src/ctxh-chat/ctxh-chat.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CtxhVectorSyncService } from './services/ctxh-vector-sync.service';
import { VectorIngestionProcessor } from './processors/vector-ingestion.processor';
import { VECTOR_QUEUE } from './constants/vector-queue.constants';

@Module({
  imports: [
    // ...existing code...
    BullModule.registerQueue({
      name: VECTOR_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  providers: [
    // ...existing code...
    CtxhVectorSyncService,
    VectorIngestionProcessor, // 🔥 Worker với concurrency: 1
  ],
  exports: [
    // ...existing code...
    CtxhVectorSyncService,
  ],
})
export class CtxhChatModule {}
````

**(Tùy chọn) Cài Bull Board để monitor queue bằng UI:**

```bash
npm install @bull-board/nestjs @bull-board/express
```

````typescript
// filepath: backend/src/app.module.ts — thêm vào imports
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/express';
import { ExpressAdapter } from '@bull-board/express';

BullBoardModule.forRoot({ route: '/admin/queues', adapter: ExpressAdapter }),
BullBoardModule.forFeature({ name: VECTOR_QUEUE, adapter: BullMQAdapter }),
// Truy cập: http://localhost:3000/admin/queues
````

**Thêm endpoint giám sát queue vào controller:**

````typescript
// filepath: backend/src/ctxh-chat/controllers/ctxh-chat.controller.ts
import { CtxhVectorSyncService } from '../services/ctxh-vector-sync.service';

// Trong constructor, thêm:
// private readonly vectorSyncService: CtxhVectorSyncService,

@Get('ingestion/queue-status')
@UseGuards()
@ApiOperation({ summary: 'Get BullMQ queue stats (waiting/active/completed/failed)' })
async getQueueStatus() {
  return this.vectorSyncService.getQueueStatus();
}

@Post('ingestion/force-sync-all')
@UseGuards()
@ApiOperation({ summary: 'Add full re-index job to BullMQ queue' })
async forceSyncAll() {
  await this.vectorSyncService.forceSyncAll();
  return { message: 'Full sync job added to queue' };
}
````

---

### Phase 5: Scheduled Jobs (Ngày 5)

> Cron jobs cũng đẩy vào BullMQ queue thay vì gọi trực tiếp — giữ nguyên lợi thế `concurrency: 1`.

````typescript
// Thêm vào CtxhVectorSyncService (đã có @InjectQueue):
import { Cron, CronExpression } from '@nestjs/schedule';

// Chạy mỗi giờ: safety-net để bắt các activity bị bỏ sót (safety net)
@Cron(CronExpression.EVERY_HOUR)
async scheduledIncrementalSync() {
  const since = new Date(Date.now() - 65 * 60 * 1000);
  this.logger.log(`⏰ Scheduled incremental sync since ${since.toISOString()}`);
  // Đẩy từng activity thay đổi vào queue thay vì gọi trực tiếp
  const changedIds = await this.ingestionService.getChangedActivityIds(since);
  for (const id of changedIds) {
    await this.addUpsertJob(id);
  }
  this.logger.log(`⏰ Queued ${changedIds.length} activities for incremental sync`);
}

// Chạy lúc 2:00 AM mỗi ngày: full re-index qua BullMQ
@Cron('0 2 * * *')
async scheduledFullSync() {
  this.logger.log('🌙 Nightly full re-index — adding to queue');
  await this.forceSyncAll(); // dùng lại method đã có
}
````

---

## 4. Tổng Kết Timeline

```
Ngày 1-2: Phase 1 - EventEmitter + BullMQ + Redis setup
Ngày 2-3: Phase 2 - Emit events từ ActivityService
Ngày 3-4: Phase 3 - CtxhVectorSyncService (Event Bridge) + VectorIngestionProcessor (Worker)
Ngày 4:   Phase 4 - Module registration + Bull Board UI + API endpoints
Ngày 5:   Phase 5 - Scheduled jobs + End-to-end testing
```

### So Sánh: In-memory Map vs Redis BullMQ

| Tiêu chí | In-memory Map (cũ) | Redis BullMQ (mới) |
|---|---|---|
| Persist khi server crash | ❌ Mất hết job | ✅ Job còn trong Redis |
| Concurrency control | ✅ Thủ công (isProcessing flag) | ✅ Native (`concurrency: 1`) |
| Retry | ❌ Thủ công, không tin cậy | ✅ Tự động + exponential backoff |
| Deduplication | ✅ Map key = activityId | ✅ `jobId` = `upsert_{activityId}` |
| Monitor/Debug | ❌ Không có UI | ✅ Bull Board UI |
| Scale (multiple instances) | ❌ Mỗi instance queue riêng | ✅ Shared queue qua Redis |

## 5. Checklist Kiểm Tra

**Infrastructure**
- [x] Redis đang chạy và accessible (kiểm tra bằng `redis-cli ping`)
- [x] Biến môi trường `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` đã khai báo trong `.env`
- [x] `@nestjs/bull` ^11.0.4, `bull` ^4.16.5, `ioredis` ^5.8.2, `@nestjs/event-emitter` ^3.0.1, `@nestjs/schedule` ^6.1.1, `@types/bull` ^3.15.9 đã được cài
- [x] `BullModule.forRootAsync()`, `EventEmitterModule.forRoot()`, `ScheduleModule.forRoot()` đăng ký trong `AppModule`

**Event Pipeline**
- [x] `ActivityService` emit đủ 4 events: `activity.created/updated/deleted/status_changed` (+ `activity.restored`)
- [x] `CtxhVectorSyncService` lắng nghe đủ 4 events và add job vào `vectorize_queue`
- [x] Job `upsert_{activityId}` bị deduplicate (cập nhật nhiều lần → 1 job duy nhất)

**BullMQ Worker**
- [x] `VectorIngestionProcessor` đăng ký với `concurrency: 1`
- [x] `@Process('upsert_activity')` gọi đúng `ingestionService.processActivity()`
- [x] `@Process('delete_activity')` gọi đúng `ingestionService.deleteActivity()`
- [x] Retry 3 lần với exponential backoff (2s → 4s → 8s) khi Ollama timeout
- [x] Job thất bại sau 3 lần → chuyển sang `failed` state (không crash app)

**Scheduled Jobs**
- [x] Cron hourly incremental sync hoạt động (safety net)
- [x] Cron nightly full-sync chạy đúng lúc 2:00 AM
- [x] Cả 2 cron đều đẩy job vào queue (không gọi Ollama trực tiếp)

**Monitoring**
- [x] `GET /api/ctxh-chat/ingestion/queue-status` trả về `waiting/active/completed/failed` count
- [x] `POST /api/ctxh-chat/ingestion/force-sync-all` trigger full re-index thủ công
- [~] (Bỏ qua) Bull Board UI accessible tại `/admin/queues`

**End-to-End Tests**
- [ ] Tạo activity → job `upsert` xuất hiện trong queue → vector lưu vào pgvector
- [ ] Cập nhật field `name` → job `upsert` mới được thêm → vector được re-embed
- [ ] Cập nhật field không liên quan (VD: `approvedBy`) → không có job mới
- [ ] Xóa activity → job `delete` xuất hiện → vector bị xóa khỏi store
- [ ] Tắt Redis → service vẫn chạy, chỉ log warning; khởi động lại Redis → jobs tiếp tục