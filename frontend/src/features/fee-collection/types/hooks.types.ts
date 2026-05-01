// Hook Types for Fee Collection Feature
// Type definitions for custom hooks return values and props

import { PaymentCampaign, PaymentFeeLevel, Organization } from './index';

// =============================================================================
// Payment Campaigns Page Hook Types
// =============================================================================

export interface UsePaymentCampaignsPageReturn {
    // State
    showCreateModal: boolean;
    showEditModal: boolean;
    editingCampaign: PaymentCampaign | null;
    accessibleOrganizations: Organization[];
    pageLoading: boolean;
    orgsError: Error | null;

    // Actions
    handleCreateCampaign: () => void;
    handleEditCampaign: (campaign: PaymentCampaign) => void;
    handleCloseModals: () => void;
    handleCampaignSaved: () => void;

    // Toast
    toasts: Array<{ id: string; type: string; message: string; duration?: number }>;
    showSuccess: (message: string) => void;
    hideToast: (id: string) => void;
}

// =============================================================================
// Payment Campaign Detail Page Hook Types
// =============================================================================

export type CampaignStatusAction = 'activate' | 'complete' | 'cancel';
export type DetailTab = 'statistics' | 'fee-levels' | 'member-assignments' | 'payment-history' | 'payos-config';

export interface UsePaymentCampaignDetailReturn {
    // State
    campaign: PaymentCampaign | null;
    feeLevels: PaymentFeeLevel[];
    loading: boolean;
    error: string | null;
    actionLoading: boolean;
    activationError: string | null;
    canActivate: boolean;
    showEditModal: boolean;
    currentTab: DetailTab;

    // Actions
    setShowEditModal: (show: boolean) => void;
    handleTabChange: (tabId: string) => void;
    handleEditCampaign: () => void;
    handleCloseEditModal: () => void;
    handleCampaignUpdated: () => void;
    handleStatusChange: (action: CampaignStatusAction) => Promise<void>;
    handleDelete: () => Promise<void>;
    setFeeLevels: (feeLevels: PaymentFeeLevel[]) => void;
    setError: (error: string | null) => void;
    checkActivationRequirements: () => Promise<void>;
    loadCampaignData: () => Promise<void>;
    setActivationError: (error: string | null) => void;

    // Helpers
    getStatusColor: (status: PaymentCampaign['status']) => string;
    getStatusText: (status: PaymentCampaign['status']) => string;

    // Toast & Dialog
    toasts: Array<{ id: string; type: string; message: string; duration?: number }>;
    confirmDialog: any;
    hideToast: (id: string) => void;
    showConfirm: (title: string, message: string, options?: any) => Promise<boolean>;
}

// =============================================================================
// My Campaigns Page Hook Types
// =============================================================================

export interface MyCampaignsFilters {
    status: string;
    search: string;
    sortBy: 'dueDate' | 'assignedAt' | 'amount';
    sortOrder: 'asc' | 'desc';
    page: number;
    limit: number;
}

export interface MyCampaignsSummaryStats {
    total: number;
    pending: number;
    overdue: number;
    paid: number;
    totalAmount: number;
}

export interface UseMyCampaignsPageReturn {
    // State
    filters: MyCampaignsFilters;
    loading: boolean;
    error: string | null;
    permissionsLoading: boolean;

    // Data
    paginatedAssignments: any[];
    summaryStats: MyCampaignsSummaryStats;
    totalFiltered: number;
    totalPages: number;

    // Permissions
    isSuperAdmin: boolean;
    userRoles: any[];
    canAccessMyPaymentsInOrg: (orgId: string) => boolean;

    // Actions
    setFilters: React.Dispatch<React.SetStateAction<MyCampaignsFilters>>;
    handlePayNow: (assignmentId: string) => Promise<void>;
    refetch: () => void;
    getOrganizationName: (organizationId?: string) => string;

    // Helpers
    formatAmount: (amount: number) => string;

    // Toast
    toasts: Array<{ id: string; type: string; message: string; duration?: number }>;
    hideToast: (id: string) => void;
}

// =============================================================================
// Payment Result Page Hook Types  
// =============================================================================

export interface UsePaymentResultPageReturn {
    // State
    loading: boolean;
    paymentStatus: 'success' | 'failed' | 'cancelled' | 'pending' | null;
    paymentInfo: any;
    error: string | null;

    // Actions
    handleBackToPayments: () => void;
    handleRetryPayment: () => void;
}
