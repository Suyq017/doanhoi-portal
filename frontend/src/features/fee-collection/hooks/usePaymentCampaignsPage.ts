// Custom Hook for PaymentCampaignsPage
// Handles modal state, organization mapping, and campaign actions

import { useState, useMemo } from 'react';
import { useAccessibleOrganizations } from '@/shared/hooks/queries';
import { useToast } from '@/shared/hooks/useToast';
import { PaymentCampaign, Organization, UsePaymentCampaignsPageReturn } from '../types';

export const usePaymentCampaignsPage = (): UsePaymentCampaignsPageReturn => {
    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<PaymentCampaign | null>(null);

    // Toast hook
    const { toasts, showSuccess, hideToast } = useToast();

    // Fetch accessible organizations using TanStack Query
    const {
        data: rawAccessibleOrganizations = [],
        isLoading: pageLoading,
        error: orgsError
    } = useAccessibleOrganizations();

    // Map from service Organization type to fee-collection Organization type
    const accessibleOrganizations: Organization[] = useMemo(() => {
        return (rawAccessibleOrganizations || []).map(org => ({
            id: org.id,
            name: org.name,
            code: org.code || '',
            type: org.type || '',
            parentId: org.parentId,
            level: 1,
            path: org.name,
            isActive: true,
            createdAt: org.createdAt || new Date().toISOString(),
            updatedAt: org.updatedAt || new Date().toISOString()
        }));
    }, [rawAccessibleOrganizations]);

    // Action handlers
    const handleCreateCampaign = () => {
        setShowCreateModal(true);
    };

    const handleEditCampaign = (campaign: PaymentCampaign) => {
        setEditingCampaign(campaign);
        setShowEditModal(true);
    };

    const handleCloseModals = () => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setEditingCampaign(null);
    };

    const handleCampaignSaved = () => {
        // Cache will be automatically invalidated by mutations
        handleCloseModals();
    };

    return {
        // State
        showCreateModal,
        showEditModal,
        editingCampaign,
        accessibleOrganizations,
        pageLoading,
        orgsError: orgsError as Error | null,

        // Actions
        handleCreateCampaign,
        handleEditCampaign,
        handleCloseModals,
        handleCampaignSaved,

        // Toast
        toasts,
        showSuccess,
        hideToast
    };
};

export default usePaymentCampaignsPage;
