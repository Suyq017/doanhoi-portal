import { apiClient } from './apiClient';
import {
  DashboardStats,
  OrganizationStats,
  RecentActivity
} from '../types/dashboard';

class DashboardService {
  async getDashboardStats(): Promise<DashboardStats> {
    // Fetch actual stats from multiple endpoints
    const [usersResponse, organizationsResponse] = await Promise.all([
      apiClient.get<{ users: any[], total: number }>('/users?limit=1'),
      apiClient.get<any[]>('/organizations')
    ]);

    // Count different types of users
    const allUsersResponse = await apiClient.get<{ users: any[], total: number }>('/users?limit=10000');
    const users = allUsersResponse.users;

    const doanVienCount = users.filter(u => u.membershipStatus === 'doan_vien' || u.membershipStatus === 'both').length;
    const hoiVienCount = users.filter(u => u.membershipStatus === 'hoi_vien' || u.membershipStatus === 'both').length;

    return {
      totalUsers: usersResponse.total,
      doanVienCount,
      hoiVienCount,
      organizationCount: organizationsResponse.length,
      totalUserGrowth: '+12%', // Mock growth percentages for now
      doanVienGrowth: '+8%',
      hoiVienGrowth: '+15%',
      organizationGrowth: '+3%',
    };
  }
  async getOrganizationStats(): Promise<OrganizationStats> {
    const organizations = await apiClient.get<any[]>('/organizations');

    const doanOrganizations = organizations.filter(org =>
      org.type.includes('doan')
    ).length;

    const hoiOrganizations = organizations.filter(org =>
      org.type.includes('hoi')
    ).length;

    const clubOrganizations = organizations.filter(org =>
      org.type.includes('clb')
    ).length;

    // Get total members from all user-organization relationships
    const allUsersResponse = await apiClient.get<{ users: any[], total: number }>('/users?limit=10000');

    return {
      doanOrganizations,
      hoiOrganizations,
      clubOrganizations,
      totalMembers: allUsersResponse.total,
    };
  }

  async getRecentActivities(): Promise<RecentActivity[]> {
    // Mock recent activities for now - could be implemented with actual activity logs
    return [
      {
        id: '1',
        type: 'user_created',
        message: 'Thêm 15 thành viên mới vào Chi đoàn Khoa CNTT',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        category: 'doan'
      },
      {
        id: '2',
        type: 'organization_updated',
        message: 'Cập nhật thông tin CLB Tin học',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        category: 'general'
      },
      {
        id: '3',
        type: 'organization_created',
        message: 'Tạo mới Liên chi hội Khoa Cơ khí',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        category: 'hoi'
      }
    ];
  }
}

export const dashboardService = new DashboardService();
