import { describe, expect, it, beforeEach, jest } from '@jest/globals';

import { DashboardController } from '../dashboard.controller';

describe('DashboardController', () => {
  let usersService: any;
  let organizationsService: any;
  let dashboardService: any;
  let controller: DashboardController;

  beforeEach(() => {
    usersService = {
      findAll: jest.fn() as any,
    } as any;
    organizationsService = {
      findAll: jest.fn() as any,
    } as any;
    dashboardService = {
      getS3Statistics: jest.fn() as any,
    } as any;

    controller = new DashboardController(
      usersService as any,
      organizationsService as any,
      dashboardService as any,
    );
  });

  it('should calculate dashboard stats from users and organizations', async () => {
    usersService.findAll.mockResolvedValue({
      users: [
        { membershipStatus: 'doan_vien' },
        { membershipStatus: 'hoi_vien' },
        { membershipStatus: 'both' },
        { membershipStatus: 'none' },
      ],
      total: 4,
    });
    organizationsService.findAll.mockResolvedValue([
      { id: 'org-1' },
      { id: 'org-2' },
    ]);

    await expect(controller.getDashboardStats()).resolves.toEqual({
      totalUsers: 4,
      doanVienCount: 2,
      hoiVienCount: 2,
      organizationCount: 2,
      totalUserGrowth: '+12%',
      doanVienGrowth: '+8%',
      hoiVienGrowth: '+15%',
      organizationGrowth: '+3%',
    });
  });

  it('should calculate organization stats and total members', async () => {
    organizationsService.findAll.mockResolvedValue([
      { type: 'doan' },
      { type: 'hoi' },
      { type: 'clb' },
      { type: 'doan-hoi' },
    ]);
    usersService.findAll.mockResolvedValue({
      users: [],
      total: 9,
    });

    await expect(controller.getOrganizationStats()).resolves.toEqual({
      doanOrganizations: 2,
      hoiOrganizations: 2,
      clubOrganizations: 1,
      totalMembers: 9,
    });
  });

  it('should return s3 stats or fallback message', async () => {
    dashboardService.getS3Statistics.mockResolvedValue({
      enabled: true,
      bucket: 'ctxh-portal',
    });

    await expect(controller.getS3Statistics()).resolves.toEqual({
      enabled: true,
      bucket: 'ctxh-portal',
    });

    dashboardService.getS3Statistics.mockResolvedValue(null);

    await expect(controller.getS3Statistics()).resolves.toEqual({
      error: true,
      message: 'Chưa cấu hình S3 hoặc không thể kết nối',
      data: null,
    });
  });
});
