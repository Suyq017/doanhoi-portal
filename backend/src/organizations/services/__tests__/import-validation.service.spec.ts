import { OrganizationImportValidationService } from "../import-validation.service";

describe("OrganizationImportValidationService", () => {
  const createUsersRepositoryMock = () => ({
    find: jest.fn(),
  });

  const createMembershipRepositoryMock = () => ({
    find: jest.fn(),
  });

  const createOrganizationsRepositoryMock = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  let usersRepository: ReturnType<typeof createUsersRepositoryMock>;
  let userOrganizationsRepository: ReturnType<typeof createMembershipRepositoryMock>;
  let organizationsRepository: ReturnType<typeof createOrganizationsRepositoryMock>;
  let service: OrganizationImportValidationService;

  beforeEach(() => {
    usersRepository = createUsersRepositoryMock();
    userOrganizationsRepository = createMembershipRepositoryMock();
    organizationsRepository = createOrganizationsRepositoryMock();

    service = new OrganizationImportValidationService(
      usersRepository as never,
      userOrganizationsRepository as never,
      organizationsRepository as never,
    );
  });

  it("should validate level 3 members and detect duplicate rows and memberships", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1" });
    usersRepository.find.mockImplementation(async ({ select }) => {
      if (select?.includes("code")) {
        return [{ id: "user-1", code: "SV001" }];
      }

      return [{ id: "user-1", code: "SV001", fullName: "Student 1" }];
    });
    userOrganizationsRepository.find.mockResolvedValue([{ userId: "user-1" }]);

    const result = await service.validateOrganizationMemberData(
      [
        { studentCode: "SV001" } as never,
        { studentCode: "SV001" } as never,
      ],
      "org-1",
      3,
    );

    expect(result.isValid).toBe(false);
    expect(result.summary.total).toBe(2);
    expect(result.summary.conflicts).toBe(2);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: "studentCode", severity: "error" }),
      ]),
    );
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("already a member") }),
      ]),
    );
  });

  it("should fail when organization does not exist", async () => {
    organizationsRepository.findOne.mockResolvedValue(null);
    usersRepository.find.mockResolvedValue([]);
    userOrganizationsRepository.find.mockResolvedValue([]);

    const result = await service.validateOrganizationMemberData(
      [{ studentCode: "SV001" } as never],
      "missing-org",
      3,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column: "organization", message: "Organization not found" }),
      ]),
    );
  });
});