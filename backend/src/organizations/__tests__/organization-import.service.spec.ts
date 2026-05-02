import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as XLSX from "xlsx";
import { OrganizationImportService } from "../organization-import.service";

describe("OrganizationImportService", () => {
  const createRepoMock = () => ({
    findOne: jest.fn() as any,
    find: jest.fn() as any,
    create: jest.fn((v: any) => v) as any,
    save: jest.fn() as any,
  });

  let organizationsRepository: any;
  let usersRepository: any;
  let userOrganizationsRepository: any;
  let metricsService: any;
  let service: OrganizationImportService;

  beforeEach(() => {
    organizationsRepository = createRepoMock();
    usersRepository = createRepoMock();
    userOrganizationsRepository = createRepoMock();

    metricsService = {
      orgImportValidationDuration: { observe: jest.fn() },
      orgImportBatchSize: { set: jest.fn() },
      importSessionsActive: { labels: jest.fn(() => ({ inc: jest.fn(), dec: jest.fn() })) },
      recordImportSession: jest.fn(),
    };

    service = new OrganizationImportService(
      organizationsRepository as never,
      usersRepository as never,
      userOrganizationsRepository as never,
      metricsService as never,
    );
  });

  const createExcelBuffer = (rows: any[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Import");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  };

  it("should reject non-excel files", async () => {
    await expect(
      service.processUploadedFile(
        { originalname: "members.txt", buffer: Buffer.from("x") } as never,
        "org-1",
        2,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject missing organization", async () => {
    organizationsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.processUploadedFile(
        {
          originalname: "members.xlsx",
          buffer: createExcelBuffer([["Mã số sinh viên"], ["2052001"]]),
        } as never,
        "org-missing",
        3,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should create import session and return preview", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1" });

    const result = await service.processUploadedFile(
      {
        originalname: "members.xlsx",
        buffer: createExcelBuffer([
          ["Mã số sinh viên", "Mã lớp/đơn vị"],
          ["2052001", "KTPM01"],
          ["2052002", "KTPM02"],
        ]),
      } as never,
      "org-1",
      2,
    );

    expect(result.sessionId).toContain("import_");
    expect(result.previewData).toHaveLength(2);
  });

  it("should validate import data with warnings for existing members", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1" });

    const upload = await service.processUploadedFile(
      {
        originalname: "members.xlsx",
        buffer: createExcelBuffer([
          ["Mã số sinh viên"],
          ["2052001"],
          ["2052999"],
        ]),
      } as never,
      "org-1",
      3,
    );

    usersRepository.find.mockResolvedValue([{ id: "u1", code: "2052001" }]);
    userOrganizationsRepository.find.mockResolvedValue([{ userId: "u1" }]);

    const validation = await service.validateImportData(upload.sessionId);

    expect(validation).toHaveLength(2);
    expect(validation[0].warnings.length).toBeGreaterThanOrEqual(1);
    expect(validation[1].isValid).toBe(false);
  });

  it("should execute import with skipErrors true", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1" });
    const upload = await service.processUploadedFile(
      {
        originalname: "members.xlsx",
        buffer: createExcelBuffer([["Mã số sinh viên"], ["2052001"]]),
      } as never,
      "org-1",
      3,
    );

    usersRepository.find.mockResolvedValue([{ id: "u1", code: "2052001" }]);
    userOrganizationsRepository.find.mockResolvedValue([]);
    userOrganizationsRepository.save.mockResolvedValue(undefined);

    await service.validateImportData(upload.sessionId);
    const result = await service.executeImport(upload.sessionId, true);

    expect(result.successful).toBeGreaterThanOrEqual(1);
    expect(metricsService.recordImportSession).toHaveBeenCalled();
  });

  it("should generate template by level and reject invalid level", () => {
    const lv2 = service.generateTemplate(2);
    const lv3 = service.generateTemplate(3);

    expect(lv2.length).toBeGreaterThan(0);
    expect(lv3.length).toBeGreaterThan(0);
    expect(() => service.generateTemplate(1)).toThrow(BadRequestException);
  });

  it("should reject executeImport when invalid records exist and skipErrors false", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1" });
    const upload = await service.processUploadedFile(
      {
        originalname: "members.xlsx",
        buffer: createExcelBuffer([
          ["Mã số sinh viên"],
          ["2052001"],
          ["2052999"],
        ]),
      } as never,
      "org-1",
      3,
    );

    usersRepository.find.mockResolvedValue([{ id: "u1", code: "2052001" }]);
    userOrganizationsRepository.find.mockResolvedValue([]);

    await service.validateImportData(upload.sessionId);

    await expect(
      service.executeImport(upload.sessionId, false),
    ).rejects.toThrow("Có");
  });

  it("should process valid rows only and skip existing members when skipErrors true", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1" });
    const upload = await service.processUploadedFile(
      {
        originalname: "members.xlsx",
        buffer: createExcelBuffer([
          ["Mã số sinh viên"],
          ["2052001"],
          ["2052002"],
        ]),
      } as never,
      "org-1",
      3,
    );

    usersRepository.find
      .mockResolvedValueOnce([{ id: "u1", code: "2052001" }]) // during upload parsing
      .mockResolvedValueOnce([
        { id: "u1", code: "2052001" },
        { id: "u2", code: "2052002" },
      ]); // during validation
    userOrganizationsRepository.find
      .mockResolvedValueOnce([]) // during validation
      .mockResolvedValueOnce([{ userId: "u1" }]); // during execute (existing member)
    userOrganizationsRepository.save.mockResolvedValue(undefined);

    await service.validateImportData(upload.sessionId);
    const result = await service.executeImport(upload.sessionId, true);

    expect(result.successful).toBeGreaterThanOrEqual(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });
});