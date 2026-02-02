// Component Props Types for CTXH Feature
// Type definitions for reusable component props

import { ReactNode } from 'react';
import {
    CtxhActivity,
    CtxhCategory,
    CtxhLimitConfig,
    ParticipationResponse
} from './ctxh.types';
import { ActivityPermissions, CategoryPermissions, ActivityStatistics } from './hooks.types';

// =============================================================================
// Page Header Components
// =============================================================================

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export interface ActivityManagementHeaderProps extends PageHeaderProps {
    canCreate: boolean;
    checkingPermissions: boolean;
    onCreateClick: () => void;
    createButtonLabel: string;
}

export interface CategoryManagementHeaderProps extends PageHeaderProps {
    canCreate: boolean;
    onCreateClick: () => void;
    createButtonLabel: string;
}

export interface LimitConfigManagementHeaderProps extends PageHeaderProps {
    onCreateClick: () => void;
    createButtonLabel: string;
}

// =============================================================================
// Activity Detail Components
// =============================================================================

export interface ActivityDetailHeaderProps {
    activity: CtxhActivity;
    onBack: () => void;
    onEdit: () => void;
    canUpdate: boolean;
    getStatusBadge: (status: string) => { label: string; color: string };
}

export interface ActivitySummaryProps {
    activity: CtxhActivity;
    getCategoryName: (categoryId: string | number | null | undefined) => string;
    formatDate: (dateString: string | Date | null) => string;
    formatNumber: (num: number) => string;
}

export interface ActivityTabNavigationProps {
    activeTab: 'overview' | 'participants';
    onTabChange: (tab: 'overview' | 'participants') => void;
    canViewParticipants: boolean;
}

export interface ActivityOverviewTabProps {
    statistics: ActivityStatistics;
    participantsLoading: boolean;
    participantsCount: number;
}

// =============================================================================
// Statistics Components
// =============================================================================

export interface StatCardProps {
    value: number | string;
    label: string;
    colorClass: string;
}

export interface StatisticsGridProps {
    statistics: ActivityStatistics;
    isLoading?: boolean;
}

export interface CompletionRateProps {
    completed: number;
    total: number;
    registered: number;
}

// =============================================================================
// List Components
// =============================================================================

export interface ActivityListProps {
    onCreateClick: () => void;
    onEditClick: (activity: CtxhActivity) => void;
    onDeleteClick: (activity: CtxhActivity) => void;
    onViewClick: (activity: CtxhActivity) => void;
    showToast: (type: 'success' | 'error' | 'info', message: string) => void;
    permissions?: ActivityPermissions;
}

export interface CategoryListProps {
    onCreateClick: () => void;
    onEditClick: (category: CtxhCategory) => void;
    onDeleteClick: (category: CtxhCategory) => void;
    onViewDetailClick: (category: CtxhCategory) => void;
    showToast: (type: 'success' | 'error' | 'info', message: string) => void;
    permissions?: CategoryPermissions;
}

export interface LimitConfigListProps {
    onCreateClick: () => void;
    onEditClick: (config: CtxhLimitConfig) => void;
    onDeleteClick: (config: CtxhLimitConfig) => void;
    onRestoreClick: (config: CtxhLimitConfig) => void;
    showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

// =============================================================================
// Form Components
// =============================================================================

export interface ActivityFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    activity?: CtxhActivity;
    title: string;
}

export interface CategoryFormProps {
    isOpen: boolean;
    category?: CtxhCategory;
    onSave: (data: any) => Promise<void>;
    onClose: () => void;
    loading?: boolean;
}

export interface LimitConfigFormProps {
    isOpen: boolean;
    config?: CtxhLimitConfig;
    onSave: (data: any) => Promise<void>;
    onClose: () => void;
    loading?: boolean;
}

// =============================================================================
// Modal Components
// =============================================================================

export interface CategoryDetailModalProps {
    isOpen: boolean;
    category?: CtxhCategory;
    onClose: () => void;
}

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'info' | 'warning';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
    loading?: boolean;
}

// =============================================================================
// Participant Components
// =============================================================================

export interface ParticipantManagementProps {
    activity: CtxhActivity;
    participants: ParticipationResponse[];
    onRefresh?: () => void;
}

// =============================================================================
// Loading & Empty States
// =============================================================================

export interface LoadingStateProps {
    message?: string;
}

export interface FullPageLoadingProps {
    message?: string;
}

export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    message?: string;
    action?: ReactNode;
}

export interface ActivityNotFoundProps {
    onBack: () => void;
}

// =============================================================================
// Toast Components  
// =============================================================================

export interface ToastContainerProps {
    toasts: Array<{ id: string; type: string; message: string; duration?: number }>;
    onHide: (id: string) => void;
}
