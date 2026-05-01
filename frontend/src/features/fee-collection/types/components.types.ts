// Component Props Types for Fee Collection Feature
// Type definitions for reusable component props

import { ReactNode } from 'react';
import { PaymentCampaign, Organization } from './index';
import { MyCampaignsSummaryStats, MyCampaignsFilters, DetailTab } from './hooks.types';

// =============================================================================
// Page Header Components
// =============================================================================

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export interface CampaignsPageHeaderProps extends PageHeaderProps {
    canCreate: boolean;
    onCreateClick: () => void;
    createButtonLabel: string;
}

export interface CampaignDetailHeaderProps {
    campaign: PaymentCampaign;
    onBack: () => void;
    onEdit: () => void;
    canActivate: boolean;
    actionLoading: boolean;
    getStatusColor: (status: PaymentCampaign['status']) => string;
    getStatusText: (status: PaymentCampaign['status']) => string;
    onStatusChange: (action: 'activate' | 'complete' | 'cancel') => void;
    onDelete: () => void;
}

// =============================================================================
// Campaign Info Components
// =============================================================================

export interface CampaignInfoCardProps {
    campaign: PaymentCampaign;
}

export interface ActivationErrorProps {
    error: string | null;
    onDismiss: () => void;
}

export interface ActivationRequirementsProps {
    feeLevelsCount: number;
    assignmentCount: number;
    labels: {
        needsTitle: string;
        needsFeeLevels: string;
        needsMembers: string;
    };
}

// =============================================================================
// Stats Components
// =============================================================================

export interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    iconBgClass: string;
    iconColorClass?: string;
    valueColorClass?: string;
}

export interface SummaryStatsGridProps {
    stats: MyCampaignsSummaryStats;
    formatAmount: (amount: number) => string;
}

// =============================================================================
// Filter Components
// =============================================================================

export interface CampaignFiltersProps {
    filters: MyCampaignsFilters;
    onFiltersChange: (filters: Partial<MyCampaignsFilters>) => void;
    statusOptions: Array<{ value: string; label: string }>;
    sortByOptions: Array<{ value: string; label: string }>;
    sortOrderOptions: Array<{ value: string; label: string }>;
}

// =============================================================================
// Table Components
// =============================================================================

export interface AssignmentTableProps {
    assignments: any[];
    onPayNow: (assignmentId: string) => void;
    formatAmount: (amount: number) => string;
}

export interface AssignmentRowProps {
    assignment: any;
    onPayNow: (assignmentId: string) => void;
    formatAmount: (amount: number) => string;
}

// =============================================================================
// Modal Components
// =============================================================================

export interface CampaignFormModalProps {
    isOpen: boolean;
    campaign?: PaymentCampaign;
    mode: 'create' | 'edit';
    onSave: () => void;
    onCancel: () => void;
    organizations?: Organization[];
}

// =============================================================================
// Permission Components
// =============================================================================

export interface PermissionInfoProps {
    isSuperAdmin: boolean;
    userRoles: any[];
    canAccessMyPaymentsInOrg: (orgId: string) => boolean;
    getOrganizationName: (organizationId?: string) => string;
}

// =============================================================================
// Loading & Empty States
// =============================================================================

export interface LoadingStateProps {
    title?: string;
    subtitle?: string;
    message?: string;
}

export interface ErrorStateProps {
    title?: string;
    subtitle?: string;
    error: string;
    onRetry?: () => void;
    backLink?: string;
    backLabel?: string;
}

export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    message?: string;
    action?: ReactNode;
}

export interface CampaignEmptyStateProps {
    hasFilters: boolean;
    isSuperAdmin: boolean;
    userRoles: any[];
    canAccessMyPaymentsInOrg: (orgId: string) => boolean;
    getOrganizationName: (organizationId?: string) => string;
}

// =============================================================================
// Toast Components
// =============================================================================

export interface ToastContainerProps {
    toasts: Array<{ id: string; type: string; message: string; duration?: number }>;
    onHide: (id: string) => void;
}

// =============================================================================
// Tab Components
// =============================================================================

export interface TabNavigationProps {
    activeTab: DetailTab;
    onTabChange: (tabId: string) => void;
}

// =============================================================================
// Status Components
// =============================================================================

export interface StatusBadgeProps {
    status: PaymentCampaign['status'];
    getStatusColor: (status: PaymentCampaign['status']) => string;
    getStatusText: (status: PaymentCampaign['status']) => string;
}

export interface PaymentStatusButtonProps {
    status: 'PENDING' | 'PAID' | 'OVERDUE';
    campaignStatus: PaymentCampaign['status'];
    assignmentId: string;
    onPayNow: (assignmentId: string) => void;
}
