import type {
  CategoryQueryParams,
  ActivityQueryParams,
  LimitConfigQueryParams,
} from '../../../features/ctxh/types';

/**
 * Hierarchical query keys cho CTXH module
 * Structured để dễ dàng invalidate cache theo từng entity type
 */
export const ctxhKeys = {
  all: ['ctxh'] as const,

  // ============================================
  // Categories Keys
  // ============================================
  categories: () => [...ctxhKeys.all, 'categories'] as const,
  categoriesList: (filters?: CategoryQueryParams) =>
    [...ctxhKeys.categories(), 'list', filters] as const,
  categoryDetail: (id: string) =>
    [...ctxhKeys.categories(), 'detail', id] as const,

  // ============================================
  // Activities Keys
  // ============================================
  activities: () => [...ctxhKeys.all, 'activities'] as const,
  activitiesList: (filters?: ActivityQueryParams) =>
    [...ctxhKeys.activities(), 'list', filters] as const,
  activityDetail: (id: string) =>
    [...ctxhKeys.activities(), 'detail', id] as const,
  activityParticipants: (activityId: string) =>
    [...ctxhKeys.activities(), 'detail', activityId, 'participants'] as const,

  // ============================================
  // Limit Configs Keys
  // ============================================
  limitConfigs: () => [...ctxhKeys.all, 'limitConfigs'] as const,
  limitConfigsList: (filters?: LimitConfigQueryParams) =>
    [...ctxhKeys.limitConfigs(), 'list', filters] as const,
  limitConfigDetail: (id: string) =>
    [...ctxhKeys.limitConfigs(), 'detail', id] as const,
};
