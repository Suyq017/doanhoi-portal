// Shared UI Components for Fee Collection Feature
// Reusable components for loading, error, and empty states

import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Toast } from '@/shared/components';

// =============================================================================
// Page Header Component
// =============================================================================

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    permissionInfo?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    action,
    permissionInfo
}) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        {subtitle}
                    </p>
                )}
                {permissionInfo}
            </div>
            {action && (
                <div className="mt-4 sm:mt-0">
                    {action}
                </div>
            )}
        </div>
    );
};

// =============================================================================
// Loading State Component
// =============================================================================

interface LoadingStateProps {
    title?: string;
    subtitle?: string;
    message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    title,
    subtitle,
    message
}) => {
    return (
        <div className="">
            {(title || subtitle) && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        {title && (
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {title}
                            </h1>
                        )}
                        {subtitle && (
                            <p className="mt-2 text-gray-600 dark:text-gray-400">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
            )}
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
                    {message && (
                        <p className="mt-4 text-gray-600 dark:text-gray-400">
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// Error State Component
// =============================================================================

interface ErrorStateProps {
    title?: string;
    subtitle?: string;
    error: string;
    onRetry?: () => void;
    backLink?: string;
    backLabel?: string;
    retryLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    title,
    subtitle,
    error,
    onRetry,
    backLink,
    backLabel = 'Go back',
    retryLabel = 'Try again'
}) => {
    return (
        <div className="space-y-6">
            {(title || subtitle) && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        {title && (
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {title}
                            </h1>
                        )}
                        {subtitle && (
                            <p className="mt-2 text-gray-600 dark:text-gray-400">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
            )}
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="mb-4 text-xl text-red-500">⚠️</div>
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <div className="flex items-center justify-center gap-4 mt-4">
                        {backLink && (
                            <Link
                                to={backLink}
                                className="inline-flex items-center px-4 py-2 text-white rounded-lg bg-doan-600 hover:bg-doan-700"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                {backLabel}
                            </Link>
                        )}
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="px-4 py-2 text-white rounded-lg bg-doan-600 hover:bg-doan-700"
                            >
                                {retryLabel}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// Empty State Component
// =============================================================================

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    message?: string;
    action?: ReactNode;
    additionalInfo?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    message,
    action,
    additionalInfo
}) => {
    return (
        <div className="py-12 text-center">
            {icon || <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />}
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                {title}
            </h3>
            {message && (
                <div className="text-gray-500 dark:text-gray-400">
                    {message}
                </div>
            )}
            {additionalInfo}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
};

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    iconBgClass: string;
    valueColorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    iconBgClass,
    valueColorClass = 'text-gray-900 dark:text-white'
}) => {
    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
                    <p className={`text-3xl font-bold ${valueColorClass}`}>{value}</p>
                </div>
                <div className={`p-3 rounded-full ${iconBgClass}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// Toast Container Component
// =============================================================================

interface ToastContainerProps {
    toasts: Array<{ id: string; type: string; message: string; duration?: number }>;
    onHide: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
    toasts,
    onHide
}) => {
    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    type={toast.type as any}
                    message={toast.message}
                    duration={toast.duration}
                    onClose={() => onHide(toast.id)}
                />
            ))}
        </div>
    );
};

// =============================================================================
// Modal Wrapper Component
// =============================================================================

interface ModalWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: string;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({
    isOpen,
    onClose,
    children,
    maxWidth = 'max-w-4xl'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 bg-black bg-opacity-50"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                    &#8203;
                </span>

                <div className={`inline-block w-full ${maxWidth} p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white border border-gray-300 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// Permission Info Components
// =============================================================================

interface PermissionInfoBadgeProps {
    isSuperAdmin: boolean;
    userRoles: any[];
    canAccessMyPaymentsInOrg: (orgId: string) => boolean;
    getOrganizationName: (organizationId?: string) => string;
    accessRightsLabel: string;
    organizationAccessLabel: string;
    superAdminLabel: string;
    superAdminDescription: string;
}

export const PermissionInfoBadge: React.FC<PermissionInfoBadgeProps> = ({
    isSuperAdmin,
    userRoles,
    canAccessMyPaymentsInOrg,
    getOrganizationName,
    accessRightsLabel,
    organizationAccessLabel,
    superAdminLabel,
    superAdminDescription
}) => {
    if (isSuperAdmin) {
        return (
            <div className="p-3 mt-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900 dark:text-green-200">
                            {superAdminLabel}
                        </p>
                        <div className="mt-1 text-xs text-green-800 dark:text-green-300">
                            {superAdminDescription}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!userRoles || userRoles.length === 0) return null;

    return (
        <div className="p-3 mt-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                    <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        {accessRightsLabel}
                    </p>
                    <div className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                        {organizationAccessLabel}{' '}
                        <span className="font-semibold">
                            {userRoles
                                .filter(userRole => userRole.organizationId && canAccessMyPaymentsInOrg(userRole.organizationId))
                                .map(userRole => getOrganizationName(userRole.organizationId))
                                .join(', ')
                            }
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
