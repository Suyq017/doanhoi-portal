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

  describe("getDashboardStats", () => {
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

    it("should count only doan_vien membership correctly", async () => {
      usersService.findAll.mockResolvedValue({
        total: 3,
        users: [
          { membershipStatus: "doan_vien" },
          { membershipStatus: "doan_vien" },
          { membershipStatus: "hoi_vien" },
        ],
      });
      organizationsService.findAll.mockResolvedValue([]);

      const stats = await service.getDashboardStats();
      expect(stats.doanVienCount).toBe(2);
      expect(stats.hoiVienCount).toBe(1);
    });

    it("should handle both membership status correctly", async () => {
      usersService.findAll.mockResolvedValue({
        total: 2,
        users: [
          { membershipStatus: "both" },
          { membershipStatus: "both" },
        ],
      });
      organizationsService.findAll.mockResolvedValue([]);

      const stats = await service.getDashboardStats();
      expect(stats.doanVienCount).toBe(2);
      expect(stats.hoiVienCount).toBe(2);
    });

    it("should handle zero members correctly", async () => {
      usersService.findAll.mockResolvedValue({
        total: 1,
        users: [{ membershipStatus: "none" }],
      });
      organizationsService.findAll.mockResolvedValue([]);

      const stats = await service.getDashboardStats();
      expect(stats.doanVienCount).toBe(0);
      expect(stats.hoiVienCount).toBe(0);
    });

    it("should calculate growth percentages", async () => {
      usersService.findAll.mockResolvedValue({
        total: 1200,
        users: [
          { membershipStatus: "doan_vien" },
          { membershipStatus: "doan_vien" },
          { membershipStatus: "hoi_vien" },
        ],
      });
      organizationsService.findAll.mockResolvedValue([{ id: "org-1" }]);

      const stats = await service.getDashboardStats();

      // Should contain growth strings like "+9.1%" based on comparison with previous month
      expect(stats.totalUserGrowth).toMatch(/[+-]\d+(\.\d+)?%/);
      expect(stats.organizationGrowth).toMatch(/[+-]\d+(\.\d+)?%/);
    });
  });

  describe("getOrganizationStats", () => {
    it("should compute organization stats by type", async () => {
      organizationsService.findAll.mockResolvedValue([
        { id: "org-1", type: "doan" },
        { id: "org-2", type: "hoi" },
        { id: "org-3", type: "clb" },
        { id: "org-4", type: "doan_clb" },
      ]);
      usersService.findAll.mockResolvedValue({ total: 50, users: [] });

      const stats = await service.getOrganizationStats();

      expect(stats.doanOrganizations).toBe(2); // doan and doan_clb
      expect(stats.hoiOrganizations).toBe(1); // hoi
      expect(stats.clubOrganizations).toBe(2); // clb and doan_clb
      expect(stats.totalMembers).toBe(50);
    });

    it("should handle empty organizations", async () => {
      organizationsService.findAll.mockResolvedValue([]);
      usersService.findAll.mockResolvedValue({ total: 0, users: [] });

      const stats = await service.getOrganizationStats();

      expect(stats.doanOrganizations).toBe(0);
      expect(stats.hoiOrganizations).toBe(0);
      expect(stats.clubOrganizations).toBe(0);
      expect(stats.totalMembers).toBe(0);
    });

    it("should handle organizations with multiple type keywords", async () => {
      organizationsService.findAll.mockResolvedValue([
        { id: "org-1", type: "doan_hoi_clb" },
      ]);
      usersService.findAll.mockResolvedValue({ total: 100, users: [] });

      const stats = await service.getOrganizationStats();

      expect(stats.doanOrganizations).toBe(1);
      expect(stats.hoiOrganizations).toBe(1);
      expect(stats.clubOrganizations).toBe(1);
    });
  });

  describe("getRecentActivities", () => {
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

    it("should limit activities to requested count", async () => {
      usersService.findAll.mockResolvedValue({
        total: 3,
        users: [
          {
            id: "u-1",
            familyName: "A",
            givenName: "B",
            membershipStatus: "doan_vien",
            createdAt: new Date("2024-02-01T00:00:00Z"),
          },
          {
            id: "u-2",
            familyName: "C",
            givenName: "D",
            membershipStatus: "hoi_vien",
            createdAt: new Date("2024-02-02T00:00:00Z"),
          },
          {
            id: "u-3",
            familyName: "E",
            givenName: "F",
            membershipStatus: "both",
            createdAt: new Date("2024-02-03T00:00:00Z"),
          },
        ],
      });
      organizationsService.findAll.mockResolvedValue([
        {
          id: "org-1",
          name: "Org A",
          type: "doan",
          createdAt: new Date("2024-02-04T00:00:00Z"),
        },
        {
          id: "org-2",
          name: "Org B",
          type: "hoi",
          createdAt: new Date("2024-02-05T00:00:00Z"),
        },
      ]);

      const activities = await service.getRecentActivities(2);

      expect(activities).toHaveLength(2);
      expect(activities[0].id).toBe("org-org-2");
      expect(activities[1].id).toBe("org-org-1");
    });

    it("should categorize activities by doan/hoi type", async () => {
      usersService.findAll.mockResolvedValue({
        total: 2,
        users: [
          {
            id: "u-1",
            familyName: "Nguyen",
            givenName: "An",
            membershipStatus: "doan_vien",
            createdAt: new Date("2024-02-01T00:00:00Z"),
          },
          {
            id: "u-2",
            familyName: "Tran",
            givenName: "Binh",
            membershipStatus: "hoi_vien",
            createdAt: new Date("2024-02-02T00:00:00Z"),
          },
        ],
      });
      organizationsService.findAll.mockResolvedValue([
        {
          id: "org-1",
          name: "Org A",
          type: "clb",
          createdAt: new Date("2024-02-03T00:00:00Z"),
        },
      ]);

      const activities = await service.getRecentActivities(10);

      expect(activities.find(a => a.id === "user-u-1")?.category).toBe("doan");
      expect(activities.find(a => a.id === "user-u-2")?.category).toBe("hoi");
      expect(activities.find(a => a.id === "org-org-1")?.category).toBe("hoi");
    });

    it("should handle empty activities", async () => {
      usersService.findAll.mockResolvedValue({ total: 0, users: [] });
      organizationsService.findAll.mockResolvedValue([]);

      const activities = await service.getRecentActivities(5);

      expect(activities).toHaveLength(0);
    });
  });

  describe("getS3Statistics", () => {
    it("should return null when no active S3 config found", async () => {
      awsConfigService.getActiveConfig.mockResolvedValue(null);

      const stats = await service.getS3Statistics();

      expect(stats).toBeNull();
    });

    it("should handle error and return null on exception", async () => {
      awsConfigService.getActiveConfig.mockRejectedValue(new Error("Config error"));

      const stats = await service.getS3Statistics();

      expect(stats).toBeNull();
    });
  });
});