import { PaymentCampaignPayosConfigService } from "../payment-campaign-payos-config.service";
import * as payosConfigModule from "../../config/payos.config";

jest.mock("../../config/payos.config", () => ({
  validatePayOSConfig: jest.fn(),
}));

describe("PaymentCampaignPayosConfigService", () => {
  const createRepositoryMock = () => ({
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    delete: jest.fn(),
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
  });

  it("should create a valid PayOS config", async () => {
    paymentCampaignRepository.findOne.mockResolvedValue({ id: "campaign-1" });
    organizationRepository.findOne.mockResolvedValue({ id: "org-1" });
    userRepository.findOne.mockResolvedValue({ id: "user-1" });
    payosConfigRepository.findOne.mockResolvedValue(null);
    (payosConfigModule.validatePayOSConfig as jest.Mock).mockReturnValue(true);
    payosConfigRepository.save.mockImplementation(async (value) => ({ ...value, id: "cfg-1" }));

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
  });

  it("should verify PayOS credentials", async () => {
    await expect(service.verifyCredentials("client-id", "api-key", "checksum-key")).resolves.toBe(true);
  });
});