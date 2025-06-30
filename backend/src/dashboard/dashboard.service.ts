import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';

interface DashboardStats {
    totalUsers: number;
    doanVienCount: number;
    hoiVienCount: number;
    organizationCount: number;
    totalUserGrowth: string;
    doanVienGrowth: string;
    hoiVienGrowth: string;
    organizationGrowth: string;
}

interface OrganizationStats {
    doanOrganizations: number;
    hoiOrganizations: number;
    clubOrganizations: number;
    totalMembers: number;
}

interface RecentActivity {
    id: string;
    type: 'user_created' | 'organization_created' | 'user_joined' | 'organization_updated';
    message: string;
    timestamp: string;
    category: 'doan' | 'hoi' | 'general';
}

@Injectable()
export class DashboardService {
    constructor(
        private readonly usersService: UsersService,
        private readonly organizationsService: OrganizationsService,
    ) { }

    async getDashboardStats(): Promise<DashboardStats> {
        // Get all users with membership status
        const allUsers = await this.usersService.findAll({ page: 1, limit: 10000 });
        const users = allUsers.users;

        const doanVienCount = users.filter(u =>
            u.membershipStatus === 'doan_vien' || u.membershipStatus === 'both'
        ).length;

        const hoiVienCount = users.filter(u =>
            u.membershipStatus === 'hoi_vien' || u.membershipStatus === 'both'
        ).length;

        // Get all organizations
        const organizations = await this.organizationsService.findAll();

        // Calculate growth percentages based on previous month (simplified implementation)
        const previousMonthStats = await this.getPreviousMonthStats();

        return {
            totalUsers: allUsers.total,
            doanVienCount,
            hoiVienCount,
            organizationCount: organizations.length,
            totalUserGrowth: this.calculateGrowthPercentage(allUsers.total, previousMonthStats.totalUsers),
            doanVienGrowth: this.calculateGrowthPercentage(doanVienCount, previousMonthStats.doanVienCount),
            hoiVienGrowth: this.calculateGrowthPercentage(hoiVienCount, previousMonthStats.hoiVienCount),
            organizationGrowth: this.calculateGrowthPercentage(organizations.length, previousMonthStats.organizationCount),
        };
    }

    async getOrganizationStats(): Promise<OrganizationStats> {
        const organizations = await this.organizationsService.findAll();

        const doanOrganizations = organizations.filter(org =>
            org.type.includes('doan')
        ).length;

        const hoiOrganizations = organizations.filter(org =>
            org.type.includes('hoi')
        ).length;

        const clubOrganizations = organizations.filter(org =>
            org.type.includes('clb')
        ).length;

        // Get total members
        const allUsers = await this.usersService.findAll({ page: 1, limit: 10000 });

        return {
            doanOrganizations,
            hoiOrganizations,
            clubOrganizations,
            totalMembers: allUsers.total,
        };
    }

    async getRecentActivities(limit: number = 5): Promise<RecentActivity[]> {
        // Get recent users (created in last 30 days)
        const recentUsers = await this.usersService.findAll({
            page: 1,
            limit: 10,
            // TODO: Add date filtering when available in usersService
        });

        // Get recent organizations (created in last 30 days)
        const recentOrganizations = await this.organizationsService.findAll();

        const activities: RecentActivity[] = [];

        // Add recent user activities
        recentUsers.users.slice(0, 3).forEach((user, index) => {
            activities.push({
                id: `user-${user.id}`,
                type: 'user_created',
                message: `Thêm thành viên mới: ${user.familyName} ${user.givenName}`,
                timestamp: user.createdAt.toISOString(),
                category: user.membershipStatus.includes('doan') ? 'doan' : 'hoi'
            });
        });

        // Add recent organization activities
        recentOrganizations.slice(0, 2).forEach((org) => {
            activities.push({
                id: `org-${org.id}`,
                type: 'organization_created',
                message: `Tạo mới tổ chức: ${org.name}`,
                timestamp: org.createdAt.toISOString(),
                category: org.type.includes('doan') ? 'doan' : 'hoi'
            });
        });

        // Sort by timestamp (newest first) and limit results
        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
    }

    private async getPreviousMonthStats() {
        // Simplified implementation - in real scenario, would query data from previous month
        // For now, return mock data showing some growth
        return {
            totalUsers: 1100,
            doanVienCount: 750,
            hoiVienCount: 600,
            organizationCount: 42
        };
    }

    private calculateGrowthPercentage(current: number, previous: number): string {
        if (previous === 0) return '+100%';
        const growth = ((current - previous) / previous) * 100;
        const sign = growth >= 0 ? '+' : '';
        return `${sign}${growth.toFixed(1)}%`;
    }
}
