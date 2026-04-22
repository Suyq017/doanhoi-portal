/**
 * SystemConfig Types - Định nghĩa tất cả types cho system-config feature
 */

// ========================
// PERMISSION TYPES
// ========================

export interface SystemConfigPermissions {
    canAccess: boolean;
    canEdit: boolean;
    canViewS3Config: boolean;
    canEditS3Config: boolean;
}

// ========================
// COMPONENT PROPS TYPES
// ========================

export interface SystemConfigHeaderProps {
    isRefreshing: boolean;
    onRefresh: () => void;
}

export interface LoadingStateProps {
    message?: string;
}

export interface AccessDeniedStateProps {
    onGoBack?: () => void;
}

// ========================
// HOOK RETURN TYPES
// ========================

export interface UseSystemConfigPageReturn {
    // Permission state
    isCheckingPermission: boolean;
    hasAccess: boolean;

    // Refresh state
    isRefreshing: boolean;

    // Actions
    handleRefresh: () => Promise<void>;
}

export interface UseSystemConfigPermissionsReturn {
    canAccess: boolean;
    canEdit: boolean;
    canViewS3Config: boolean;
    canEditS3Config: boolean;
}
