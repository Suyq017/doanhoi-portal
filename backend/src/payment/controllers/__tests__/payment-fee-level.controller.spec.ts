import { PaymentFeeLevelController } from "../payment-fee-level.controller";

describe("PaymentFeeLevelController", () => {
  const feeLevelService = {
    create: jest.fn(),
    findByCampaign: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  let controller: PaymentFeeLevelController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PaymentFeeLevelController(feeLevelService as never);
  });

  it("covers fee level CRUD endpoints", async () => {
    feeLevelService.create.mockResolvedValue({ id: "f1" });
    feeLevelService.findByCampaign.mockResolvedValue([{ id: "f1" }]);
    feeLevelService.findOne.mockResolvedValue({ id: "f1" });
    feeLevelService.update.mockResolvedValue({ id: "f1", amount: 1000 });
    feeLevelService.remove.mockResolvedValue(undefined);

    await expect(controller.create({ amount: 1000 } as any)).resolves.toEqual({ id: "f1" });
    await expect(controller.findByCampaign("camp-1")).resolves.toEqual([{ id: "f1" }]);
    await expect(controller.findOne("f1")).resolves.toEqual({ id: "f1" });
    await expect(controller.update("f1", { amount: 1000 } as any)).resolves.toEqual({ id: "f1", amount: 1000 });
    await expect(controller.remove("f1")).resolves.toBeUndefined();
  });
});