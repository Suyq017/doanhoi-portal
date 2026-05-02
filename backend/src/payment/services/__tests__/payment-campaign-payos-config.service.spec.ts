import { PaymentCampaignPayosConfigService } from "../payment-campaign-payos-config.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import * as payosConfigModule from "../../config/payos.config";

jest.mock("../../config/payos.config", () => ({
  validatePayOSConfig: jest.fn(),
}));

jest.mock("@payos/node", () => {
  return jest.fn().mockImplementation((clientId, apiKey, checksumKey) => ({
    clientId,
    apiKey,
    checksumKey,
  }));
});

describe("PaymentCampaignPayosConfigService", () => {
  const createRepositoryMock = () => ({
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    delete: jest.fn(async () => ({ affected: 1 })),
    find: jest.fn(),
  });

  let payosConfigRepository: ReturnType<typeof createRepositoryMock>;
  let paymentCampaignRepository: ReturnType<typeof createRepositoryMock>;
  let organizationRepository: ReturnType<typeof createRepositoryMock>;
  let userRepository: ReturnType<typeof createRepositoryMock>;
  let service: PaymentCampaignPayosConfigService;

  beforeEach(() => {
    payosConfigRepository = createRepositoryMock();
    paymentCampaignRepository = createRepositoryMock();
    organizationRepository = createRepositoryMock();
    userRepository = createRepositoryMock();
    service = new PaymentCampaignPayosConfigService(
      payosConfigRepository as never,
      paymentCampaignRepository as never,
      organizationRepository as never,
      userRepository as never,
    );
    jest.clearAllMocks();
  });

  describe("createConfig", () => {
    it("should create a valid PayOS config successfully", async () => {
      paymentCampaignRepository.findOne.mockResolvedValue({ id: "campaign-1" });
      organizationRepository.findOne.mockResolvedValue({ id: "org-1" });
      userRepository.findOne.mockResolvedValue({ id: "user-1" });
      payosConfigRepository.findOne.mockResolvedValue(null);
      (payosConfigModule.validatePayOSConfig as jest.Mock).mockReturnValue(true);
      payosConfigRepository.save.mockImplementation(async (value) => ({
        ...value,
        id: "cfg-1",
      }));

      const result = await service.createConfig({
        campaignId: "campaign-1",
        organizationId: "org-1",
        userId: "user-1",
        clientId: "client-id",
        apiKey: "api-key",
        checksumKey: "checksum-key",
      });

      expect(result.id).toBe("cfg-1");
      expect(result.isActive).toBe(true);
      expect(payosConfigRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId: "campaign-1",
          clientId: "client-id",
        })
      );
    });

    it("should throw NotFoundException when campaign not found", async () => {
      paymentCampaignRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createConfig({
          campaignId: "nonexistent",
          organizationId: "org-1",
          userId: "user-1",
          clientId: "client-id",
          apiKey: "api-key",
          checksumKey: "checksum-key",
        })
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when organization not found", async () => {
      paymentCampaignRepository.findOne.mockResolvedValue({ id: "campaign-1" });
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createConfig({
          campaignId: "campaign-1",
          organizationId: "nonexistent",
          userId: "user-1",
          clientId: "client-id",
          apiKey: "api-key",
          checksumKey: "checksum-key",
        })
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when user not found", async () => {
      paymentCampaignRepository.findOne.mockResolvedValue({ id: "campaign-1" });
      organizationRepository.findOne.mockResolvedValue({ id: "org-1" });
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createConfig({
          campaignId: "campaign-1",
          organizationId: "org-1",
          userId: "nonexistent",
          clientId: "client-id",
          apiKey: "api-key",
          checksumKey: "checksum-key",
        })
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when config already exists", async () => {
      paymentCampaignRepository.findOne.mockResolvedValue({ id: "campaign-1" });
      organizationRepository.findOne.mockResolvedValue({ id: "org-1" });
      userRepository.findOne.mockResolvedValue({ id: "user-1" });
      payosConfigRepository.findOne.mockResolvedValue({ id: "cfg-existing" });

      await expect(
        service.createConfig({
          campaignId: "campaign-1",
          organizationId: "org-1",
          userId: "user-1",
          clientId: "client-id",
          apiKey: "api-key",
          checksumKey: "checksum-key",
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when PayOS config validation fails", async () => {
      paymentCampaignRepository.findOne.mockResolvedValue({ id: "campaign-1" });
      organizationRepository.findOne.mockResolvedValue({ id: "org-1" });
      userRepository.findOne.mockResolvedValue({ id: "user-1" });
      payosConfigRepository.findOne.mockResolvedValue(null);
      (payosConfigModule.validatePayOSConfig as jest.Mock).mockReturnValue(false);

      await expect(
        service.createConfig({
          campaignId: "campaign-1",
          organizationId: "org-1",
          userId: "user-1",
          clientId: "invalid",
          apiKey: "invalid",
          checksumKey: "invalid",
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException on database error", async () => {
      paymentCampaignRepository.findOne.mockResolvedValue({ id: "campaign-1" });
      organizationRepository.findOne.mockResolvedValue({ id: "org-1" });
      userRepository.findOne.mockResolvedValue({ id: "user-1" });
      payosConfigRepository.findOne.mockResolvedValue(null);
      (payosConfigModule.validatePayOSConfig as jest.Mock).mockReturnValue(true);
      payosConfigRepository.save.mockRejectedValue(new Error("DB error"));

      await expect(
        service.createConfig({
          campaignId: "campaign-1",
          organizationId: "org-1",
          userId: "user-1",
          clientId: "client-id",
          apiKey: "api-key",
          checksumKey: "checksum-key",
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getConfig", () => {
    it("should get PayOS config successfully", async () => {
      const config = {
        id: "cfg-1",
        campaignId: "campaign-1",
        campaign: { id: "campaign-1" },
        organization: { id: "org-1" },
        user: { id: "user-1" },
      };
      payosConfigRepository.findOne.mockResolvedValue(config);

      const result = await service.getConfig("campaign-1");

      expect(result).toEqual(config);
      expect(payosConfigRepository.findOne).toHaveBeenCalledWith({
        where: { campaignId: "campaign-1" },
        relations: ["campaign", "organization", "user"],
      });
    });

    it("should return null when config not found", async () => {
      payosConfigRepository.findOne.mockResolvedValue(null);

      const result = await service.getConfig("nonexistent");

      expect(result).toBeNull();
    });

    it("should handle database error gracefully", async () => {
      payosConfigRepository.findOne.mockRejectedValue(new Error("DB error"));

      const result = await service.getConfig("campaign-1");

      expect(result).toBeNull();
    });
  });

  describe("getEffectiveConfig", () => {
    it("should return campaign-level config when isActive", async () => {
      const campaignConfig = {
        id: "cfg-1",
        campaignId: "campaign-1",
        isActive: true,
        campaign: { id: "campaign-1" },
        organization: { id: "org-1" },
        user: { id: "user-1" },
      };
      payosConfigRepository.findOne.mockResolvedValue(campaignConfig);

      const result = await service.getEffectiveConfig("campaign-1");

      expect(result).toEqual(campaignConfig);
    });

    it("should fallback to level-2 organization config for level-3 org", async () => {
      payosConfigRepository.findOne
        .mockResolvedValueOnce(null) // Campaign config not found
        .mockResolvedValueOnce(null) // findOrgConfig for level 2 (first call returns null)
        .mockResolvedValueOnce({
          id: "cfg-level2",
          organizationId: "org-level2",
          isActive: true,
        }); // findOrgConfig for level 2 (second call)

      paymentCampaignRepository.findOne.mockResolvedValue({
        id: "campaign-1",
        organization: {
          id: "org-level3",
          parent: {
            id: "org-level2",
            parent: { id: "org-level1" },
          },
        },
      });

      const result = await service.getEffectiveConfig("campaign-1");

      expect(result.id).toBe("cfg-level2");
    });

    it("should fallback to level-1 organization config for level-3 org when level-2 not found", async () => {
      payosConfigRepository.findOne
        .mockResolvedValueOnce(null) // Campaign config not found
        .mockResolvedValueOnce(null) // Level 2 org config not found
        .mockResolvedValueOnce({
          id: "cfg-level1",
          organizationId: "org-level1",
          isActive: true,
        }); // Level 1 org config found

      paymentCampaignRepository.findOne.mockResolvedValue({
        id: "campaign-1",
        organization: {
          id: "org-level3",
          parent: {
            id: "org-level2",
            parent: { id: "org-level1" },
          },
        },
      });

      const result = await service.getEffectiveConfig("campaign-1");

      expect(result.id).toBe("cfg-level1");
    });

    it("should fallback to level-1 org config for level-2 org", async () => {
      payosConfigRepository.findOne
        .mockResolvedValueOnce(null) // Campaign config not found
        .mockResolvedValueOnce({
          id: "cfg-level1",
          organizationId: "org-level1",
          isActive: true,
        }); // Level 1 org config found

      paymentCampaignRepository.findOne.mockResolvedValue({
        id: "campaign-1",
        organization: {
          id: "org-level2",
          parent: { id: "org-level1" },
        },
      });

      const result = await service.getEffectiveConfig("campaign-1");

      expect(result.id).toBe("cfg-level1");
    });

    it("should throw NotFoundException for level-1 org when no config found", async () => {
      payosConfigRepository.findOne.mockResolvedValue(null);

      paymentCampaignRepository.findOne.mockResolvedValue({
        id: "campaign-1",
        organization: {
          id: "org-level1",
        },
      });

      await expect(service.getEffectiveConfig("campaign-1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw NotFoundException when campaign not found", async () => {
      payosConfigRepository.findOne.mockResolvedValue(null);
      paymentCampaignRepository.findOne.mockResolvedValue(null);

      await expect(service.getEffectiveConfig("nonexistent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw NotFoundException when no config found in hierarchy", async () => {
      payosConfigRepository.findOne.mockResolvedValue(null);

      paymentCampaignRepository.findOne.mockResolvedValue({
        id: "campaign-1",
        organization: {
          id: "org-level3",
          parent: {
            id: "org-level2",
            parent: { id: "org-level1" },
          },
        },
      });

      await expect(service.getEffectiveConfig("campaign-1")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("updateConfig", () => {
    it("should update PayOS config successfully", async () => {
      const existingConfig = {
        id: "cfg-1",
        campaignId: "campaign-1",
        clientId: "old-client",
        apiKey: "old-key",
        checksumKey: "old-checksum",
        isActive: true,
      };
      payosConfigRepository.findOne.mockResolvedValue(existingConfig);
      (payosConfigModule.validatePayOSConfig as jest.Mock).mockReturnValue(true);
      payosConfigRepository.save.mockResolvedValue({
        ...existingConfig,
        clientId: "new-client",
      });

      const result = await service.updateConfig("campaign-1", {
        clientId: "new-client",
      });

      expect(result.clientId).toBe("new-client");
      expect(payosConfigRepository.save).toHaveBeenCalled();
    });

    it("should toggle isActive status", async () => {
      const existingConfig = {
        id: "cfg-1",
        campaignId: "campaign-1",
        clientId: "client",
        apiKey: "key",
        checksumKey: "checksum",
        isActive: true,
      };
      payosConfigRepository.findOne.mockResolvedValue(existingConfig);
      payosConfigRepository.save.mockResolvedValue({
        ...existingConfig,
        isActive: false,
      });

      const result = await service.updateConfig("campaign-1", {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });

    it("should throw NotFoundException when config not found", async () => {
      payosConfigRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateConfig("nonexistent", { clientId: "new-client" })
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when validation fails", async () => {
      const existingConfig = {
        id: "cfg-1",
        campaignId: "campaign-1",
        clientId: "client",
        apiKey: "key",
        checksumKey: "checksum",
        isActive: true,
      };
      payosConfigRepository.findOne.mockResolvedValue(existingConfig);
      (payosConfigModule.validatePayOSConfig as jest.Mock).mockReturnValue(false);

      await expect(
        service.updateConfig("campaign-1", { clientId: "invalid" })
      ).rejects.toThrow(BadRequestException);
    });

    it("should clear cache after update", async () => {
      const existingConfig = {
        id: "cfg-1",
        campaignId: "campaign-1",
        clientId: "client",
        apiKey: "key",
        checksumKey: "checksum",
        isActive: true,
      };
      payosConfigRepository.findOne.mockResolvedValue(existingConfig);
      (payosConfigModule.validatePayOSConfig as jest.Mock).mockReturnValue(true);
      payosConfigRepository.save.mockResolvedValue(existingConfig);

      const deleteSpy = jest.spyOn(service["payosInstanceCache"], "delete");

      await service.updateConfig("campaign-1", { apiKey: "new-key" });

      expect(deleteSpy).toHaveBeenCalledWith("campaign-1");
    });
  });

  describe("toggleActive", () => {
    it("should toggle isActive from true to false", async () => {
      const config = {
        id: "cfg-1",
        campaignId: "campaign-1",
        isActive: true,
      };
      payosConfigRepository.findOne.mockResolvedValue(config);
      payosConfigRepository.save.mockResolvedValue({
        ...config,
        isActive: false,
      });

      const result = await service.toggleActive("campaign-1");

      expect(result.isActive).toBe(false);
    });

    it("should toggle isActive from false to true", async () => {
      const config = {
        id: "cfg-1",
        campaignId: "campaign-1",
        isActive: false,
      };
      payosConfigRepository.findOne.mockResolvedValue(config);
      payosConfigRepository.save.mockResolvedValue({
        ...config,
        isActive: true,
      });

      const result = await service.toggleActive("campaign-1");

      expect(result.isActive).toBe(true);
    });

    it("should throw NotFoundException when config not found", async () => {
      payosConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.toggleActive("nonexistent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should clear cache after toggle", async () => {
      const config = {
        id: "cfg-1",
        campaignId: "campaign-1",
        isActive: true,
      };
      payosConfigRepository.findOne.mockResolvedValue(config);
      payosConfigRepository.save.mockResolvedValue({
        ...config,
        isActive: false,
      });

      const deleteSpy = jest.spyOn(service["payosInstanceCache"], "delete");

      await service.toggleActive("campaign-1");

      expect(deleteSpy).toHaveBeenCalledWith("campaign-1");
    });
  });

  describe("createPayOSInstance", () => {
    it("should create PayOS instance with effective config", async () => {
      const config = {
        id: "cfg-1",
        campaignId: "campaign-1",
        clientId: "test-client",
        apiKey: "test-api",
        checksumKey: "test-checksum",
        isActive: true,
      };
      payosConfigRepository.findOne.mockResolvedValue(config);

      const instance = await service.createPayOSInstance("campaign-1");

      expect(instance).toBeDefined();
      expect((instance as any).clientId).toBe("test-client");
      expect((instance as any).apiKey).toBe("test-api");
      expect((instance as any).checksumKey).toBe("test-checksum");
    });
  });

  describe("createOrUpdateConfig", () => {
    it("should create new config when not exists", async () => {
      payosConfigRepository.findOne.mockResolvedValue(null);
      payosConfigRepository.save.mockResolvedValue({
        campaignId: "campaign-1",
        organizationId: "org-1",
        userId: "user-1",
        clientId: "client-id",
        apiKey: "api-key",
        checksumKey: "checksum-key",
        isActive: true,
      });

      const result = await service.createOrUpdateConfig("campaign-1", {
        organizationId: "org-1",
        userId: "user-1",
        clientId: "client-id",
        apiKey: "api-key",
        checksumKey: "checksum-key",
      });

      expect(result.campaignId).toBe("campaign-1");
      expect(result.isActive).toBe(true);
    });

    it("should update existing config", async () => {
      const existingConfig = {
        campaignId: "campaign-1",
        organizationId: "org-1",
        userId: "user-1",
        clientId: "old-client",
        apiKey: "old-key",
        checksumKey: "old-checksum",
        isActive: true,
      };
      payosConfigRepository.findOne.mockResolvedValue(existingConfig);
      payosConfigRepository.save.mockResolvedValue({
        ...existingConfig,
        clientId: "new-client",
        apiKey: "new-key",
        checksumKey: "new-checksum",
      });

      const result = await service.createOrUpdateConfig("campaign-1", {
        organizationId: "org-1",
        userId: "user-1",
        clientId: "new-client",
        apiKey: "new-key",
        checksumKey: "new-checksum",
      });

      expect(result.clientId).toBe("new-client");
      expect(payosConfigRepository.save).toHaveBeenCalled();
    });
  });

  describe("deleteConfig", () => {
    it("should delete config successfully", async () => {
      payosConfigRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteConfig("campaign-1");

      expect(payosConfigRepository.delete).toHaveBeenCalledWith({
        campaignId: "campaign-1",
      });
    });

    it("should throw NotFoundException when config not found", async () => {
      payosConfigRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteConfig("nonexistent")).rejects.toThrow(
        NotFoundException
      );
    });
  });
});