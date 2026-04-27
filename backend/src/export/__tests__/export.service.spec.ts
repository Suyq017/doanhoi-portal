import { ExportService } from "../export.service";

describe("ExportService", () => {
  const createRepositoryMock = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
  });

  const createUserOrganizationRepositoryMock = () => ({
    find: jest.fn(),
  });

  let userRepository: ReturnType<typeof createRepositoryMock>;
  let organizationRepository: ReturnType<typeof createRepositoryMock>;
  let userOrganizationRepository: ReturnType<typeof createUserOrganizationRepositoryMock>;
  let paymentAssignmentRepository: ReturnType<typeof createRepositoryMock>;
  let paymentCampaignRepository: ReturnType<typeof createRepositoryMock>;
  let paymentHistoryRepository: ReturnType<typeof createRepositoryMock>;

  beforeEach(() => {
    userRepository = createRepositoryMock();
    organizationRepository = createRepositoryMock();
    userOrganizationRepository = createUserOrganizationRepositoryMock();
    paymentAssignmentRepository = createRepositoryMock();
    paymentCampaignRepository = createRepositoryMock();
    paymentHistoryRepository = createRepositoryMock();
  });

  const createService = () => new ExportService(
    userRepository as never,
    organizationRepository as never,
    userOrganizationRepository as never,
    paymentAssignmentRepository as never,
    paymentCampaignRepository as never,
    paymentHistoryRepository as never,
  );

  it("should export users to a workbook buffer", async () => {
    const service = createService();
    userRepository.find.mockResolvedValue([
      {
        code: "SV001",
        familyName: "Nguyen",
        givenName: "An",
        email: "an@example.com",
        phone: "0123",
        managementDepartment: { name: "Khoa 1" },
        trainingDepartment: { name: "Khoa 2" },
        class: { name: "Class A" },
        userType: "student",
        membershipStatus: "none",
        isActive: true,
      },
    ]);

    const buffer = await service.exportUsers({ fields: ["code", "fullName", "managementDepartment", "isActive"], format: "xlsx" } as never);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should generate stable file names", () => {
    const service = createService();
    const fileName = service.generateFileName("users", "Đoàn Hội Portal");

    expect(fileName).toMatch(/^users_/);
    expect(fileName).toContain("oan_hoi_portal");
    expect(fileName).toContain(".xlsx");
  });
});