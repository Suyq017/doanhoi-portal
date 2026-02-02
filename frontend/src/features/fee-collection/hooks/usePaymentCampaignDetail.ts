// Custom Hook for PaymentCampaignDetailPage
// Handles campaign data, tabs, status actions, and activation requirements

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/shared/hooks/useToast';
import {
    PaymentCampaign,
    PaymentFeeLevel,
    UsePaymentCampaignDetailReturn,
    CampaignStatusAction,
    DetailTab
} from '../types';
import {
    paymentCampaignService,
    paymentFeeLevelService,
    paymentAssignmentService
} from '@/shared/services/fee-collection-service';

export const usePaymentCampaignDetail = (): UsePaymentCampaignDetailReturn => {
    const { t } = useTranslation('paymentCampaigns');
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { toasts, confirmDialog, showSuccess, showError, showConfirm, hideToast } = useToast();

    // State
    const [campaign, setCampaign] = useState<PaymentCampaign | null>(null);
    const [feeLevels, setFeeLevels] = useState<PaymentFeeLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [activationError, setActivationError] = useState<string | null>(null);
    const [assignmentCount, setAssignmentCount] = useState(0);
    const [canActivate, setCanActivate] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Tab state
    const currentTab = (searchParams.get('tab') || 'statistics') as DetailTab;

    // Helper functions
    const getStatusColor = useCallback((status: PaymentCampaign['status']): string => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'COMPLETED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    }, []);

    const getStatusText = useCallback((status: PaymentCampaign['status']): string => {
        switch (status) {
            case 'DRAFT': return t('status.draft');
            case 'ACTIVE': return t('status.active');
            case 'COMPLETED': return t('status.completed');
            case 'CANCELLED': return t('status.cancelled');
            default: return status;
        }
    }, [t]);

    // Check activation requirements
    const checkActivationRequirements = useCallback(async (campaignId?: string, currentFeeLevels?: PaymentFeeLevel[]) => {
        const checkId = campaignId || id;
        const checkFeeLevels = currentFeeLevels || feeLevels;

        if (!checkId) return;

        try {
            const hasFeeLevels = checkFeeLevels && checkFeeLevels.length > 0;

            let hasAssignments = false;
            try {
                const assignmentsResponse: any = await paymentAssignmentService.getAssignmentsByCampaign(checkId);
                const assignments = assignmentsResponse.data?.assignments || [];
                setAssignmentCount(assignments.length);
                hasAssignments = assignments.length > 0;
            } catch (err) {
                setAssignmentCount(0);
                hasAssignments = false;
            }

            setCanActivate(hasFeeLevels && hasAssignments);
        } catch (err) {
            console.error('Error checking activation requirements:', err);
            setCanActivate(false);
        }
    }, [id, feeLevels]);

    // Load campaign data
    const loadCampaignData = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);
            setError(null);
            setActivationError(null);

            const [campaignResponse, feeLevelsResponse]: any = await Promise.all([
                paymentCampaignService.getPaymentCampaignById(id),
                paymentFeeLevelService.getFeeLevelsByCampaign(id)
            ]);

            setCampaign(campaignResponse);
            setFeeLevels(feeLevelsResponse);

            await checkActivationRequirements(id, feeLevelsResponse);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load campaign data');
        } finally {
            setLoading(false);
        }
    }, [id, checkActivationRequirements]);

    // Tab change handler
    const handleTabChange = useCallback((tabId: string) => {
        setSearchParams({ tab: tabId });
    }, [setSearchParams]);

    // Modal handlers
    const handleEditCampaign = useCallback(() => {
        setShowEditModal(true);
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setShowEditModal(false);
    }, []);

    const handleCampaignUpdated = useCallback(() => {
        setShowEditModal(false);
        if (id) {
            loadCampaignData();
        }
    }, [id, loadCampaignData]);

    // Status change handler
    const handleStatusChange = useCallback(async (action: CampaignStatusAction) => {
        if (!campaign) return;

        // Check activation requirements for activate action
        if (action === 'activate' && !canActivate) {
            const missingRequirements = [];
            if (!feeLevels || feeLevels.length === 0) {
                missingRequirements.push(t('activation.noFeeLevels'));
            }
            if (assignmentCount === 0) {
                missingRequirements.push(t('activation.noMembers'));
            }
            setActivationError(t('activation.error', { requirements: missingRequirements.join(', ') }));
            return;
        }

        // Confirmation dialogs
        const confirmationKeys = {
            activate: 'activate',
            complete: 'complete',
            cancel: 'cancelCampaign'
        };

        const variants = {
            activate: 'warning' as const,
            complete: 'info' as const,
            cancel: 'danger' as const
        };

        const shouldProceed = await showConfirm(
            t(`confirmations.${confirmationKeys[action]}.title`),
            t(`confirmations.${confirmationKeys[action]}.message`),
            {
                confirmText: t(`confirmations.${confirmationKeys[action]}.confirm`),
                cancelText: t(`confirmations.${confirmationKeys[action]}.cancel`),
                variant: variants[action]
            }
        );

        if (!shouldProceed) return;

        try {
            setActionLoading(true);
            setActivationError(null);
            let response;

            switch (action) {
                case 'activate':
                    response = await paymentCampaignService.activatePaymentCampaign(campaign.id);
                    break;
                case 'complete':
                    response = await paymentCampaignService.completePaymentCampaign(campaign.id);
                    break;
                case 'cancel':
                    response = await paymentCampaignService.cancelPaymentCampaign(campaign.id);
                    break;
            }

            const updatedCampaign = response?.data || response;

            if (updatedCampaign) {
                setCampaign(updatedCampaign);
                const actionMessages = {
                    activate: t('messages.activateSuccess'),
                    complete: t('messages.completeSuccess'),
                    cancel: t('messages.cancelSuccess')
                };
                showSuccess(actionMessages[action]);
            } else {
                showError(t('messages.errorStatusUpdate'));
            }
        } catch (err) {
            console.error('Error in handleStatusChange:', err);
            const errorMessage = err instanceof Error ? err.message : `Failed to ${action} campaign`;

            if (action === 'activate') {
                setActivationError(t('messages.errorActivate', { error: errorMessage }));
            } else {
                const errorKey = action === 'complete' ? 'messages.errorComplete' : 'messages.errorCancel';
                showError(t(errorKey, { error: errorMessage }));
            }

            if (id) {
                await loadCampaignData();
            }
        } finally {
            setActionLoading(false);
        }
    }, [campaign, canActivate, feeLevels, assignmentCount, t, showConfirm, showSuccess, showError, id, loadCampaignData]);

    // Delete handler
    const handleDelete = useCallback(async () => {
        if (!campaign || !id) return;

        const shouldDelete = await showConfirm(
            t('confirmations.delete.title'),
            t('confirmations.delete.message'),
            {
                confirmText: t('confirmations.delete.confirm'),
                cancelText: t('confirmations.delete.cancel'),
                variant: 'danger'
            }
        );

        if (!shouldDelete) return;

        try {
            setActionLoading(true);
            await paymentCampaignService.deletePaymentCampaign(id);
            showSuccess(t('messages.deleteSuccess'));
            navigate('/portal/admin/payment-campaigns');
        } catch (err) {
            console.error('Error in handleDelete:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete campaign';
            showError(t('messages.errorDelete', { error: errorMessage }));
        } finally {
            setActionLoading(false);
        }
    }, [campaign, id, showConfirm, showSuccess, showError, navigate, t]);

    // Load data on mount
    useEffect(() => {
        if (id) {
            loadCampaignData();
        }
    }, [id]);

    // Refresh activation requirements when feeLevels change
    useEffect(() => {
        if (id && feeLevels.length >= 0) {
            checkActivationRequirements(id, feeLevels);
        }
    }, [id, feeLevels]);

    return {
        // State
        campaign,
        feeLevels,
        loading,
        error,
        actionLoading,
        activationError,
        canActivate,
        showEditModal,
        currentTab,

        // Actions
        setShowEditModal,
        handleTabChange,
        handleEditCampaign,
        handleCloseEditModal,
        handleCampaignUpdated,
        handleStatusChange,
        handleDelete,
        setFeeLevels,
        setError,
        checkActivationRequirements: () => checkActivationRequirements(),
        loadCampaignData,
        setActivationError,

        // Helpers
        getStatusColor,
        getStatusText,

        // Toast & Dialog
        toasts,
        confirmDialog,
        hideToast,
        showConfirm
    };
};

export default usePaymentCampaignDetail;
