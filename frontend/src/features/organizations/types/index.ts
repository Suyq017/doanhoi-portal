/**
 * Organization feature types - Re-export và định nghĩa các types riêng của feature
 */

// Re-export from shared types
export type {
  Organization,
  OrganizationType,
  OrganizationStats,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '../../../shared/types/organization';

// Re-export import types
export * from './organization-import.types';

// ========================
// PAGE CONFIGURATION TYPES
// ========================

export interface OrganizationPageConfig {
  level: number;
  shouldShowMemberStats: boolean;
  isDetailPage: boolean;
  isSubDetailPage: boolean;
  type?: string;
  code?: string;
}

export interface OrganizationPageParams {
  type?: string;
  code?: string;
  parentType?: string;
  parentCode?: string;
}

// ========================
// COMPONENT PROPS TYPES
// ========================

export interface OrganizationTreeItemProps {
  level?: number;
  parentId?: string;
  parent?: {
    type?: string;
    code?: string;
  };
}

export interface OrganizationPageLayoutConfig {
  showDropdownButton?: boolean;
  showMemberStats?: boolean;
  hideManuaAddOption?: boolean;
  dropdownLabel?: string;
}

// ========================
// HOOK RETURN TYPES
// ========================

export interface UseOrganizationPageReturn {
  organizations: Organization[];
  stats: OrganizationStats | undefined;
  loading: boolean;
  error: string | null;
  toggleOrgExpanded: (id: string) => void;
  fetchData: () => Promise<void>;
  handleMemberAdded: () => Promise<void>;
  handleMemberDelete: () => Promise<void>;
  handleMemberAddError: (error: string) => void;
  handleOrganizationUpdated: (updatedOrg?: Organization) => Promise<void>;
  handleOrganizationDeleted: () => Promise<void>;
  handleDeleteError: (error: string) => void;
  handleBulkDeleteSuccess: (message: string) => void;
  handleBulkDeleteError: (error: string) => void;
  handleOrganizationCreated: (message?: string) => Promise<void>;
  handleOrganizationCreateError: (error: string) => void;
  toasts: Array<{
    id: string;
    type: string;
    message: string;
    duration?: number;
  }>;
  hideToast: (id: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  getPageTitle: (customName?: string) => string;
}

// Import Organization type for use in this file
import { Organization, OrganizationStats } from '../../../shared/types/organization';

export interface MemberStatsData {
  doanVienCount: number;
  hoiVienCount: number;
  bothMemberCount: number;
  nonMemberCount: number;
  totalMembers: number;
  loading?: boolean;
}

// ========================
// PERMISSION TYPES
// ========================

export interface OrganizationPagePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAddMember: boolean;
  canRemoveMember: boolean;
  canViewMembers: boolean;
  canExport: boolean;
  canImport: boolean;
  isSuperAdmin: boolean;
}
