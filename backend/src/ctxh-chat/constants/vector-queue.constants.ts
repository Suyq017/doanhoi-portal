/**
 * BullMQ queue name used for vector embedding jobs.
 * Registered in CtxhChatModule and consumed by VectorIngestionProcessor.
 */
export const VECTOR_QUEUE = 'vectorize_queue';

/**
 * Job name constants for the vectorize_queue.
 * Used as the first argument to queue.add() and @Process() decorator.
 */
export const VECTOR_JOB = {
  /** Re-embed (insert or update) a single activity's vectors */
  UPSERT: 'upsert_activity',
  /** Remove all vectors belonging to a deleted activity */
  DELETE: 'delete_activity',
  /** Trigger a full re-index of all activities */
  FULL_SYNC: 'full_sync',
} as const;

/**
 * Payload shape stored in Redis for every queued job.
 */
export interface VectorJobPayload {
  activityId: string;
  activityName?: string;
  triggeredBy?: string;
  timestamp: string;
}
