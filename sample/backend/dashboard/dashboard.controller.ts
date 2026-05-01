import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { DashboardService, StorageStats, TrendDataPoint, TimeRange } from './dashboard.service';

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
  @ApiResponse({ status: 200, description: 'Thống kê dashboard' }) async getDashboardStats(): Promise<DashboardStats> {
    // Get all users
    const allUsers = await this.usersService.findAll({ page: 1, limit: 10000 });
    const users = allUsers.users;

    // Get all organizations
    const organizations = await this.organizationsService.findAll();

    return {
      totalUsers: allUsers.total,
      doanVienCount: 0, // Simplified - không còn membership status
      hoiVienCount: 0, // Simplified - không còn membership status
      organizationCount: organizations.length,
      totalUserGrowth: '+12%', // Mock growth percentages for now
      doanVienGrowth: '+8%',
      hoiVienGrowth: '+15%',
      organizationGrowth: '+3%',
    };
  }
  @Get('storage-stats')
  @ApiOperation({ summary: 'Lấy thống kê dung lượng S3' })
  @ApiResponse({ status: 200, description: 'Thống kê dung lượng S3' })
  async getStorageStats(): Promise<StorageStats> {
    return this.dashboardService.getStorageStats();
  }

  @Get('storage-trend')
  @ApiOperation({ summary: 'Lấy xu hướng sử dụng dung lượng S3' })
  @ApiResponse({ status: 200, description: 'Dữ liệu xu hướng dung lượng S3', type: [Object] })
  @ApiQuery({ name: 'range', enum: ['week', 'month', 'year'], description: 'Khoảng thời gian' })
  async getStorageTrend(@Query('range') range: TimeRange = 'week'): Promise<TrendDataPoint[]> {
    return this.dashboardService.getStorageTrend(range);
  }

  @Get('bandwidth-trend')
  @ApiOperation({ summary: 'Lấy xu hướng sử dụng băng thông S3' })
  @ApiResponse({ status: 200, description: 'Dữ liệu xu hướng băng thông S3', type: [Object] })
  @ApiQuery({ name: 'range', enum: ['week', 'month', 'year'], description: 'Khoảng thời gian' })
  async getBandwidthTrend(@Query('range') range: TimeRange = 'week'): Promise<TrendDataPoint[]> {
    return this.dashboardService.getBandwidthTrend(range);
  }

  @Get('combined-trend')
  @ApiOperation({ summary: 'Lấy xu hướng kết hợp dung lượng và băng thông S3' })
  @ApiResponse({ status: 200, description: 'Dữ liệu xu hướng kết hợp S3', type: [Object] })
  @ApiQuery({ name: 'range', enum: ['week', 'month', 'year'], description: 'Khoảng thời gian' })
  async getCombinedTrend(@Query('range') range: TimeRange = 'week'): Promise<TrendDataPoint[]> {
    return this.dashboardService.getCombinedTrend(range);
  }


}
