// Hook Types for CTXH Feature
// Type definitions for custom hooks return values and props

import {
    CtxhActivity,
    CtxhCategory,
    CtxhLimitConfig,
    CreateCategoryRequest,
    UpdateCategoryRequest,
    CreateLimitConfigRequest,
    UpdateLimitConfigRequest,
    ParticipationResponse
} from './ctxh.types';

// =============================================================================
// Activity Management Hook Types
// =============================================================================

export interface ActivityPermissions {
    create: boolean;
    update: boolean;
    delete: boolean;
}

export interface UseActivityManagementReturn {
    // State
    showActivityForm: boolean;
    editingActivity: CtxhActivity | null;
    checkingPermissions: boolean;
    canCreateActivity: boolean;

    // Actions
    handleCreateActivity: () => void;
    handleEditActivity: (activity: CtxhActivity) => void;
    handleDeleteActivity: (activity: CtxhActivity) => Promise<void>;
    handleViewActivity: (activity: CtxhActivity) => void;
    handleActivitySubmit: (data: any) => Promise<void>;
    handleCloseForm: () => void;
    handleShowToast: (type: 'success' | 'error' | 'info', message: string) => void;

    // Permissions
    permissions: ActivityPermissions;

    // Toast
    toasts: Array<{ id: string; type: string; message: string; duration?: number }>;
    hideToast: (id: string) => void;
    confirmDialog: any;
}

// =============================================================================
// Category Management Hook Types
// =============================================================================

export interface CategoryPermissions {
    create: boolean;
    update: boolean;
    delete: boolean;
}

export type ConfirmActionType = 'delete' | 'restore' | null;

export interface UseCategoryManagementReturn {
    // State
    selectedCategory: CtxhCategory | undefined;
    isFormOpen: boolean;
    isConfirmDialogOpen: boolean;
    isDetailModalOpen: boolean;
    confirmAction: ConfirmActionType;

    // Loading states
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isRestoring: boolean;

    // Actions
    handleCreateClick: () => void;
    handleEditClick: (category: CtxhCategory) => void;
    handleDeleteClick: (category: CtxhCategory) => void;
    handleViewDetailClick: (category: CtxhCategory) => void;
    handleFormClose: () => void;
    handleFormSave: (data: CreateCategoryRequest | UpdateCategoryRequest) => Promise<void>;
    handleConfirmAction: () => Promise<void>;
    handleCancelAction: () => void;
    handleShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
    handleDetailModalClose: () => void;

    // Dialog content
    dialogContent: {
        title: string;
        message: string;
        variant: 'danger' | 'info' | 'warning';
    };

    // Permissions
    permissions: CategoryPermissions;

    // Toast
    toasts: Array<{ id: string; type: string; message: string; duration?: number }>;
    hideToast: (id: string) => void;
}

// =============================================================================
// Limit Config Management Hook Types
// =============================================================================

export interface UseLimitConfigManagementReturn {
    // State
    selectedConfig: CtxhLimitConfig | undefined;
    isFormOpen: boolean;
    isConfirmDialogOpen: boolean;
    confirmAction: ConfirmActionType;

    // Loading states
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isRestoring: boolean;

    // Actions
    handleCreateClick: () => void;
    handleEditClick: (config: CtxhLimitConfig) => void;
    handleDeleteClick: (config: CtxhLimitConfig) => void;
    handleRestoreClick: (config: CtxhLimitConfig) => void;
    handleFormClose: () => void;
    handleFormSave: (data: CreateLimitConfigRequest | UpdateLimitConfigRequest) => Promise<void>;
    handleConfirmAction: () => Promise<void>;
    handleCancelAction: () => void;
    handleShowToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;

    // Dialog content
    dialogContent: {
        title: string;
        message: string;
        variant: 'danger' | 'info' | 'warning';
    };

    // Toast
    toasts: Array<{ id: string; type: string; message: string; duration?: number }>;
    hideToast: (id: string) => void;
}

// =============================================================================
// Activity Detail Hook Types
// =============================================================================

export type ActivityDetailTab = 'overview' | 'participants';

export interface ActivityStatistics {
    total: number;
    completed: number;
    registered: number;
    cancelled: number;
}

export interface UseActivityDetailReturn {
    // State
    activity: CtxhActivity | null;
    participants: ParticipationResponse[];
    loading: boolean;
    participantsLoading: boolean;
    activeTab: ActivityDetailTab;
    showEditForm: boolean;

    // Computed
    statistics: ActivityStatistics;

    // Actions
    setActiveTab: (tab: ActivityDetailTab) => void;
    setShowEditForm: (show: boolean) => void;
    handleBack: () => void;
    handleActivityUpdate: (data: any) => Promise<void>;
    loadParticipants: () => Promise<void>;

    // Helpers
    getCategoryName: (categoryId: string | number | null | undefined) => string;
    formatDate: (dateString: string | Date | null) => string;
    formatNumber: (num: number) => string;
    getStatusBadge: (status: string) => { label: string; color: string };

    // Permissions
    canUpdate: boolean;
    canViewParticipants: boolean;

    // Toast
    toasts: Array<{ id: string; type: string; message: string; duration?: number }>;
    hideToast: (id: string) => void;
}

// =============================================================================
// Old System Import Hook Types
// =============================================================================

export interface UseOldSystemImportReturn {
    isImportModalOpen: boolean;
    modalKey: number;

    openImportModal: () => void;
    closeImportModal: () => void;
    handleImportSuccess: (result: any) => void;
    handleImportError: (error: Error) => void;
}
