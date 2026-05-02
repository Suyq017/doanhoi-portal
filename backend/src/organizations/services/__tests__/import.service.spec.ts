import { BadRequestException, NotFoundException } from "@nestjs/common";
import * as XLSX from "xlsx";
import { OrganizationImportService } from "../../organization-import.service";

describe("OrganizationImportService", () => {
  const createOrganizationsRepositoryMock = () => ({
    findOne: jest.fn(),
  });

  const createUsersRepositoryMock = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const createUserOrganizationsRepositoryMock = () => ({
    create: jest.fn((value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  });

  const createMetricsServiceMock = () => ({
    orgImportValidationDuration: { observe: jest.fn() },
    orgImportBatchSize: { set: jest.fn() },
    importSessionsActive: {
      labels: jest.fn().mockReturnValue({ inc: jest.fn(), dec: jest.fn() }),
    },
    recordImportSession: jest.fn(),
  });

  let organizationsRepository: ReturnType<typeof createOrganizationsRepositoryMock>;
  let usersRepository: ReturnType<typeof createUsersRepositoryMock>;
  let userOrganizationsRepository: ReturnType<typeof createUserOrganizationsRepositoryMock>;
  let metricsService: ReturnType<typeof createMetricsServiceMock>;
  let service: OrganizationImportService;

  beforeEach(() => {
    organizationsRepository = createOrganizationsRepositoryMock();
    usersRepository = createUsersRepositoryMock();
    userOrganizationsRepository = createUserOrganizationsRepositoryMock();
    metricsService = createMetricsServiceMock();

    service = new OrganizationImportService(
      organizationsRepository as never,
      usersRepository as never,
      userOrganizationsRepository as never,
      metricsService as never,
    );
  });

  const createExcelBuffer = (rows: Array<Array<string>>) => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  };

  it("should parse uploaded level 3 file and create preview session", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1" });

    const file = {
      originalname: "members.xlsx",
      buffer: createExcelBuffer([
        ["Student Code"],
        ["SV001"],
        ["SV002"],
      ]),
    } as Express.Multer.File;

    const result = await service.processUploadedFile(file, "org-1", 3);

    expect(result.sessionId).toContain("import_");
    expect(result.previewData).toEqual([
      { studentCode: "SV001" },
      { studentCode: "SV002" },
    ]);
  });

  it("should reject upload for invalid extension", async () => {
    await expect(
      service.processUploadedFile({ originalname: "members.txt", buffer: Buffer.from("x") } as never, "org-1", 3),
    ).rejects.toThrow(BadRequestException);
  });

  it("should reject upload when organization does not exist", async () => {
    organizationsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.processUploadedFile({ originalname: "members.xlsx", buffer: Buffer.from("x") } as never, "org-missing", 3),
    ).rejects.toThrow(NotFoundException);
  });

  it("should reject executeImport when session is missing", async () => {
    await expect(service.executeImport("missing")).rejects.toThrow(
      "Session không tồn tại hoặc đã hết hạn",
    );
  });

  it("should reject executeImport when session is not validated", async () => {
    (service as any).importSessions.set("session-1", {
      sessionId: "session-1",
      organizationId: "org-1",
      data: [{ studentCode: "SV001" }],
      validationResults: [],
      createdAt: new Date(),
    });

    await expect(service.executeImport("session-1")).rejects.toThrow(
      "Dữ liệu chưa được validate. Vui lòng validate trước khi import",
    );
  });

  it("should reject validateImportData when session is missing", async () => {
    await expect(service.validateImportData("missing")).rejects.toThrow(
      "Session không tồn tại hoặc đã hết hạn",
    );
  });

  it("should validate data and mark missing user as invalid", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1" });
    const upload = await service.processUploadedFile(
      {
        originalname: "members.xlsx",
        buffer: createExcelBuffer([["Mã số sinh viên"], ["SV404"]]),
      } as never,
      "org-1",
      3,
    );
    usersRepository.find.mockResolvedValue([]);
    userOrganizationsRepository.find.mockResolvedValue([]);

    const validation = await service.validateImportData(upload.sessionId);

    expect(validation).toHaveLength(1);
    expect(validation[0].isValid).toBe(false);
    expect(validation[0].errors[0]).toContain("Không tìm thấy sinh viên");
  });

  it("should execute import and skip already existing members", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1" });
    usersRepository.find.mockResolvedValue([
      { id: "user-1", code: "SV001" },
      { id: "user-2", code: "SV002" },
    ]);
    userOrganizationsRepository.find.mockResolvedValue([{ userId: "user-1" }]);

    (service as any).importSessions.set("session-1", {
      sessionId: "session-1",
      organizationId: "org-1",
      data: [{ studentCode: "SV001" }, { studentCode: "SV002" }],
      validationResults: [
        { rowIndex: 2, data: { studentCode: "SV001" }, isValid: true, errors: [], warnings: [] },
        { rowIndex: 3, data: { studentCode: "SV002" }, isValid: true, errors: [], warnings: [] },
      ],
      createdAt: new Date(),
    });

    const results = await service.executeImport("session-1", true);

    expect(results.total).toBe(2);
    expect(results.successful).toBe(2);
    expect(results.failed).toBe(0);
    expect(userOrganizationsRepository.create).toHaveBeenCalledTimes(1);
    expect(userOrganizationsRepository.save).toHaveBeenCalledTimes(1);
  });

  it("should throw for invalid template level", () => {
    expect(() => service.generateTemplate(1)).toThrow(BadRequestException);
  });
});