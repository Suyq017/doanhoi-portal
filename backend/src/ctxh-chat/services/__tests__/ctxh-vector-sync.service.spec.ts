import { CtxhVectorSyncService } from '../ctxh-vector-sync.service';
import { VECTOR_JOB } from '../../constants/vector-queue.constants';

describe('CtxhVectorSyncService', () => {
  let svc: CtxhVectorSyncService;
  const vectorQueue: any = {
    add: jest.fn(),
    getWaitingCount: jest.fn(),
    getActiveCount: jest.fn(),
    getCompletedCount: jest.fn(),
    getFailedCount: jest.fn(),
    getDelayedCount: jest.fn(),
  };
  const ingestionService: any = {};

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new CtxhVectorSyncService(vectorQueue, ingestionService, {} as any);
  });

  it('queues upsert on activity created', async () => {
    await svc.handleActivityCreated({ activityId: 'a1', activityName: 'Act 1', createdBy: 'u1' } as any);
    expect(vectorQueue.add).toHaveBeenCalledWith(
      VECTOR_JOB.UPSERT,
      expect.objectContaining({ activityId: 'a1', activityName: 'Act 1' }),
      expect.objectContaining({ jobId: 'upsert_a1' }),
    );
  });

  it('skips update when no content fields changed', async () => {
    await svc.handleActivityUpdated({ activityId: 'a2', activityName: 'No change', changedFields: ['some_other_field'], updatedBy: 'u2' } as any);
    expect(vectorQueue.add).not.toHaveBeenCalled();
  });

  it('queues upsert when content fields changed', async () => {
    await svc.handleActivityUpdated({ activityId: 'a3', activityName: 'Changed', changedFields: ['name'], updatedBy: 'u3' } as any);
    expect(vectorQueue.add).toHaveBeenCalledWith(
      VECTOR_JOB.UPSERT,
      expect.objectContaining({ activityId: 'a3', activityName: 'Changed', triggeredBy: 'u3' }),
      expect.objectContaining({ jobId: 'upsert_a3' }),
    );
  });

  it('queues delete on activity deleted', async () => {
    await svc.handleActivityDeleted({ activityId: 'a4', activityName: 'To Delete' } as any);
    expect(vectorQueue.add).toHaveBeenCalledWith(
      VECTOR_JOB.DELETE,
      expect.objectContaining({ activityId: 'a4', activityName: 'To Delete' }),
      expect.objectContaining({ jobId: 'delete_a4' }),
    );
  });

  it('queues upsert on activity restored', async () => {
    await svc.handleActivityRestored({ activityId: 'a5', activityName: 'Restored', restoredBy: 'u5' } as any);
    expect(vectorQueue.add).toHaveBeenCalledWith(
      VECTOR_JOB.UPSERT,
      expect.objectContaining({ activityId: 'a5', activityName: 'Restored', triggeredBy: 'u5' }),
      expect.objectContaining({ jobId: 'upsert_a5' }),
    );
  });

  it('queues upsert on status changed', async () => {
    await svc.handleStatusChanged({ activityId: 'a6', activityName: 'Status', oldStatus: 'DRAFT', newStatus: 'ACTIVE' } as any);
    expect(vectorQueue.add).toHaveBeenCalledWith(
      VECTOR_JOB.UPSERT,
      expect.objectContaining({ activityId: 'a6', activityName: 'Status' }),
      expect.objectContaining({ jobId: 'upsert_a6' }),
    );
  });

  it('scheduledIncrementalSync enqueues incremental full sync', async () => {
    await svc.scheduledIncrementalSync();
    expect(vectorQueue.add).toHaveBeenCalledWith(
      VECTOR_JOB.FULL_SYNC,
      expect.objectContaining({ activityId: 'incremental', triggeredBy: 'cron:hourly' }),
      expect.objectContaining({ jobId: 'incremental_sync_latest' }),
    );
  });

  it('forceSyncAll enqueues full sync with full_sync_latest jobId', async () => {
    await svc.forceSyncAll();
    expect(vectorQueue.add).toHaveBeenCalledWith(
      VECTOR_JOB.FULL_SYNC,
      expect.objectContaining({ activityId: 'all', triggeredBy: 'manual' }),
      expect.objectContaining({ jobId: 'full_sync_latest' }),
    );
  });

  it('scheduledFullSync calls forceSyncAll', async () => {
    const spy = jest.spyOn(svc, 'forceSyncAll').mockResolvedValue(undefined);
    await svc.scheduledFullSync();
    expect(spy).toHaveBeenCalled();
  });

  it('getQueueStatus returns counts', async () => {
    vectorQueue.getWaitingCount.mockResolvedValue(1);
    vectorQueue.getActiveCount.mockResolvedValue(2);
    vectorQueue.getCompletedCount.mockResolvedValue(3);
    vectorQueue.getFailedCount.mockResolvedValue(4);
    vectorQueue.getDelayedCount.mockResolvedValue(5);

    const res = await svc.getQueueStatus();
    expect(res).toEqual({ waiting: 1, active: 2, completed: 3, failed: 4, delayed: 5 });
  });
});

export {};
