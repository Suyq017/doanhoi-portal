import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ImportValidationService as UsersImportValidationService } from "../import-validation.service";

describe("Users ImportValidationService", () => {
  const createRepositoryMock = (): any => ({
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const createQueryBuilderMock = (existing: any = null) => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => existing),
    };

    return queryBuilder;
  };

  let userRepository: ReturnType<typeof createRepositoryMock>;
  let classRepository: ReturnType<typeof createRepositoryMock>;
  let departmentRepository: ReturnType<typeof createRepositoryMock>;
  let organizationRepository: ReturnType<typeof createRepositoryMock>;
  let service: UsersImportValidationService;

  beforeEach(() => {
    userRepository = createRepositoryMock();
    classRepository = createRepositoryMock();
    departmentRepository = createRepositoryMock();
    organizationRepository = createRepositoryMock();

    service = new UsersImportValidationService(
      userRepository as never,
      classRepository as never,
      departmentRepository as never,
      organizationRepository as never,
    );
  });

  it("should resolve references and apply defaults for valid rows with warnings", async () => {
    userRepository.find.mockResolvedValue([] as any);
    classRepository.find.mockResolvedValue([{ id: "class-1", name: "Class A" }] as any);
    departmentRepository.find.mockResolvedValue([
      { id: "dept-1", code: "MG01" },
    ] as any);
    organizationRepository.find.mockResolvedValue([
      { id: "org-1", code: "CTXH" },
    ] as any);

    const results = await service.validateImportData([
      {
        familyName: "Nguyen",
        givenName: "An",
        code: "SV001",
        email: "student@example.com",
        phone: "abc123",
        className: "Class A",
        managementDepartmentCode: "MG01",
        trainingDepartmentCode: "UNKNOWN",
        organizationCodes: "CTXH;MISSING",
        userType: "guest",
        membershipStatus: "invalid",
        isActive: undefined,
      } as never,
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].validation.isValid).toBe(true);
    expect(results[0].validation.errors).toEqual([]);
    expect(results[0].data.userType).toBe("student");
    expect(results[0].data.membershipStatus).toBe("none");
    expect(results[0].data.isActive).toBe(true);
    expect(results[0].data.classId).toBe("class-1");
    expect(results[0].data.managementDepartmentId).toBe("dept-1");
    expect(results[0].data.organizationIds).toEqual(["org-1"]);
    expect(results[0]._warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: "phone", severity: "warning" }),
        expect.objectContaining({ column: "trainingDepartmentCode", severity: "warning" }),
        expect.objectContaining({ column: "organizationCodes", severity: "warning" }),
        expect.objectContaining({ column: "userType", severity: "warning" }),
        expect.objectContaining({ column: "membershipStatus", severity: "warning" }),
      ]),
    );
  });

  it("should flag duplicate codes and required field errors", async () => {
    userRepository.find.mockResolvedValue([{ code: "EXIST1" }] as any);
    classRepository.find.mockResolvedValue([] as any);
    departmentRepository.find.mockResolvedValue([] as any);
    organizationRepository.find.mockResolvedValue([] as any);

    const results = await service.validateImportData([
      {
        familyName: "",
        givenName: "Lan",
        code: "EXIST1",
      } as never,
      {
        familyName: "Tran",
        givenName: "Binh",
        code: "EXIST1",
        email: "invalid-email",
      } as never,
    ]);

    expect(results[0].validation.isValid).toBe(false);
    expect(results[0].validation.errors).toEqual(
      expect.arrayContaining([
        "Family Name is required",
        "Code already exists in database",
      ]),
    );

    expect(results[1].validation.isValid).toBe(false);
    expect(results[1].validation.errors).toEqual(
      expect.arrayContaining([
        "Code already exists in database",
        "Duplicate code in import data",
        "Invalid email format",
      ]),
    );
  });

  it("should validate email and code uniqueness queries", async () => {
    userRepository.createQueryBuilder
      .mockReturnValueOnce(createQueryBuilderMock({ id: "user-1" }) as never)
      .mockReturnValueOnce(createQueryBuilderMock({ id: "user-1" }) as never)
      .mockReturnValueOnce(createQueryBuilderMock(null) as never);

    await expect(service.validateEmailUniqueness(null)).resolves.toBe(true);
    await expect(service.validateEmailUniqueness("test@example.com")).resolves.toBe(false);
    await expect(service.validateEmailUniqueness("test@example.com", "user-2")).resolves.toBe(false);
    await expect(service.validateCodeUniqueness("SV001")).resolves.toBe(true);

    expect(userRepository.createQueryBuilder).toHaveBeenCalled();
  });
});