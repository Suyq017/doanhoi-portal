import { ForbiddenException } from "@nestjs/common";
import { PaymentCampaignController } from "../payment-campaign.controller";

describe("PaymentCampaignController", () => {
  const campaignService = {
    create: jest.fn(),
    getAccessibleOrganizations: jest.fn(),
    getAccessibleOrganizationsWithDetails: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activate: jest.fn(),
    complete: jest.fn(),
    cancel: jest.fn(),
    getStatistics: jest.fn(),
    findByOrganization: jest.fn(),
  };
  const rolesService = { hasPermission: jest.fn() };

  let controller: PaymentCampaignController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PaymentCampaignController(campaignService as never, rolesService as never);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("creates campaign after permission check", async () => {
    rolesService.hasPermission.mockResolvedValue(true);
    campaignService.create.mockResolvedValue({ id: "c1" });

    await expect(
      controller.create({ organizationId: "org-1", name: "Campaign" } as any, {
        user: { id: "u1", familyName: "A", givenName: "B", code: "SV001" },
      } as any),
    ).resolves.toEqual({ id: "c1" });
    expect(campaignService.create).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1" }), "u1");
  });

  it("rejects create when user is missing or permission denied", async () => {
    await expect(controller.create({ organizationId: "org-1" } as any, { user: {} } as any)).rejects.toThrow("User not authenticated");

    rolesService.hasPermission.mockResolvedValue(false);
    await expect(
      controller.create({ organizationId: "org-1" } as any, {
        user: { id: "u1", familyName: "A", givenName: "B", code: "SV001" },
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("covers list and organization lookups", async () => {
    campaignService.getAccessibleOrganizations.mockResolvedValue(["org-1"]);
    campaignService.findAll.mockResolvedValue({ campaigns: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    campaignService.getAccessibleOrganizationsWithDetails.mockResolvedValue([{ id: "org-1" }]);

    await expect(
      controller.findAll({ user: { id: "u1" } } as any, "org-2", "DRAFT", "camp", "2026-01-01", "2026-12-31", "2", "5"),
    ).resolves.toEqual({ campaigns: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    await expect(controller.getAccessibleOrganizations({ user: { id: "u1" } } as any)).resolves.toEqual([{ id: "org-1" }]);

    expect(campaignService.findAll).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-2",
      status: "DRAFT",
      search: "camp",
      page: 2,
      limit: 5,
      accessibleOrgIds: ["org-1"],
    }));
  });

  it("passes null accessible org ids when user can access all campaigns", async () => {
    campaignService.getAccessibleOrganizations.mockResolvedValue([]);
    campaignService.findAll.mockResolvedValue({ campaigns: [], page: 1, limit: 20, total: 0, totalPages: 0 });

    await controller.findAll({ user: { id: "u1" } } as any);

    expect(campaignService.findAll).toHaveBeenCalledWith(expect.objectContaining({
      accessibleOrgIds: null,
    }));
  });

  it("covers campaign permission paths and lifecycle endpoints", async () => {
    campaignService.findOne.mockResolvedValue({ id: "camp-1", organizationId: "org-1" });
    rolesService.hasPermission.mockResolvedValue(true);
    campaignService.update.mockResolvedValue({ id: "camp-1", name: "Updated" });
    campaignService.remove.mockResolvedValue(undefined);
    campaignService.activate.mockResolvedValue({ id: "camp-1", status: "ACTIVE" });
    campaignService.complete.mockResolvedValue({ id: "camp-1", status: "COMPLETED" });
    campaignService.cancel.mockResolvedValue({ id: "camp-1", status: "CANCELLED" });
    campaignService.getStatistics.mockResolvedValue({ totalAssignments: 1 });
    campaignService.findByOrganization.mockResolvedValue([{ id: "camp-1" }]);

    await expect(controller.findOne("camp-1", { user: { id: "u1" } } as any)).resolves.toEqual({ id: "camp-1", organizationId: "org-1" });
    await expect(controller.update("camp-1", { name: "Updated" } as any, { user: { id: "u1" } } as any)).resolves.toEqual({ id: "camp-1", name: "Updated" });
    await expect(controller.remove("camp-1", { user: { id: "u1" } } as any)).resolves.toBeUndefined();
    await expect(controller.activate("camp-1")).resolves.toEqual({ id: "camp-1", status: "ACTIVE" });
    await expect(controller.complete("camp-1")).resolves.toEqual({ id: "camp-1", status: "COMPLETED" });
    await expect(controller.cancel("camp-1")).resolves.toEqual({ id: "camp-1", status: "CANCELLED" });
    await expect(controller.getStatistics("camp-1")).resolves.toEqual({ totalAssignments: 1 });
    await expect(controller.findByOrganization("org-1")).resolves.toEqual([{ id: "camp-1" }]);

    expect(campaignService.findOne).toHaveBeenCalledWith("camp-1");
  });

  it("rejects when campaign missing or permission denied", async () => {
    campaignService.findOne.mockResolvedValueOnce(null);
    await expect(controller.findOne("missing", { user: { id: "u1" } } as any)).rejects.toBeInstanceOf(ForbiddenException);

    campaignService.findOne.mockResolvedValue({ id: "camp-2", organizationId: "org-2" });
    rolesService.hasPermission.mockResolvedValue(false);
    await expect(controller.update("camp-2", { name: "X" } as any, { user: { id: "u1" } } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});