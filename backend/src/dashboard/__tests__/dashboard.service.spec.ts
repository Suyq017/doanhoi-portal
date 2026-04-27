import { describe, expect, it, jest } from "@jest/globals";
import { DashboardService } from "../dashboard.service";

describe("DashboardService", () => {
  const createUsersServiceMock = () => ({
    findAll: jest.fn() as any,
  });

  const createOrganizationsServiceMock = () => ({
    findAll: jest.fn() as any,
  });

  const createAwsConfigServiceMock = () => ({
    getActiveConfig: jest.fn(),
  });

  let usersService: ReturnType<typeof createUsersServiceMock>;
  let organizationsService: ReturnType<typeof createOrganizationsServiceMock>;
  let awsConfigService: ReturnType<typeof createAwsConfigServiceMock>;
  let service: DashboardService;

  beforeEach(() => {
    usersService = createUsersServiceMock();
    organizationsService = createOrganizationsServiceMock();
    awsConfigService = createAwsConfigServiceMock();
    service = new DashboardService(usersService as never, organizationsService as never, awsConfigService as never);
  });

  it("should compute dashboard stats from users and organizations", async () => {
    usersService.findAll.mockResolvedValue({
      total: 4,
      users: [
        { membershipStatus: "doan_vien" },
        { membershipStatus: "hoi_vien" },
        { membershipStatus: "both" },
        { membershipStatus: "none" },
      ],
    });
    organizationsService.findAll.mockResolvedValue([{ id: "org-1" }, { id: "org-2" }]);

    const stats = await service.getDashboardStats();

    expect(stats.totalUsers).toBe(4);
    expect(stats.doanVienCount).toBe(2);
    expect(stats.hoiVienCount).toBe(2);
    expect(stats.organizationCount).toBe(2);
  });

  it("should compute recent activities in sorted order", async () => {
    usersService.findAll.mockResolvedValue({
      total: 2,
      users: [
        {
          id: "u-1",
          familyName: "Nguyen",
          givenName: "An",
          membershipStatus: "doan_vien",
          createdAt: new Date("2024-02-02T00:00:00Z"),
        },
      ],
    });
    organizationsService.findAll.mockResolvedValue([
      {
        id: "org-1",
        name: "CLB A",
        type: "clb",
        createdAt: new Date("2024-02-03T00:00:00Z"),
      },
    ]);

    const activities = await service.getRecentActivities(5);

    expect(activities[0].type).toBe("organization_created");
    expect(activities[1].type).toBe("user_created");
  });
});