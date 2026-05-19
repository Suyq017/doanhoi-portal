import { DepartmentsController } from '../departments.controller';

describe('DepartmentsController', () => {
  const departmentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    bulkRemove: jest.fn(),
    remove: jest.fn(),
    validateDepartmentCodes: jest.fn(),
  } as any;

  const importService = {
    generateTemplate: jest.fn(),
    uploadFile: jest.fn(),
    validateData: jest.fn(),
    executeImport: jest.fn(),
    getSessionStatus: jest.fn(),
  } as any;

  let controller: DepartmentsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DepartmentsController(departmentsService, importService);
  });

  it('delegates CRUD methods', async () => {
    departmentsService.create.mockReturnValue({ id: '1' });
    departmentsService.findAll.mockReturnValue({ data: [] });
    departmentsService.findOne.mockReturnValue({ id: '1' });
    departmentsService.update.mockReturnValue({ id: '1', name: 'new' });
    departmentsService.bulkRemove.mockResolvedValue({ deleted: 2 });
    departmentsService.remove.mockReturnValue({ deleted: true });

    expect(controller.create({} as any)).toEqual({ id: '1' });
    expect(controller.findAll({} as any)).toEqual({ data: [] });
    expect(controller.findOne('1')).toEqual({ id: '1' });
    expect(controller.update('1', {} as any)).toEqual({ id: '1', name: 'new' });
    await expect(controller.bulkRemove({ ids: ['1', '2'] } as any)).resolves.toEqual({ deleted: 2 });
    expect(controller.remove('1')).toEqual({ deleted: true });
  });

  it('downloads template and sets response headers', async () => {
    const buffer = Buffer.from('xlsx');
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as any;
    importService.generateTemplate.mockResolvedValue(buffer);

    await controller.downloadTemplate(res);

    expect(res.setHeader).toHaveBeenCalledTimes(2);
    expect(res.send).toHaveBeenCalledWith(buffer);
  });

  it('delegates import flow methods', async () => {
    importService.uploadFile.mockResolvedValue({ sessionId: 's1' });
    importService.validateData.mockResolvedValue({ valid: true });
    importService.executeImport.mockResolvedValue({ imported: 10 });
    importService.getSessionStatus.mockResolvedValue({ status: 'done' });

    await expect(controller.uploadImportFile({} as any)).resolves.toEqual({ sessionId: 's1' });
    await expect(controller.validateImportData('s1')).resolves.toEqual({ valid: true });
    await expect(controller.executeImport('s1', { batchSize: 10 })).resolves.toEqual({ imported: 10 });
    await expect(controller.getImportStatus('s1')).resolves.toEqual({ status: 'done' });
  });

  it('delegates department code validation', async () => {
    departmentsService.validateDepartmentCodes.mockResolvedValue({ validCodes: ['KTPM'] });

    await expect(controller.validateDepartmentCodes({ codes: ['KTPM'] })).resolves.toEqual({
      validCodes: ['KTPM'],
    });
  });
});
