import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CtxhImportService } from "../import.service";

describe("CtxhImportService", () => {
  const createUserRepoMock = () => ({
    find: jest.fn() as any,
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => undefined),
    })) as any,
  });

  let userRepository: any;
  let service: CtxhImportService;

  beforeEach(() => {
    userRepository = createUserRepoMock();
    service = new CtxhImportService(userRepository as never);
  });

  it("should validate records and report missing students", async () => {
    userRepository.find.mockResolvedValue([{ code: "2150001" }]);

    const result = await service.validateOldSystemCtxh([
      { studentCode: "2150001", days: 10 },
      { studentCode: "2150999", days: 20 },
    ] as never);

    expect(result.isValid).toBe(false);
    expect(result.valid).toBe(1);
    expect(result.invalid).toBe(1);
    expect(result.errors[0].message).toContain("2150999");
  });

  it("should include warning when days exceed 365", async () => {
    userRepository.find.mockResolvedValue([{ code: "2150001" }]);

    const result = await service.validateOldSystemCtxh([
      { studentCode: "2150001", days: 400 },
    ] as never);

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBe(1);
  });

  it("should return early when import data is empty", async () => {
    const result = await service.importOldSystemCtxh([] as never);
    expect(result.total).toBe(0);
    expect(result.message).toContain("Không có dữ liệu");
  });

  it("should import with partial success when some students are missing", async () => {
    userRepository.find.mockResolvedValue([{ id: "u1", code: "2150001" }]);

    const result = await service.importOldSystemCtxh([
      { studentCode: "2150001", days: 15 },
      { studentCode: "2150999", days: 25 },
    ] as never);

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain("2150999");
  });
});