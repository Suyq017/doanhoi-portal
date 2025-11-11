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

export interface RecentActivity {
    id: string;
    type: 'user_created' | 'organization_created' | 'user_joined' | 'organization_updated';
    message: string;
    timestamp: string;
    category: 'doan' | 'hoi' | 'general';
}

export interface FolderStat {
    count: number;
    size: number;
    sizeFormatted: string;
    percentage: string;
}

export interface MonthlyS3Stat {
    month: string;
    count: number;
    size: number;
    sizeFormatted: string;
}

export interface S3Statistics {
    bucketName: string;
    region: string;
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
    folderStats: {
        avatars: FolderStat;
        documents: FolderStat;
        images: FolderStat;
        others: FolderStat;
    };
    monthlyStats: MonthlyS3Stat[];
}