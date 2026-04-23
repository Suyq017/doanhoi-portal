import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ==================== QUERY KEYS ====================
export const paymentAssignmentKeys = {
    all: ['paymentAssignments'] as const,
    lists: () => [...paymentAssignmentKeys.all, 'list'] as const,
    list: (filters: any) => [...paymentAssignmentKeys.lists(), filters] as const,
    details: () => [...paymentAssignmentKeys.all, 'detail'] as const,
    detail: (id: string) => [...paymentAssignmentKeys.details(), id] as const,
    userAssignments: (userId: string) => [...paymentAssignmentKeys.all, 'user', userId] as const,
    stats: (filters?: any) => [...paymentAssignmentKeys.all, 'stats', filters] as const,
};

// ==================== INTERFACES ====================
export interface PaymentAssignment {
    id: string;
    campaignId: string;
    userId: string;
    feeLevelId?: string;
    note?: string;
    status: 'PENDING' | 'PAID' | 'OVERDUE';
    dueDate?: string;
    assignedAt: string;
    paidAt?: string;
    assignedById: string;
    campaign: {
        id: string;
        name: string;
        description?: string;
        status: string;
        startDate: string;
        endDate: string;
        organization: {
            id: string;
            name: string;
        };
    };
    user: {
        id: string;
        username: string;
        fullName: string;
        email?: string;
    };
    feeLevel?: {
        id: string;
        levelName: string;
        amount: number;
        description?: string;
    };
    transactions?: any[];
}

export interface PaymentAssignmentFilters {
    campaignId?: string;
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
}

// ==================== QUERY HOOKS ====================

/**
 * Hook to get current user's payment assignments
 * Cache: 2 minutes stale time, 10 minutes gc time
 */
export const useUserPaymentAssignments = (userId: string) => {
    return useQuery({
        queryKey: paymentAssignmentKeys.userAssignments(userId),
        queryFn: async () => {
            console.log('🔍 [PaymentAssignments] API Call - Fetching user assignments:', userId);

            const response = await fetch(`/api/payment/assignments?userId=${userId}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to fetch user assignments');
            }

            console.log('✅ [PaymentAssignments] API Response:', result);
            return result.success ? result.data : { assignments: [], pagination: null };
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!userId, // Only run if userId exists
    });
};

/**
 * Hook to get payment assignments with filters
 * Cache: 3 minutes stale time, 10 minutes gc time
 */
export const usePaymentAssignmentList = (filters: PaymentAssignmentFilters) => {
    return useQuery({
        queryKey: paymentAssignmentKeys.list(filters),
        queryFn: async () => {
            console.log('🔍 [PaymentAssignments] API Call - Fetching assignments with filters:', filters);

            const params = new URLSearchParams();
            if (filters.campaignId) params.append('campaignId', filters.campaignId);
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.status) params.append('status', filters.status);
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.limit) params.append('limit', filters.limit.toString());

            const response = await fetch(`/api/payment/assignments?${params}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to fetch assignments');
            }

            console.log('✅ [PaymentAssignments] API Response:', result);
            return result.success ? result.data : { assignments: [], pagination: null };
        },
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });
};

/**
 * Hook to get payment assignment by ID
 * Cache: 5 minutes stale time, 15 minutes gc time
 */
export const usePaymentAssignment = (id: string) => {
    return useQuery({
        queryKey: paymentAssignmentKeys.detail(id),
        queryFn: async () => {
            const response = await fetch(`/api/payment/assignments/${id}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to fetch assignment');
            }

            return result.success ? result.data : null;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!id,
    });
};

// ==================== MUTATION HOOKS ====================

/**
 * Hook to mark assignment as paid
 */
export const useMarkAssignmentAsPaid = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/payment/assignments/${id}/mark-paid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to mark assignment as paid');
            }

            return result.data;
        },
        onSuccess: () => {
            // Invalidate all assignment queries
            queryClient.invalidateQueries({ queryKey: paymentAssignmentKeys.all });
        },
    });
};

/**
 * Hook to delete assignment
 */
export const useDeletePaymentAssignment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/payment/assignments/${id}`, {
                method: 'DELETE',
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to delete assignment');
            }

            return result.data;
        },
        onSuccess: () => {
            // Invalidate all assignment queries
            queryClient.invalidateQueries({ queryKey: paymentAssignmentKeys.all });
        },
    });
};
