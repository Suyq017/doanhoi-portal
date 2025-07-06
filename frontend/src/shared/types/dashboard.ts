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