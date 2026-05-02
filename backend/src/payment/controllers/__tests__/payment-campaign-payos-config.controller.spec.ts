import { PaymentCampaignPayOSConfigController } from "../payment-campaign-payos-config.controller";

describe("PaymentCampaignPayOSConfigController", () => {
  const payosConfigService = {
    createConfig: jest.fn(),
    getConfig: jest.fn(),
    getEffectiveConfig: jest.fn(),
    updateConfig: jest.fn(),
    deleteConfig: jest.fn(),
    toggleActive: jest.fn(),
    verifyCredentials: jest.fn(),
  };

  let controller: PaymentCampaignPayOSConfigController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PaymentCampaignPayOSConfigController(payosConfigService as never);
  });

  it("covers config lifecycle endpoints", async () => {
    payosConfigService.createConfig.mockResolvedValue({ id: "c1", campaignId: "camp-1", organizationId: "org-1", userId: "u1", clientId: "client", apiKey: "api", checksumKey: "chk", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    payosConfigService.getConfig.mockResolvedValue({ id: "c1", campaignId: "camp-1", organizationId: "org-1", userId: "u1", clientId: "client", apiKey: "api", checksumKey: "chk", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    payosConfigService.getEffectiveConfig.mockResolvedValue({ id: "c2", campaignId: "parent-camp", organizationId: "org-1", userId: "u1", clientId: "client", apiKey: "api", checksumKey: "chk", isActive: true, createdAt: new Date(), updatedAt: new Date() });
    payosConfigService.updateConfig.mockResolvedValue({ id: "c1", campaignId: "camp-1", organizationId: "org-1", userId: "u1", clientId: "client", apiKey: "api", checksumKey: "chk", isActive: false, createdAt: new Date(), updatedAt: new Date() });
    payosConfigService.deleteConfig.mockResolvedValue(undefined);
    payosConfigService.toggleActive.mockResolvedValue({ id: "c1", campaignId: "camp-1", isActive: false, updatedAt: new Date() });
    payosConfigService.verifyCredentials.mockResolvedValue(true);

    const created = await controller.createPayOSConfig("camp-1", { clientId: "client", apiKey: "api", checksumKey: "chk" } as any, { user: { id: "u1" } } as any);
    const got = await controller.getPayOSConfig("camp-1");
    const effective = await controller.getEffectivePayOSConfig("camp-1");
    const updated = await controller.updatePayOSConfig("camp-1", { clientId: "client" } as any);
    const toggled = await controller.toggleActiveStatus("camp-1");
    const deleted = await controller.deletePayOSConfig("camp-1");
    const testConnection = await controller.testConnection("camp-1");

    expect(created.success).toBe(true);
    expect(got.success).toBe(true);
    expect(effective.data.isInherited).toBe(true);
    expect(updated.success).toBe(true);
    expect(toggled.success).toBe(true);
    expect(deleted).toEqual({ success: true, message: "Cấu hình PayOS đã được xóa thành công" });
    expect(testConnection.success).toBe(true);
  });

  it("covers missing config and error branches", async () => {
    payosConfigService.getConfig.mockResolvedValue(null);
    payosConfigService.getEffectiveConfig.mockResolvedValue(null);
    payosConfigService.verifyCredentials.mockRejectedValue(new Error("boom"));

    await expect(controller.getPayOSConfig("camp-2")).resolves.toEqual({ success: false, message: "Không tìm thấy cấu hình PayOS cho đợt thanh toán này", data: null });
    await expect(controller.getEffectivePayOSConfig("camp-2")).resolves.toEqual({ success: false, message: "Không tìm thấy cấu hình PayOS cho đợt thanh toán này hoặc các tổ chức cha", data: null });
    await expect(controller.testConnection("camp-2")).resolves.toEqual({ success: false, message: "Không tìm thấy cấu hình PayOS cho đợt thanh toán này", data: null });

    payosConfigService.getEffectiveConfig.mockResolvedValue({ clientId: "client", apiKey: "api", checksumKey: "chk" });
    payosConfigService.verifyCredentials.mockResolvedValue(false);
    await expect(controller.testConnection("camp-3")).resolves.toEqual(expect.objectContaining({ success: false, message: "Kết nối PayOS thất bại" }));

    payosConfigService.getEffectiveConfig.mockRejectedValue(new Error("broken"));
    await expect(controller.testConnection("camp-4")).resolves.toEqual({ success: false, message: "Lỗi khi kiểm tra kết nối PayOS", error: "broken" });
  });
});