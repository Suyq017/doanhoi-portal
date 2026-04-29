import { ClassesController } from "../classes.controller";

describe("ClassesController", () => {
  const classesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    bulkDelete: jest.fn(),
    remove: jest.fn(),
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

  let controller: ClassesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ClassesController(classesService as never, importService as never, batchImportService as never);
  });

  it("covers CRUD endpoints", async () => {
    classesService.create.mockResolvedValue({ id: "c1" });
    classesService.findAll.mockResolvedValue({ classes: [{ id: "c1" }], total: 1 });
    classesService.findOne.mockResolvedValue({ id: "c1" });
    classesService.update.mockResolvedValue({ id: "c1", name: "Updated" });
    classesService.remove.mockResolvedValue(undefined);
    classesService.bulkDelete.mockResolvedValue(undefined);

    await expect(controller.create({ name: "A" } as any)).resolves.toEqual({ id: "c1" });
    await expect(controller.findAll({ page: 1 } as any)).resolves.toEqual({ classes: [{ id: "c1" }], total: 1 });
    await expect(controller.findOne("c1")).resolves.toEqual({ id: "c1" });
    await expect(controller.update("c1", { name: "Updated" } as any)).resolves.toEqual({ id: "c1", name: "Updated" });
    await expect(controller.remove("c1")).resolves.toBeUndefined();
    await expect(controller.bulkDelete({ ids: ["c1", "c2"] } as any)).resolves.toEqual({ message: "Đã xóa thành công 2 lớp học", deletedCount: 2 });
  });

  it("covers import and batch endpoints", async () => {
    const res = { setHeader: jest.fn(), send: jest.fn() } as any;
    importService.generateTemplate.mockResolvedValue(Buffer.from("template"));
    importService.uploadFile.mockResolvedValue({ sessionId: "s1" });
    importService.validateData.mockResolvedValue({ valid: true });
    importService.executeImport.mockResolvedValue({ imported: 2 });
    importService.getSessionStatus.mockResolvedValue({ status: "done" });
    batchImportService.processBatch.mockResolvedValue({ ok: true });
    batchImportService.getSessionSummary.mockResolvedValue({ sessionId: "s1" });

    await expect(controller.downloadTemplate(res)).resolves.toBeUndefined();
    expect(res.setHeader).toHaveBeenCalledTimes(2);

    await expect(controller.uploadImportFile({ originalname: "classes.xlsx" } as any)).resolves.toEqual({ sessionId: "s1" });
    await expect(controller.validateImportData("s1")).resolves.toEqual({ valid: true });
    await expect(controller.executeImport("s1", { skipConflicts: true })).resolves.toEqual({ imported: 2 });
    await expect(controller.getImportStatus("s1")).resolves.toEqual({ status: "done" });
    await expect(controller.importClassesBatch({ classes: [{ name: "A" }], batchInfo: { id: 1 }, options: { skipConflicts: false } } as any)).resolves.toEqual({ ok: true });
    await expect(controller.getBatchImportStatus("s1")).resolves.toEqual({ sessionId: "s1" });
  });
});