import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { DashboardService } from './dashboard.service';

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

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly dashboardService: DashboardService,
  ) { }

  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê tổng quan' })
  @ApiResponse({ status: 200, description: 'Thống kê dashboard' })
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

    return {
      totalUsers: allUsers.total,
      doanVienCount,
      hoiVienCount,
      organizationCount: organizations.length,
      totalUserGrowth: '+12%', // Mock growth percentages for now
      doanVienGrowth: '+8%',
      hoiVienGrowth: '+15%',
      organizationGrowth: '+3%',
    };
  }

  @Get('organization-stats')
  @ApiOperation({ summary: 'Lấy thống kê tổ chức' })
  @ApiResponse({ status: 200, description: 'Thống kê tổ chức' })
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

  @Get('s3-stats')
  @ApiOperation({ summary: 'Lấy thống kê S3 storage' })
  @ApiResponse({ status: 200, description: 'Thống kê S3 storage' })
  async getS3Statistics(): Promise<any> {
    const stats = await this.dashboardService.getS3Statistics();

    if (!stats) {
      return {
        error: true,
        message: 'Chưa cấu hình S3 hoặc không thể kết nối',
        data: null
      };
    }

    return stats;
  }
}
