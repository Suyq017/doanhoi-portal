import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService, activityService, limitConfigService } from '../../../features/ctxh/services';
import { ctxhKeys } from './ctxhKeys';
import type {
  CategoryQueryParams,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ActivityQueryParams,
  CreateActivityRequest,
  UpdateActivityRequest,
  AddStudentRequest,
  LimitConfigQueryParams,
  CreateLimitConfigRequest,
  UpdateLimitConfigRequest,
} from '../../../features/ctxh/types';

// ============================================
// CATEGORY QUERIES & MUTATIONS
// ============================================

/**
 * Hook để lấy danh sách danh mục CTXH với pagination và filtering
 * Cache time: 3 phút (categories ít thay đổi)
 */
export const useCategoryList = (params?: CategoryQueryParams) => {
  return useQuery({
    queryKey: ctxhKeys.categoriesList(params),
    queryFn: async () => {
      const response = await categoryService.findAll(params);
      return response;
    },
    staleTime: 3 * 60 * 1000, // 3 phút - categories ít thay đổi
    gcTime: 15 * 60 * 1000, // 15 phút
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook để lấy chi tiết một danh mục
 */
export const useCategoryDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ctxhKeys.categoryDetail(id),
    queryFn: async () => {
      return await categoryService.findOne(id);
    },
    staleTime: 5 * 60 * 1000, // 5 phút
    gcTime: 30 * 60 * 1000, // 30 phút
    enabled: enabled && !!id,
  });
};

/**
 * Mutation để tạo danh mục mới
 * Tự động refetch danh sách categories sau khi tạo thành công
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      return await categoryService.create(data);
    },
    onSuccess: () => {
      // Refetch all category lists để có data mới nhất
      queryClient.refetchQueries({
        queryKey: ctxhKeys.categories(),
        type: 'active', // Chỉ refetch queries đang được sử dụng
      });
    },
  });
};

/**
 * Mutation để cập nhật danh mục
 * Tự động update cache cho detail và refetch lists
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryRequest }) => {
      return await categoryService.update(id, data);
    },
    onSuccess: (updatedCategory) => {
      // Refetch all category lists
      queryClient.refetchQueries({
        queryKey: ctxhKeys.categories(),
        type: 'active',
      });

      // Update detail cache if exists
      if (updatedCategory?.id) {
        queryClient.setQueryData(ctxhKeys.categoryDetail(updatedCategory.id), updatedCategory);
      }
    },
  });
};

/**
 * Mutation để xóa (soft delete) danh mục
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await categoryService.delete(id);
    },
    onSuccess: () => {
      // Refetch để cập nhật danh sách
      queryClient.refetchQueries({
        queryKey: ctxhKeys.categories(),
        type: 'active',
      });
    },
  });
};

/**
 * Mutation để khôi phục danh mục đã xóa
 */
export const useRestoreCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await categoryService.restore(id);
    },
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: ctxhKeys.categories(),
        type: 'active',
      });
    },
  });
};

// ============================================
// ACTIVITY QUERIES & MUTATIONS
// ============================================

/**
 * Hook để lấy danh sách hoạt động CTXH với filtering phức tạp
 * Cache time: 2 phút (activities thay đổi thường xuyên hơn)
 */
export const useActivityList = (params?: ActivityQueryParams) => {
  return useQuery({
    queryKey: ctxhKeys.activitiesList(params),
    queryFn: async () => {
      const response = await activityService.findAll(params);
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 phút - activities thay đổi thường xuyên hơn
    gcTime: 10 * 60 * 1000, // 10 phút
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook để lấy chi tiết một hoạt động
 */
export const useActivityDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ctxhKeys.activityDetail(id),
    queryFn: async () => {
      return await activityService.findOne(id);
    },
    staleTime: 3 * 60 * 1000, // 3 phút
    gcTime: 15 * 60 * 1000, // 15 phút
    enabled: enabled && !!id,
  });
};

/**
 * Hook để lấy danh sách sinh viên tham gia hoạt động
 * Cache time ngắn vì participants thay đổi rất thường xuyên
 */
export const useActivityParticipants = (activityId: string, enabled = true) => {
  return useQuery({
    queryKey: ctxhKeys.activityParticipants(activityId),
    queryFn: async () => {
      return await activityService.getParticipants(activityId);
    },
    staleTime: 1 * 60 * 1000, // 1 phút - participants thay đổi rất thường xuyên
    gcTime: 5 * 60 * 1000, // 5 phút
    enabled: enabled && !!activityId,
  });
};

/**
 * Mutation để tạo hoạt động mới
 */
export const useCreateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateActivityRequest) => {
      return await activityService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ctxhKeys.activities(),
      });

      // Mark category lists stale so next visit always fetches new activity counts
      queryClient.invalidateQueries({
        queryKey: ctxhKeys.categories(),
      });
    },
  });
};

/**
 * Mutation để cập nhật hoạt động
 */
export const useUpdateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateActivityRequest }) => {
      return await activityService.update(id, data);
    },
    onSuccess: (updatedActivity) => {
      // Ensure activity list data is refreshed whether query is active or inactive
      queryClient.invalidateQueries({
        queryKey: ctxhKeys.activities(),
      });

      // Category counts can change when updating activity/category
      queryClient.invalidateQueries({
        queryKey: ctxhKeys.categories(),
      });

      // Update detail cache
      if (updatedActivity?.id) {
        queryClient.setQueryData(ctxhKeys.activityDetail(updatedActivity.id), updatedActivity);
      }
    },
  });
};

/**
 * Mutation để xóa hoạt động
 */
export const useDeleteActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await activityService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ctxhKeys.activities(),
      });

      // Activity count per category decreases after deletion
      queryClient.invalidateQueries({
        queryKey: ctxhKeys.categories(),
      });
    },
  });
};

/**
 * Mutation để thêm sinh viên vào hoạt động
 */
export const useAddParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId, data }: { activityId: string; data: AddStudentRequest }) => {
      return await activityService.addStudent(activityId, data);
    },
    onSuccess: (_, variables) => {
      // Refetch participants list cho activity này
      queryClient.refetchQueries({
        queryKey: ctxhKeys.activityParticipants(variables.activityId),
        type: 'active',
      });
    },
  });
};

/**
 * Mutation để xóa sinh viên khỏi hoạt động
 */
export const useRemoveParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId, participationId }: { activityId: string; participationId: string }) => {
      return await activityService.removeParticipant(activityId, participationId);
    },
    onSuccess: (_, variables) => {
      // Refetch participants list
      queryClient.refetchQueries({
        queryKey: ctxhKeys.activityParticipants(variables.activityId),
        type: 'active',
      });
    },
  });
};

// ============================================
// LIMIT CONFIG QUERIES & MUTATIONS
// ============================================

/**
 * Hook để lấy danh sách cấu hình giới hạn
 * Cache time: 5 phút (configs ít thay đổi)
 */
export const useLimitConfigList = (params?: LimitConfigQueryParams) => {
  return useQuery({
    queryKey: ctxhKeys.limitConfigsList(params),
    queryFn: async () => {
      const response = await limitConfigService.findAll(params);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 phút - configs ít thay đổi
    gcTime: 30 * 60 * 1000, // 30 phút
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook để lấy chi tiết cấu hình
 */
export const useLimitConfigDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ctxhKeys.limitConfigDetail(id),
    queryFn: async () => {
      return await limitConfigService.findOne(id);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: enabled && !!id,
  });
};

/**
 * Mutation để tạo cấu hình mới
 */
export const useCreateLimitConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLimitConfigRequest) => {
      return await limitConfigService.create(data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: ctxhKeys.limitConfigs(),
        type: 'active',
      });
    },
  });
};

/**
 * Mutation để cập nhật cấu hình
 */
export const useUpdateLimitConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLimitConfigRequest }) => {
      return await limitConfigService.update(id, data);
    },
    onSuccess: (updatedConfig) => {
      queryClient.refetchQueries({
        queryKey: ctxhKeys.limitConfigs(),
        type: 'active',
      });

      if (updatedConfig?.id) {
        queryClient.setQueryData(ctxhKeys.limitConfigDetail(updatedConfig.id), updatedConfig);
      }
    },
  });
};

/**
 * Mutation để xóa cấu hình
 */
export const useDeleteLimitConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await limitConfigService.delete(id);
    },
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: ctxhKeys.limitConfigs(),
        type: 'active',
      });
    },
  });
};

/**
 * Mutation để khôi phục cấu hình
 */
export const useRestoreLimitConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await limitConfigService.restore(id);
    },
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: ctxhKeys.limitConfigs(),
        type: 'active',
      });
    },
  });
};
