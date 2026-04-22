// Custom Hook for MyCampaignsPage
// Handles filters, assignments, payment handling, and statistics

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserPaymentAssignments } from '@/shared/hooks/queries';
import type { PaymentAssignment } from '@/shared/hooks/queries';
import { paymentService } from '@/shared/services/fee-collection-service';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useToast } from '@/shared/hooks/useToast';
import {
    UseMyCampaignsPageReturn,
    MyCampaignsFilters,
    MyCampaignsSummaryStats
} from '../types';

export const useMyCampaignsPage = (): UseMyCampaignsPageReturn => {
    const { t } = useTranslation('myPayments');
    const { showError, toasts, hideToast } = useToast();

    // Filters state
    const [filters, setFilters] = useState<MyCampaignsFilters>({
        status: '',
        search: '',
        sortBy: 'dueDate',
        sortOrder: 'asc',
        page: 1,
        limit: 10
    });

    // Permissions
    const {
        canAccessMyPaymentsInOrg,
        userRoles,
        isSuperAdmin,
        permissionsLoading
    } = usePermissions();

    // Get current user ID from localStorage
    const userData = localStorage.getItem('user');
    const userId = userData ? JSON.parse(userData)?.id : null;

    // Fetch user assignments using TanStack Query
    const {
        data,
        isLoading: loading,
        error: queryError,
        refetch
    } = useUserPaymentAssignments(userId);

    const assignments = data?.assignments || [];
    const error = queryError ? (queryError instanceof Error ? queryError.message : t('errors.loadError')) : null;

    // Get organization name from assignment
    const getOrganizationName = useCallback((organizationId?: string): string => {
        if (!organizationId) return 'N/A';
        const assignment = assignments.find((a: PaymentAssignment) => a.campaign.organization.id === organizationId);
        return assignment?.campaign.organization.name || `Tổ chức ${organizationId}`;
    }, [assignments]);

    // Format amount in VND
    const formatAmount = useCallback((amount: number): string => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }, []);

    // Filter and sort assignments
    const filteredAndSortedAssignments = useMemo(() => {
        return assignments
            .filter((assignment: PaymentAssignment) => {
                // Only show assignments from campaigns with ACTIVE or CANCELLED status
                const isValidCampaignStatus = assignment.campaign.status === 'ACTIVE' || assignment.campaign.status === 'CANCELLED';
                const matchesStatus = !filters.status || assignment.status === filters.status;
                const matchesSearch = !filters.search ||
                    assignment.campaign.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                    assignment.campaign.organization.name.toLowerCase().includes(filters.search.toLowerCase());

                return isValidCampaignStatus && matchesStatus && matchesSearch;
            })
            .sort((a: PaymentAssignment, b: PaymentAssignment) => {
                // Prioritize PENDING at the top
                if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;

                let comparison = 0;

                switch (filters.sortBy) {
                    case 'dueDate':
                        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                        comparison = dateA - dateB;
                        break;
                    case 'assignedAt':
                        comparison = new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime();
                        break;
                    case 'amount':
                        const amountA = Number(a.feeLevel?.amount) || 0;
                        const amountB = Number(b.feeLevel?.amount) || 0;
                        comparison = amountA - amountB;
                        break;
                }

                return filters.sortOrder === 'desc' ? -comparison : comparison;
            });
    }, [assignments, filters.status, filters.search, filters.sortBy, filters.sortOrder]);

    // Pagination calculations
    const totalFiltered = filteredAndSortedAssignments.length;
    const totalPages = Math.ceil(totalFiltered / filters.limit);
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    const paginatedAssignments = filteredAndSortedAssignments.slice(startIndex, endIndex);

    // Summary statistics
    const summaryStats: MyCampaignsSummaryStats = useMemo(() => {
        const validAssignments = assignments.filter((a: PaymentAssignment) =>
            a.campaign.status === 'ACTIVE' || a.campaign.status === 'CANCELLED'
        );

        return {
            total: validAssignments.length,
            pending: validAssignments.filter((a: PaymentAssignment) => a.status === 'PENDING').length,
            overdue: validAssignments.filter((a: PaymentAssignment) => a.status === 'OVERDUE').length,
            paid: validAssignments.filter((a: PaymentAssignment) => a.status === 'PAID').length,
            totalAmount: validAssignments
                .filter((a: PaymentAssignment) => a.status === 'PENDING')
                .reduce((sum: number, a: PaymentAssignment) => {
                    const amount = Number(a.feeLevel?.amount) || 0;
                    return sum + amount;
                }, 0)
        };
    }, [assignments]);

    // Payment handler
    const handlePayNow = useCallback(async (assignmentId: string): Promise<void> => {
        try {
            const assignment = assignments.find((a: PaymentAssignment) => a.id === assignmentId);
            if (!assignment) {
                showError(t('errors.assignmentNotFound'));
                return;
            }

            const amount = Number(assignment.feeLevel?.amount) || 0;
            const organizationId = assignment.campaign.organization.id;

            const paymentResponse = await paymentService.createPaymentLink({
                assignmentId,
                campaignId: assignment.campaign.id,
                amount,
                description: `Thanh toán: ${assignment.campaign.name}`,
                organizationId,
            });

            if (paymentResponse.success && paymentResponse.data?.checkoutUrl) {
                window.location.href = paymentResponse.data.checkoutUrl;
            } else {
                throw new Error(paymentResponse.message || 'Không nhận được URL thanh toán từ server');
            }
        } catch (error) {
            console.error('Error creating payment:', error);
            showError(t('errors.paymentSystemError'));
        }
    }, [assignments, showError, t]);

    return {
        // State
        filters,
        loading,
        error,
        permissionsLoading,

        // Data
        paginatedAssignments,
        summaryStats,
        totalFiltered,
        totalPages,

        // Permissions
        isSuperAdmin: isSuperAdmin(),
        userRoles: userRoles || [],
        canAccessMyPaymentsInOrg,

        // Actions
        setFilters,
        handlePayNow,
        refetch,
        getOrganizationName,

        // Helpers
        formatAmount,

        // Toast
        toasts,
        hideToast
    };
};

export default useMyCampaignsPage;
