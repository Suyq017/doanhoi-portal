import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { paymentCampaignService } from '../../services/fee-collection-service';
import { paymentCampaignKeys } from './paymentCampaignKeys';
import {
    PaymentCampaign,
    PaymentCampaignFilters,
    CreatePaymentCampaignDto,
    UpdatePaymentCampaignDto,
} from '../../../features/fee-collection/types';

/**
 * ========================
 * QUERY HOOKS - DATA FETCHING
 * ========================
 */

/**
 * Hook for fetching payment campaigns list with pagination & filters
 * Cache key: ['paymentCampaigns', 'list', { page, limit, status, ... }]
 * 
 * Features:
 * - Smart caching per filter combination
 * - PlaceholderData for smooth pagination
 * - Background refetch for fresh data
 */
export const usePaymentCampaignList = (
    filters: PaymentCampaignFilters = { page: 1, limit: 10 }
) => {
    return useQuery({
        queryKey: paymentCampaignKeys.list(filters),
        queryFn: async () => {
            console.log('🔍 [PaymentCampaigns] API Call - Fetching campaigns:', filters);
            const response = await paymentCampaignService.getPaymentCampaigns(filters);
            console.log('✅ [PaymentCampaigns] API Response:', response);
            return response;
        },
        staleTime: 3 * 60 * 1000, // 3 minutes (data thay đổi thường xuyên)
        gcTime: 10 * 60 * 1000,   // 10 minutes
        placeholderData: keepPreviousData, // Show previous page while fetching
        refetchOnMount: false, // ✅ Don't refetch if cache is still fresh (within stale time)
        refetchOnWindowFocus: false, // ✅ Don't refetch on tab switch
    });
};

/**
 * Hook for fetching single campaign detail
 * Cache key: ['paymentCampaigns', 'detail', id]
 */
export const usePaymentCampaignDetail = (
    id: string,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: paymentCampaignKeys.detail(id),
        queryFn: async () => {
            const campaign = await paymentCampaignService.getPaymentCampaignById(id);
            return campaign;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000,
        enabled: options?.enabled ?? !!id,
    });
};

/**
 * Hook for fetching campaign statistics
 * Cache key: ['paymentCampaigns', 'stats', id]
 */
export const useCampaignStatistics = (
    id: string,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: paymentCampaignKeys.stat(id),
        queryFn: async () => {
            const response = await paymentCampaignService.getPaymentCampaignStatistics(id);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes (stats ít thay đổi)
        gcTime: 30 * 60 * 1000,   // 30 minutes
        enabled: options?.enabled ?? !!id,
    });
};

/**
 * Hook for fetching accessible organizations
 * Cache key: ['paymentCampaigns', 'accessible-orgs']
 * 
 * Shared cache: Nhiều components dùng chung cache này
 */
export const useAccessibleOrganizations = () => {
    return useQuery({
        queryKey: paymentCampaignKeys.accessibleOrgs(),
        queryFn: async () => {
            const orgs = await paymentCampaignService.getAccessibleOrganizations();
            return orgs;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes (organizations ít thay đổi)
        gcTime: 30 * 60 * 1000,   // 30 minutes
        refetchOnMount: false,    // Don't refetch if cache is fresh
    });
};

/**
 * Hook for fetching campaigns by organization
 * Cache key: ['paymentCampaigns', 'organization', orgId]
 */
export const useCampaignsByOrganization = (
    organizationId: string,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: paymentCampaignKeys.byOrganization(organizationId),
        queryFn: async () => {
            const response = await paymentCampaignService.getPaymentCampaignsByOrganization(organizationId);
            return response.data;
        },
        staleTime: 3 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        enabled: options?.enabled ?? !!organizationId,
    });
};

/**
 * ========================
 * MUTATION HOOKS - DATA MODIFICATION
 * ========================
 */

/**
 * Hook for creating payment campaign
 * 
 * Optimistic Update Flow:
 * 1. Add new campaign to cache immediately
 * 2. Send request to server
 * 3. If success: Invalidate lists to refetch
 * 4. If error: Rollback optimistic update
 */
export const useCreatePaymentCampaign = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreatePaymentCampaignDto) => {
            const response = await paymentCampaignService.createPaymentCampaign(data);
            // Handle both response.data (ApiResponse wrapper) and direct response
            return response.data || response;
        },

        onSuccess: (newCampaign, variables) => {
            // ✅ Use refetchQueries instead of invalidateQueries to force immediate refetch
            queryClient.refetchQueries({
                queryKey: paymentCampaignKeys.lists(),
                type: 'active' // Only refetch active queries (currently mounted)
            });

            // Invalidate organization-specific queries using the organizationId from input
            if (variables.organizationId) {
                queryClient.refetchQueries({
                    queryKey: paymentCampaignKeys.byOrganization(variables.organizationId),
                    type: 'active'
                });
            }

            // Pre-populate detail cache for instant access (only if newCampaign has id)
            if (newCampaign?.id) {
                queryClient.setQueryData(
                    paymentCampaignKeys.detail(newCampaign.id),
                    newCampaign
                );
            }
        },

        onError: (error) => {
            console.error('Failed to create campaign:', error);
        },
    });
};/**
 * Hook for updating payment campaign
 * 
 * Optimistic Update Flow:
 * 1. Update campaign in cache immediately
 * 2. Send request to server
 * 3. If error: Rollback to previous state
 */
export const useUpdatePaymentCampaign = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdatePaymentCampaignDto }) => {
            const response = await paymentCampaignService.updatePaymentCampaign(id, data);
            return response.data;
        },

        // Optimistic update
        onMutate: async ({ id, data }) => {
            // Cancel ongoing queries
            await queryClient.cancelQueries({
                queryKey: paymentCampaignKeys.detail(id)
            });

            // Snapshot current value for rollback
            const previousCampaign = queryClient.getQueryData<PaymentCampaign>(
                paymentCampaignKeys.detail(id)
            );

            // Optimistically update detail cache
            if (previousCampaign) {
                queryClient.setQueryData(
                    paymentCampaignKeys.detail(id),
                    { ...previousCampaign, ...data }
                );
            }

            // Optimistically update list cache
            queryClient.setQueriesData(
                { queryKey: paymentCampaignKeys.lists() },
                (old: any) => {
                    if (!old?.data) return old;
                    return {
                        ...old,
                        data: old.data.map((campaign: PaymentCampaign) =>
                            campaign.id === id ? { ...campaign, ...data } : campaign
                        ),
                    };
                }
            );

            return { previousCampaign };
        },

        // Rollback on error
        onError: (_err, { id }, context) => {
            if (context?.previousCampaign) {
                queryClient.setQueryData(
                    paymentCampaignKeys.detail(id),
                    context.previousCampaign
                );
            }
        },

        // Refetch to ensure sync with server
        onSuccess: (updatedCampaign) => {
            // Update detail cache with server response
            queryClient.setQueryData(
                paymentCampaignKeys.detail(updatedCampaign.id),
                updatedCampaign
            );

            // Invalidate lists to refetch
            queryClient.invalidateQueries({
                queryKey: paymentCampaignKeys.lists()
            });

            // Invalidate stats if exists
            queryClient.invalidateQueries({
                queryKey: paymentCampaignKeys.stat(updatedCampaign.id)
            });
        },
    });
};

/**
 * Hook for deleting payment campaign
 * 
 * Optimistic Update Flow:
 * 1. Remove campaign from cache immediately
 * 2. Send delete request
 * 3. If error: Restore campaign
 */
export const useDeletePaymentCampaign = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await paymentCampaignService.deletePaymentCampaign(id);
            return id;
        },

        // Optimistic update
        onMutate: async (id) => {
            // Cancel ongoing queries
            await queryClient.cancelQueries({
                queryKey: paymentCampaignKeys.lists()
            });

            // Snapshot for rollback
            const previousLists = queryClient.getQueriesData({
                queryKey: paymentCampaignKeys.lists()
            });

            // Optimistically remove from cache
            queryClient.setQueriesData(
                { queryKey: paymentCampaignKeys.lists() },
                (old: any) => {
                    if (!old?.data) return old;
                    return {
                        ...old,
                        data: old.data.filter((campaign: PaymentCampaign) => campaign.id !== id),
                        total: (old.total || 0) - 1,
                    };
                }
            );

            return { previousLists };
        },

        // Rollback on error
        onError: (_err, _id, context) => {
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },

        // Cleanup on success
        onSuccess: (deletedId) => {
            // Remove detail cache
            queryClient.removeQueries({
                queryKey: paymentCampaignKeys.detail(deletedId)
            });

            // Remove stats cache
            queryClient.removeQueries({
                queryKey: paymentCampaignKeys.stat(deletedId)
            });

            // Refetch lists to ensure sync
            queryClient.invalidateQueries({
                queryKey: paymentCampaignKeys.lists()
            });
        },
    });
};

/**
 * Hook for status change actions (activate, complete, cancel)
 */
export const useChangeCampaignStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            action
        }: {
            id: string;
            action: 'activate' | 'complete' | 'cancel'
        }) => {
            let response;
            switch (action) {
                case 'activate':
                    response = await paymentCampaignService.activatePaymentCampaign(id);
                    break;
                case 'complete':
                    response = await paymentCampaignService.completePaymentCampaign(id);
                    break;
                case 'cancel':
                    response = await paymentCampaignService.cancelPaymentCampaign(id);
                    break;
            }
            return response.data;
        },

        // Optimistic update
        onMutate: async ({ id, action }) => {
            // Cancel ongoing queries
            await queryClient.cancelQueries({
                queryKey: paymentCampaignKeys.detail(id)
            });

            // Snapshot for rollback
            const previousCampaign = queryClient.getQueryData<PaymentCampaign>(
                paymentCampaignKeys.detail(id)
            );

            // Determine new status
            const newStatus = action === 'activate' ? 'ACTIVE'
                : action === 'complete' ? 'COMPLETED'
                    : 'CANCELLED';

            // Optimistically update detail cache
            if (previousCampaign) {
                queryClient.setQueryData(
                    paymentCampaignKeys.detail(id),
                    { ...previousCampaign, status: newStatus }
                );
            }

            // Optimistically update list cache
            queryClient.setQueriesData(
                { queryKey: paymentCampaignKeys.lists() },
                (old: any) => {
                    if (!old?.data) return old;
                    return {
                        ...old,
                        data: old.data.map((campaign: PaymentCampaign) =>
                            campaign.id === id
                                ? { ...campaign, status: newStatus }
                                : campaign
                        ),
                    };
                }
            );

            return { previousCampaign };
        },

        // Rollback on error
        onError: (_err, { id }, context) => {
            if (context?.previousCampaign) {
                queryClient.setQueryData(
                    paymentCampaignKeys.detail(id),
                    context.previousCampaign
                );
            }
        },

        // Refetch on success
        onSuccess: (updatedCampaign) => {
            // Update caches with server response
            queryClient.setQueryData(
                paymentCampaignKeys.detail(updatedCampaign.id),
                updatedCampaign
            );

            queryClient.invalidateQueries({
                queryKey: paymentCampaignKeys.lists()
            });

            queryClient.invalidateQueries({
                queryKey: paymentCampaignKeys.stat(updatedCampaign.id)
            });
        },
    });
};

/**
 * ========================
 * UTILITY HOOKS
 * ========================
 */

/**
 * Hook to manually invalidate caches
 */
export const useInvalidatePaymentCampaigns = () => {
    const queryClient = useQueryClient();

    return {
        // Invalidate all campaign queries
        invalidateAll: () => {
            queryClient.invalidateQueries({
                queryKey: paymentCampaignKeys.all
            });
        },

        // Invalidate only lists
        invalidateLists: () => {
            queryClient.invalidateQueries({
                queryKey: paymentCampaignKeys.lists()
            });
        },

        // Invalidate specific detail
        invalidateDetail: (id: string) => {
            queryClient.invalidateQueries({
                queryKey: paymentCampaignKeys.detail(id)
            });
        },

        // Invalidate stats
        invalidateStats: (id: string) => {
            queryClient.invalidateQueries({
                queryKey: paymentCampaignKeys.stat(id)
            });
        },

        // Invalidate accessible organizations
        invalidateAccessibleOrgs: () => {
            queryClient.invalidateQueries({
                queryKey: paymentCampaignKeys.accessibleOrgs()
            });
        },
    };
};
