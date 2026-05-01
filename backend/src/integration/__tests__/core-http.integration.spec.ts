import { Test } from "@nestjs/testing";
import { INestApplication, CanActivate, ExecutionContext } from "@nestjs/common";
import request from "supertest";
import { AuthController } from "../../auth/auth.controller";
import { UsersController } from "../../users/users.controller";
import { OrganizationsController } from "../../organizations/organizations.controller";
import { ExportController } from "../../export/export.controller";
import { AuthService } from "../../auth/auth.service";
import { UsersService } from "../../users/users.service";
import { ImportService } from "../../users/services/import.service";
import { BatchImportService } from "../../users/services/batch-import.service";
import { RolesService } from "../../roles/roles.service";
import { OrganizationsService } from "../../organizations/organizations.service";
import { OrganizationImportService } from "../../organizations/services/import.service";
import { OrganizationBatchImportService } from "../../organizations/services/batch-import.service";
import { ExportService } from "../../export/export.service";
import { LocalAuthGuard } from "../../auth/guards/local-auth.guard";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { GoogleAuthGuard } from "../../auth/guards/google-auth.guard";

describe("Core HTTP integration", () => {
  let app: INestApplication;

  const authService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getUserPermissions: jest.fn(),
  };

  const usersService = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByExactCode: jest.fn(),
    getUsersWithDefaultPassword: jest.fn(),
  };

  const importService = {
    generateTemplate: jest.fn(),
    uploadFile: jest.fn(),
    validateData: jest.fn(),
    executeImport: jest.fn(),
    getSessionStatus: jest.fn(),
  };

  const batchImportService = {
    validateParsedData: jest.fn(),
    processBatch: jest.fn(),
    getSessionSummary: jest.fn(),
  };

  const rolesService = {
    getAllRoles: jest.fn(),
  };

  const organizationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findTree: jest.fn(),
    findTreeWithDepth: jest.fn(),
    findTreeByTypeCode: jest.fn(),
    getStats: jest.fn(),
    findByType: jest.fn(),
    findByTypeCodeWithChildren: jest.fn(),
    getAccessibleOrganizations: jest.fn(),
    getUserPrimaryOrganization: jest.fn(),
    getCtxhActivityViewableOrganizations: jest.fn(),
    searchCtxhActivityViewableOrganizations: jest.fn(),
    findChildren: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    bulkAddMembersByCode: jest.fn(),
    addMember: jest.fn(),
    addMemberWithParents: jest.fn(),
    bulkRemoveMembers: jest.fn(),
    removeMember: jest.fn(),
    removeMemberSafely: jest.fn(),
    getMembers: jest.fn(),
    addMemberBySimpleCode: jest.fn(),
    validateOrganizationCodes: jest.fn(),
  };

  const organizationImportService = {
    generateTemplate: jest.fn(),
    uploadFile: jest.fn(),
    validateData: jest.fn(),
    executeImport: jest.fn(),
    getSessionStatus: jest.fn(),
  };

  const organizationBatchImportService = {
    processBatch: jest.fn(),
    getSessionSummary: jest.fn(),
  };

  const exportService = {
    exportUsers: jest.fn(),
    exportOrganizationMembers: jest.fn(),
    exportPaymentAssignments: jest.fn(),
    generateFileName: jest.fn(),
  };

  const makeAuthGuard = (): CanActivate => ({
    canActivate(context: ExecutionContext) {
      const requestObject = context.switchToHttp().getRequest();
      requestObject.user = {
        id: "user-1",
        email: "test@example.com",
        familyName: "Nguyen",
        givenName: "An",
        code: "SV001",
      };
      return true;
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = "https://frontend.test";

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        UsersController,
        OrganizationsController,
        ExportController,
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: ImportService, useValue: importService },
        { provide: BatchImportService, useValue: batchImportService },
        { provide: RolesService, useValue: rolesService },
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: OrganizationImportService, useValue: organizationImportService },
        { provide: OrganizationBatchImportService, useValue: organizationBatchImportService },
        { provide: ExportService, useValue: exportService },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue(makeAuthGuard())
      .overrideGuard(JwtAuthGuard)
      .useValue(makeAuthGuard())
      .overrideGuard(GoogleAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useLogger(false);
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("covers auth/login, users/:id, organizations/tree, and export/payment-assignments endpoints", async () => {
    authService.login.mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });
    usersService.findOne.mockResolvedValue({ id: "u-1", email: "test@example.com" });
    organizationsService.findTreeWithDepth.mockResolvedValue([{ id: "org-1" }]);
    exportService.exportPaymentAssignments.mockResolvedValue(Buffer.from("xlsx-binary"));
    exportService.generateFileName.mockReturnValue("danh_sach_phan_cong.xlsx");

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "test@example.com", password: "secret" })
      .expect(201)
      .expect({ accessToken: "access", refreshToken: "refresh" });

    await request(app.getHttpServer())
      .get("/users/u-1")
      .expect(200)
      .expect({ id: "u-1", email: "test@example.com" });

    await request(app.getHttpServer())
      .get("/organizations/tree")
      .query({ maxDepth: 3 })
      .expect(200)
      .expect([{ id: "org-1" }]);

    const exportResponse = await request(app.getHttpServer())
      .post("/export/payment-assignments/camp-1")
      .send({ fields: ["memberCode"], format: "xlsx" })
      .expect(201);

    expect(exportService.exportPaymentAssignments).toHaveBeenCalledWith("camp-1", {
      fields: ["memberCode"],
      format: "xlsx",
    });
    expect(exportResponse.headers["content-disposition"]).toContain("danh_sach_phan_cong.xlsx");
    expect(exportResponse.headers["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });
});