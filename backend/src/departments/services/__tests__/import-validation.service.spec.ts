import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ImportValidationService as DepartmentsImportValidationService } from "../import-validation.service";

describe("Departments ImportValidationService", () => {
  const createRepositoryMock = (): any => ({
    findOne: jest.fn(),
  });

  let departmentsRepository: ReturnType<typeof createRepositoryMock>;
  let service: DepartmentsImportValidationService;

  beforeEach(() => {
    departmentsRepository = createRepositoryMock();
    service = new DepartmentsImportValidationService(
      departmentsRepository as never,
    );
  });

  it("should detect duplicate names and codes inside import data", () => {
    const duplicates = service.checkDuplicates([
      { name: "Finance", code: "FIN" } as never,
      { name: "finance", code: "HR" } as never,
      { name: "Operations", code: "fin" } as never,
    ]);

    expect(duplicates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "name", rows: [0, 1] }),
        expect.objectContaining({ type: "code", rows: [0, 2] }),
      ]),
    );
  });

  it("should validate department data and report warnings for conflicts", async () => {
    departmentsRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.name === "Existing Department") {
        return { id: "dept-1", name: "Existing Department", code: "EXIST" };
      }

      if (where?.code === "EXIST 1") {
        return { id: "dept-2", name: "Another Department", code: "EXIST 1" };
      }

      return null;
    });

    const result = await service.validateDepartmentData([
      {
        name: "Existing Department",
        code: "EXIST 1",
        description: "x".repeat(501),
      } as never,
    ]);

    expect(result.isValid).toBe(true);
    expect(result.summary.total).toBe(1);
    expect(result.summary.conflicts).toBe(2);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: "description", severity: "warning" }),
        expect.objectContaining({ column: "code", severity: "warning" }),
        expect.objectContaining({ column: "name", severity: "warning" }),
      ]),
    );
  });

  it("should mark missing required department fields as invalid", async () => {
    departmentsRepository.findOne.mockResolvedValue(null as any);

    const result = await service.validateDepartmentData([
      {
        name: "",
        code: "CODE_TOO_LONG_FOR_LIMIT",
      } as never,
    ]);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: "name", severity: "error" }),
        expect.objectContaining({ column: "code", severity: "error" }),
      ]),
    );
    expect(result.summary.invalid).toBe(1);
  });
});