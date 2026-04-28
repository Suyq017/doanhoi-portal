import { OrganizationsController } from "../organizations.controller";

describe("OrganizationsController", () => {
  const organizationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findTree: jest.fn(),
    findTreeWithDepth: jest.fn(),
    findTreeByTypeCode: jest.fn(),
    getStats: jest.fn(),
    findByType: jest.fn(),
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
  const importService = {
    generateTemplate: jest.fn(),
    uploadFile: jest.fn(),
    validateData: jest.fn(),
    executeImport: jest.fn(),
    getSessionStatus: jest.fn(),
  };
  const batchImportService = {
    processBatch: jest.fn(),
    getSessionSummary: jest.fn(),
  };

  let controller: OrganizationsController;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    controller = new OrganizationsController(
      organizationsService as never,
      importService as never,
      batchImportService as never,
    );
  });

  it("covers tree, lookup, and stats endpoints", async () => {
    organizationsService.create.mockResolvedValue({ id: "o1" });
    organizationsService.findAll.mockResolvedValue([{ id: "o1" }]);
    organizationsService.findTree.mockResolvedValue([{ id: "tree" }]);
    organizationsService.findTreeWithDepth.mockResolvedValue([{ id: "depth" }]);
    organizationsService.findTreeByTypeCode.mockResolvedValue([{ id: "type" }]);
    organizationsService.getStats.mockResolvedValue({ total: 1 });
    organizationsService.findByType.mockResolvedValue([{ id: "type-1" }]);
    organizationsService.findChildren.mockResolvedValue([{ id: "child" }]);
    organizationsService.findOne.mockResolvedValue({ id: "org-1" });
    organizationsService.findByTypeCodeWithChildren = jest.fn().mockResolvedValue([{ id: "by-code" }]);

    await expect(controller.create({ name: "Org" } as any)).resolves.toEqual({ id: "o1" });
    await expect(controller.findAll()).resolves.toEqual([{ id: "o1" }]);
    await expect(controller.findTree(undefined, undefined, undefined)).resolves.toEqual([{ id: "tree" }]);
    await expect(controller.findTree(3 as any, undefined, undefined)).resolves.toEqual([{ id: "depth" }]);
    await expect(controller.findTree(4 as any, "type", "code")).resolves.toEqual([{ id: "type" }]);
    await expect(controller.getOrganizationByTypeCode("type", "code", "true", "2")).resolves.toEqual([{ id: "by-code" }]);
    await expect(controller.getStats()).resolves.toEqual({ total: 1 });
    await expect(controller.findByType("DOAN" as any)).resolves.toEqual([{ id: "type-1" }]);
    await expect(controller.findChildren("org-1")).resolves.toEqual([{ id: "child" }]);
    await expect(controller.findOne("org-1")).resolves.toEqual({ id: "org-1" });
  });

  it("covers member, import, and validation endpoints", async () => {
    const res = { setHeader: jest.fn(), send: jest.fn() } as any;
    organizationsService.update.mockResolvedValue({ id: "org-1", name: "Updated" });
    organizationsService.remove.mockResolvedValue(undefined);
    organizationsService.bulkAddMembersByCode.mockResolvedValue({ success: 1 });
    organizationsService.addMember.mockResolvedValue({ id: "m1" });
    organizationsService.addMemberWithParents.mockResolvedValue({ id: "m2" });
    organizationsService.bulkRemoveMembers.mockResolvedValue(undefined);
    organizationsService.removeMember.mockResolvedValue(undefined);
    organizationsService.removeMemberSafely.mockResolvedValue(undefined);
    organizationsService.getMembers.mockResolvedValue({ data: [] });
    organizationsService.addMemberBySimpleCode.mockResolvedValue({ id: "m3" });
    organizationsService.validateOrganizationCodes.mockResolvedValue({ validCodes: ["o1"], invalidCodes: [] });

    importService.generateTemplate.mockResolvedValue(Buffer.from("template"));
    importService.uploadFile.mockResolvedValue({ sessionId: "s1" });
    importService.validateData.mockResolvedValue({ ok: true });
    importService.executeImport.mockResolvedValue({ imported: 1 });
    importService.getSessionStatus.mockResolvedValue({ status: "done" });
    batchImportService.processBatch.mockResolvedValue({ ok: true });
    batchImportService.getSessionSummary.mockResolvedValue({ summary: true });

    await expect(controller.update("org-1", { name: "Updated" } as any)).resolves.toEqual({ id: "org-1", name: "Updated" });
    await expect(controller.remove("org-1")).resolves.toBeUndefined();
    await expect(controller.bulkAddMembersByCode("org-1", ["SV1"])).resolves.toEqual({ success: 1 });
    await expect(controller.addMember("org-1", "u1")).resolves.toEqual({ id: "m1" });
    await expect(controller.addMemberWithParents("org-1", "u1")).resolves.toEqual({ id: "m2" });
    await expect(controller.bulkRemoveMembers("org-1", { userIds: ["u1", "u2"] } as any)).resolves.toEqual({ message: "Đã loại bỏ thành công 2 thành viên khỏi tổ chức", removedCount: 2 });
    await expect(controller.removeMember("org-1", "u1")).resolves.toBeUndefined();
    await expect(controller.removeMemberSafely("org-1", "u1")).resolves.toBeUndefined();
    await expect(controller.getMembers("org-1", "2", "5")).resolves.toEqual({ data: [] });
    await expect(controller.addMemberBySimpleCode("ORG", "USER")).resolves.toEqual({ id: "m3" });
    await expect(controller.validateOrganizationCodes(["o1"])).resolves.toEqual({ validCodes: ["o1"], invalidCodes: [] });
    await expect(controller.uploadImportFile({ originalname: "org.xlsx" } as any, "3", "org-1")).resolves.toEqual({ sessionId: "s1" });
    await expect(controller.validateImportData("s1")).resolves.toEqual({ ok: true });
    await expect(controller.executeImport("s1", { skipConflicts: true })).resolves.toEqual({ imported: 1 });
    await expect(controller.getImportStatus("s1")).resolves.toEqual({ status: "done" });
    await expect(controller.importMembersBatch({ members: [], batchInfo: { id: 1 }, options: {} } as any)).resolves.toEqual({ ok: true });
    await expect(controller.getBatchImportStatus("s1")).resolves.toEqual({ summary: true });
  });

  it("covers accessible org and upload guard branches", async () => {
    organizationsService.getAccessibleOrganizations.mockResolvedValue([{ id: "o1" }]);
    organizationsService.getUserPrimaryOrganization.mockResolvedValue({ id: "primary" });
    organizationsService.getCtxhActivityViewableOrganizations.mockResolvedValue([{ id: "ctxh" }]);
    organizationsService.searchCtxhActivityViewableOrganizations.mockResolvedValue({ data: [] });

    await expect(controller.getAccessibleOrganizations({ user: { id: "u1" } } as any)).resolves.toEqual([{ id: "o1" }]);
    await expect(controller.getUserPrimaryOrganization({ user: { id: "u1" } } as any)).resolves.toEqual({ id: "primary" });
    await expect(controller.getCtxhActivityViewableOrganizations({ user: { id: "u1" } } as any)).resolves.toEqual({ organizations: [{ id: "ctxh" }] });
    await expect(controller.searchCtxhActivityViewableOrganizations({ user: { id: "u1" } } as any, "search", 1, 10)).resolves.toEqual({ data: [] });

    await expect(controller.uploadImportFile({ originalname: "x.xlsx" } as any, "1")).rejects.toThrow("Level phải là 2 hoặc 3");
  });
});