import { apiClient } from '../../../shared/services/apiClient';

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

export class DashboardService {
    private baseUrl = '/dashboard';

    async getStats(): Promise<DashboardStats> {
        return apiClient.get<DashboardStats>(`${this.baseUrl}/stats`);
    }

    async getOrganizationStats(): Promise<OrganizationStats> {
        return apiClient.get<OrganizationStats>(`${this.baseUrl}/organization-stats`);
    }
}

export const dashboardService = new DashboardService();
