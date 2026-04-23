/**
 * Dashboard Types - Định nghĩa tất cả types cho dashboard feature
 */

// ========================
// API RESPONSE TYPES
// ========================

export interface DashboardStats {
  totalUsers: number;
  doanVienCount: number;
  hoiVienCount: number;
  organizationCount: number;
  totalUserGrowth: string;
  doanVienGrowth: string;
  hoiVienGrowth: string;
  organizationGrowth: string;
}

export interface OrganizationStats {
  doanOrganizations: number;
  hoiOrganizations: number;
  clubOrganizations: number;
  totalMembers: number;
}

// ========================
// S3 STATISTICS TYPES
// ========================

export interface S3FolderStat {
  size: number;
  count: number;
  percentage: number;
}

export interface S3FolderStats {
  avatars: S3FolderStat;
  documents: S3FolderStat;
  images: S3FolderStat;
  others: S3FolderStat;
}

export interface S3MonthlyStat {
  month: string;
  size: number;
  count: number;
}

export interface S3Statistics {
  bucketName: string;
  totalSize: number;
  totalObjects: number;
  folderStats: S3FolderStats;
  monthlyStats: S3MonthlyStat[];
  error?: boolean;
  message?: string;
}

// ========================
// COMPONENT PROPS TYPES
// ========================

export interface StatCardProps {
  name: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface S3StorageChartProps {
  organizationId?: string;
}

export interface S3TrendChartProps {
  organizationId?: string;
}

// ========================
// HOOK RETURN TYPES
// ========================

export interface UseDashboardStatsReturn {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseDashboardPermissionReturn {
  hasAccess: boolean;
  isChecking: boolean;
}

export interface StatsCardData {
  name: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}
