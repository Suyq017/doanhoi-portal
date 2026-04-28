import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PaymentFeeLevelService } from "../payment-fee-level.service";

describe("PaymentFeeLevelService", () => {
  const createFeeLevelRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    find: jest.fn() as any,
    remove: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  const createCampaignRepositoryMock = () => ({
    findOne: jest.fn() as any,
  });

  let feeLevelRepository: ReturnType<typeof createFeeLevelRepositoryMock>;
  let campaignRepository: ReturnType<typeof createCampaignRepositoryMock>;
  let service: PaymentFeeLevelService;

  beforeEach(() => {
    feeLevelRepository = createFeeLevelRepositoryMock();
    campaignRepository = createCampaignRepositoryMock();
    service = new PaymentFeeLevelService(feeLevelRepository as never, campaignRepository as never);
  });

  it("should create a fee level and convert empty description to null", async () => {
    campaignRepository.findOne.mockResolvedValue({ id: "camp-1" });

    const result = await service.create({
      campaignId: "camp-1",
      name: "Level 1",
      amount: 100000,
      description: "",
    } as any);

    expect(result.description).toBeNull();
  });

  it("should reject missing campaign when creating fee level", async () => {
    campaignRepository.findOne.mockResolvedValue(null);

    await expect(service.create({ campaignId: "missing" } as any)).rejects.toThrow(
      "Payment campaign not found",
    );
  });

  it("should update fee level and normalize undefined description", async () => {
    feeLevelRepository.findOne.mockResolvedValue({ id: "fee-1", description: "old" });

    const result = await service.update("fee-1", { name: "Updated" } as any);

    expect(result.description).toBeNull();
    expect(feeLevelRepository.save).toHaveBeenCalled();
  });

  it("should block removing fee levels used in assignments", async () => {
    feeLevelRepository.findOne.mockResolvedValue({ id: "fee-1" });
    feeLevelRepository.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => 1),
    });

    await expect(service.remove("fee-1")).rejects.toThrow(
      "Cannot delete fee level that is used in assignments",
    );
  });

  it("should find all fee levels for a campaign", async () => {
    feeLevelRepository.find.mockResolvedValue([
      { id: "fee-1", campaignId: "camp-1", name: "Level 1", amount: 100000 },
      { id: "fee-2", campaignId: "camp-1", name: "Level 2", amount: 500000 },
    ]);

    const result = await service.findByCampaign("camp-1");

    expect(result).toHaveLength(2);
    expect(feeLevelRepository.find).toHaveBeenCalledWith({
      where: { campaignId: "camp-1" },
      relations: ["campaign"],
    });
  });

  it("should find fee level by id with relations", async () => {
    feeLevelRepository.findOne.mockResolvedValue({
      id: "fee-1",
      campaignId: "camp-1",
      name: "Level 1",
      campaign: { id: "camp-1" },
    });

    const result = await service.findOne("fee-1");

    expect(result.id).toBe("fee-1");
    expect(feeLevelRepository.findOne).toHaveBeenCalledWith({
      where: { id: "fee-1" },
      relations: ["campaign"],
    });
  });

  it("should throw NotFoundException when fee level not found", async () => {
    feeLevelRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toThrow("Fee level not found");
  });

  it("should remove fee level when no assignments reference it", async () => {
    feeLevelRepository.findOne.mockResolvedValue({ id: "fee-1" });
    feeLevelRepository.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => 0),
    });

    await service.remove("fee-1");

    expect(feeLevelRepository.remove).toHaveBeenCalled();
  });
});