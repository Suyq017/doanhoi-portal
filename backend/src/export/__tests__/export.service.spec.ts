import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as XLSX from "xlsx";
import { ExportService } from "../export.service";

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
});

const createUserOrganizationRepositoryMock = () => ({
  find: jest.fn(),
});

describe("ExportService", () => {
  let userRepository: ReturnType<typeof createRepositoryMock>;
  let organizationRepository: ReturnType<typeof createRepositoryMock>;
  let userOrganizationRepository: ReturnType<typeof createUserOrganizationRepositoryMock>;
  let paymentAssignmentRepository: ReturnType<typeof createRepositoryMock>;
  let paymentCampaignRepository: ReturnType<typeof createRepositoryMock>;
  let paymentHistoryRepository: ReturnType<typeof createRepositoryMock>;

  const createService = () => new ExportService(
    userRepository as never,
    organizationRepository as never,
    userOrganizationRepository as never,
    paymentAssignmentRepository as never,
    paymentCampaignRepository as never,
    paymentHistoryRepository as never,
  );

  const readFirstSheet = (buffer: Buffer) => {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
    return { workbook, sheetName, rows };
  };

  beforeEach(() => {
    userRepository = createRepositoryMock();
    organizationRepository = createRepositoryMock();
    userOrganizationRepository = createUserOrganizationRepositoryMock();
    paymentAssignmentRepository = createRepositoryMock();
    paymentCampaignRepository = createRepositoryMock();
    paymentHistoryRepository = createRepositoryMock();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("exports users with mapped headers and formatter values", async () => {
    const service = createService();

    userRepository.find.mockResolvedValue([
      {
        code: "SV001",
        familyName: "Nguyen",
        givenName: "An",
        email: "an@example.com",
        phone: "0123456789",
        managementDepartment: { name: "Khoa quản lý" },
        trainingDepartment: { name: "Khoa đào tạo" },
        class: { name: "CTK42" },
        userType: "student",
        membershipStatus: "both",
        isActive: false,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-02-01T00:00:00.000Z"),
      },
    ]);

    const buffer = await service.exportUsers({
      fields: [
        "code",
        "fullName",
        "email",
        "phone",
        "managementDepartment",
        "trainingDepartment",
        "class",
        "userType",
        "membershipStatus",
        "isActive",
        "createdAt",
        "updatedAt",
      ],
      format: "xlsx",
    } as never);

    const { sheetName, rows } = readFirstSheet(buffer);

    expect(sheetName).toBe("Danh sách người dùng");
    expect(rows[0]).toEqual([
      "Mã số",
      "Họ và tên đầy đủ",
      "Email",
      "Số điện thoại",
      "Khoa quản lý",
      "Khoa đào tạo",
      "Lớp",
      "Loại người dùng",
      "Tình trạng thành viên",
      "Trạng thái hoạt động",
      "Ngày tạo",
      "Ngày cập nhật",
    ]);
    expect(rows[1].slice(0, 10)).toEqual([
      "SV001",
      "Nguyen An",
      "an@example.com",
      "0123456789",
      "Khoa quản lý",
      "Khoa đào tạo",
      "CTK42",
      "Sinh viên",
      "Cả hai",
      "Không hoạt động",
    ]);
    expect(String(rows[1][10])).toContain("2024");
    expect(String(rows[1][11])).toContain("2024");
  });

  it("rejects exporting users when there is no data", async () => {
    const service = createService();
    userRepository.find.mockResolvedValue([]);

    await expect(
      service.exportUsers({ fields: ["code"], format: "xlsx" } as never),
    ).rejects.toThrow("Không có dữ liệu để xuất");
  });

  it("exports organization members with a safe sheet name and role formatter", async () => {
    const service = createService();

    organizationRepository.findOne.mockResolvedValue({
      id: "org-1",
      name: "Tổ chức / Hợp tác: [Khoa] * 2024 siêu dài để kiểm tra tên sheet",
    });
    userOrganizationRepository.find.mockResolvedValue([
      {
        role: "admin",
        joinedAt: new Date("2024-01-15T00:00:00.000Z"),
        isActive: true,
        user: {
          code: "SV002",
          familyName: "Tran",
          givenName: "Binh",
          email: "binh@example.com",
          phone: "0987123456",
          managementDepartment: { name: "Khoa CNTT" },
          trainingDepartment: { name: "Khoa CNTT" },
          class: { name: "CNTT42" },
        },
      },
    ]);

    const buffer = await service.exportOrganizationMembers(
      "org-1",
      {
        fields: ["code", "fullName", "role", "joinedAt", "isActive"],
        format: "xlsx",
      } as never,
    );

    const { sheetName, rows } = readFirstSheet(buffer);

    expect(sheetName.length).toBeLessThanOrEqual(31);
    expect(sheetName).not.toMatch(/[\\/\?\*\[\]:]/);
    expect(sheetName.startsWith("DS thành viên - ")).toBe(true);
    expect(rows[0]).toEqual([
      "Mã số",
      "Họ và tên đầy đủ",
      "Vai trò trong tổ chức",
      "Ngày tham gia",
      "Trạng thái hoạt động",
    ]);
    expect(rows[1][0]).toBe("SV002");
    expect(rows[1][1]).toBe("Tran Binh");
    expect(rows[1][2]).toBe("Quản trị viên");
    expect(rows[1][4]).toBe("Hoạt động");
    expect(String(rows[1][3])).toContain("2024");
  });

  it("rejects exporting organization members when the organization is missing", async () => {
    const service = createService();
    organizationRepository.findOne.mockResolvedValue(null);

    await expect(
      service.exportOrganizationMembers(
        "org-1",
        { fields: ["memberCode"], format: "xlsx" } as never,
      ),
    ).rejects.toThrow("Không tìm thấy tổ chức");
  });

  it("rejects exporting organization members when there are no members", async () => {
    const service = createService();
    organizationRepository.findOne.mockResolvedValue({ id: "org-1", name: "Tổ chức A" });
    userOrganizationRepository.find.mockResolvedValue([]);

    await expect(
      service.exportOrganizationMembers(
        "org-1",
        { fields: ["memberCode"], format: "xlsx" } as never,
      ),
    ).rejects.toThrow("Tổ chức không có thành viên nào");
  });

  it("exports payment assignments with payment history and assignment formatters", async () => {
    const service = createService();

    paymentCampaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      name: "Đợt thu / Học phí: [Kỳ 1] siêu dài để kiểm tra sheet",
      organization: { id: "org-1" },
    });
    paymentAssignmentRepository.find.mockResolvedValue([
      {
        id: "assign-1",
        user: {
          code: "SV003",
          familyName: "Le",
          givenName: "Chi",
          email: "chi@example.com",
          phone: "0909000000",
        },
        feeLevel: { levelName: "Mức 1", amount: 50000 },
        dueDate: new Date("2024-03-01T00:00:00.000Z"),
        status: "PENDING",
        note: "Ghi chú mẫu",
        assignedAt: new Date("2024-02-01T00:00:00.000Z"),
        assignedByUser: { familyName: "Pham", givenName: "Dung" },
        updatedAt: new Date("2024-02-02T00:00:00.000Z"),
      },
    ]);
    paymentHistoryRepository.find.mockResolvedValue([
      {
        assignment_id: "assign-1",
        amount: 50000,
        paid_at: new Date("2024-02-10T00:00:00.000Z"),
        order_code: "ORD-1",
        checksum_key: "chk",
        api_key: "api",
        client_id: "client",
      },
    ]);

    const buffer = await service.exportPaymentAssignments(
      "camp-1",
      {
        fields: [
          "memberCode",
          "memberName",
          "feeLevelName",
          "amount",
          "dueDate",
          "status",
          "notes",
          "paidAmount",
          "paymentDate",
          "transactionId",
          "checksumKey",
          "apiKey",
          "clientId",
          "assignedDate",
          "assignedBy",
          "lastUpdated",
        ],
        format: "xlsx",
      } as never,
    );

    const { sheetName, rows } = readFirstSheet(buffer);

    expect(sheetName.length).toBeLessThanOrEqual(31);
    expect(sheetName).not.toMatch(/[\\/\?\*\[\]:]/);
    expect(rows[0]).toEqual([
      "Mã số thành viên",
      "Họ và tên thành viên",
      "Tên mức phí",
      "Số tiền (VNĐ)",
      "Hạn đóng",
      "Trạng thái thanh toán",
      "Ghi chú",
      "Số tiền đã đóng (VNĐ)",
      "Ngày thanh toán",
      "Mã giao dịch",
      "Checksum Key",
      "API Key",
      "Client ID",
      "Ngày phân công",
      "Người phân công",
      "Cập nhật lần cuối",
    ]);
    expect(rows[1][0]).toBe("SV003");
    expect(rows[1][1]).toBe("Le Chi");
    expect(rows[1][2]).toBe("Mức 1");
    expect(rows[1][3]).toBe("50.000");
    expect(String(rows[1][4])).toContain("2024");
    expect(rows[1][5]).toBe("Chờ thanh toán");
    expect(rows[1][6]).toBe("Ghi chú mẫu");
    expect(rows[1][7]).toBe("50.000");
    expect(String(rows[1][8])).toContain("2024");
    expect(rows[1][9]).toBe("ORD-1");
    expect(rows[1][10]).toBe("chk");
    expect(rows[1][11]).toBe("api");
    expect(rows[1][12]).toBe("client");
    expect(String(rows[1][13])).toContain("2024");
    expect(rows[1][14]).toBe("Pham Dung");
    expect(String(rows[1][15])).toContain("2024");
  });

  it("exports payment assignments with blank payment history fields when no history exists", async () => {
    const service = createService();

    paymentCampaignRepository.findOne.mockResolvedValue({
      id: "camp-2",
      name: "Đợt thu A",
      organization: { id: "org-1" },
    });
    paymentAssignmentRepository.find.mockResolvedValue([
      {
        id: "assign-2",
        user: { code: "SV004", familyName: "Vo", givenName: "Lan" },
        feeLevel: { levelName: "Mức 2", amount: 75000 },
        dueDate: new Date("2024-04-01T00:00:00.000Z"),
        status: "OVERDUE",
        note: null,
        assignedAt: new Date("2024-03-01T00:00:00.000Z"),
        assignedByUser: { familyName: "Do", givenName: "Nam" },
        updatedAt: new Date("2024-03-02T00:00:00.000Z"),
      },
    ]);
    paymentHistoryRepository.find.mockResolvedValue([]);

    const buffer = await service.exportPaymentAssignments(
      "camp-2",
      {
        fields: ["memberCode", "paidAmount", "paymentDate", "transactionId", "checksumKey", "apiKey", "clientId"],
        format: "xlsx",
      } as never,
    );

    const { rows } = readFirstSheet(buffer);

    expect(rows[1][0]).toBe("SV004");
    expect(rows[1][1]).toBe("");
    expect(rows[1][2]).toBe("");
    expect(rows[1][3]).toBe("");
    expect(rows[1][4]).toBe("");
    expect(rows[1][5]).toBe("");
    expect(rows[1][6]).toBe("");
  });

  it("rejects exporting payment assignments when the campaign is missing", async () => {
    const service = createService();
    paymentCampaignRepository.findOne.mockResolvedValue(null);

    await expect(
      service.exportPaymentAssignments(
        "camp-1",
        { fields: ["memberCode"], format: "xlsx" } as never,
      ),
    ).rejects.toThrow("Không tìm thấy đợt thu phí");
  });

  it("rejects exporting payment assignments when there are no assignments", async () => {
    const service = createService();
    paymentCampaignRepository.findOne.mockResolvedValue({ id: "camp-1", name: "Đợt thu A", organization: { id: "org-1" } });
    paymentAssignmentRepository.find.mockResolvedValue([]);

    await expect(
      service.exportPaymentAssignments(
        "camp-1",
        { fields: ["memberCode"], format: "xlsx" } as never,
      ),
    ).rejects.toThrow("Đợt thu phí không có phân công nào");
  });

  it("generates stable normalized file names", () => {
    const service = createService();

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-04-28T00:00:00.000Z"));

    const fileName = service.generateFileName("users", "Đoàn Hội Portal");

    expect(fileName).toMatch(/^users_.*oan_hoi_portal_2024-04-28\.xlsx$/);
  });
});