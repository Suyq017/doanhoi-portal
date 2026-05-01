import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ImportValidationService as ClassesImportValidationService } from "../import-validation.service";

describe("Classes ImportValidationService", () => {
  const createRepositoryMock = (): any => ({
    find: jest.fn(),
    findOne: jest.fn(),
  });

  let classesRepository: ReturnType<typeof createRepositoryMock>;
  let departmentsRepository: ReturnType<typeof createRepositoryMock>;
  let service: ClassesImportValidationService;

  beforeEach(() => {
    classesRepository = createRepositoryMock();
    departmentsRepository = createRepositoryMock();
    service = new ClassesImportValidationService(
      classesRepository as never,
      departmentsRepository as never,
    );
  });

  it("should validate class rows with required fields, year range, duplicate names and missing department", async () => {
    departmentsRepository.find.mockResolvedValue([{ id: "dept-1", code: "CS" }] as any);
    classesRepository.findOne.mockResolvedValue(null);

    const result = await service.validateClassData([
      {
        name: "",
        year: 1999,
        departmentCode: "UNKNOWN",
      } as never,
      {
        name: "KTPM01",
        year: 2024,
        departmentCode: "CS",
      } as never,
      {
        name: "ktpm01",
        year: 2024,
        departmentCode: "CS",
      } as never,
    ]);

    expect(result.isValid).toBe(false);
    expect(result.summary.total).toBe(3);
    expect(result.summary.invalid).toBeGreaterThan(0);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: "name", severity: "error" }),
        expect.objectContaining({ column: "year", severity: "error" }),
        expect.objectContaining({ column: "departmentCode", severity: "error" }),
      ]),
    );
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Duplicate name found in import data" }),
      ]),
    );
  });

  it("should resolve department id and mark existing class as warning", async () => {
    departmentsRepository.find.mockResolvedValue([{ id: "dept-1", code: "CS" }] as any);
    classesRepository.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.name === "KTPM02" && where?.year === 2024) {
        return { id: "class-1", name: "KTPM02", year: 2024 };
      }
      return null;
    });

    const result = await service.validateClassData([
      {
        name: "KTPM02",
        year: 2024,
        departmentCode: "CS",
      } as never,
    ]);

    expect(result.isValid).toBe(true);
    expect(result.data[0]._departmentId).toBe("dept-1");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: "name", severity: "warning" }),
      ]),
    );
  });

  it("should detect duplicate names by normalized key name+year", () => {
    const duplicates = service.checkDuplicates([
      { name: "CNPM01", year: 2025 } as never,
      { name: "cnpm01 ", year: 2025 } as never,
      { name: "CNPM01", year: 2026 } as never,
    ]);

    expect(duplicates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "name", rows: [0, 1] }),
      ]),
    );
  });
});