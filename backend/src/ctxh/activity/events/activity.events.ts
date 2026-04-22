/**
 * Event classes emitted by ActivitiesService whenever an activity changes.
 * These events are consumed by CtxhVectorSyncService to push embedding jobs
 * into the BullMQ queue.
 */

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
    /** Keys of UpdateActivityDto that were included in this update */
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

export class ActivityRestoredEvent {
  constructor(
    public readonly activityId: string,
    public readonly activityName: string,
    public readonly restoredBy?: string,
  ) {}
}

export class ActivityStatusChangedEvent {
  constructor(
    public readonly activityId: string,
    public readonly activityName: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
  ) {}
}

export const ACTIVITY_EVENTS = {
  CREATED: 'activity.created',
  UPDATED: 'activity.updated',
  DELETED: 'activity.deleted',
  RESTORED: 'activity.restored',
  STATUS_CHANGED: 'activity.status_changed',
} as const;
