import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { ImportService } from '../services/import.service';
import { BatchImportService } from '../services/batch-import.service';
import { RolesService } from '../../roles/roles.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;
  let importService: jest.Mocked<ImportService>;
  let batchImportService: jest.Mocked<BatchImportService>;
  let rolesService: jest.Mocked<RolesService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    code: 'U001',
    membershipStatus: 'doan_vien',
  };

  const mockRole = {
    id: 'role-1',
    name: 'Admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByExactCode: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            removeMultiple: jest.fn(),
            getUsersWithDefaultPassword: jest.fn(),
          },
        },
        {
          provide: ImportService,
          useValue: {
            generateTemplate: jest.fn(),
            uploadFile: jest.fn(),
            validateData: jest.fn(),
            executeImport: jest.fn(),
            getSessionStatus: jest.fn(),
            getImportProgress: jest.fn(),
            pauseImport: jest.fn(),
            resumeImport: jest.fn(),
            cancelImport: jest.fn(),
          },
        },
        {
          provide: BatchImportService,
          useValue: {
            validateParsedData: jest.fn(),
            processBatch: jest.fn(),
            getSessionSummary: jest.fn(),
            clearSession: jest.fn(),
          },
        },
        {
          provide: RolesService,
          useValue: {
            getAllRoles: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    importService = module.get(ImportService) as jest.Mocked<ImportService>;
    batchImportService = module.get(BatchImportService) as jest.Mocked<BatchImportService>;
    rolesService = module.get(RolesService) as jest.Mocked<RolesService>;
  });

  describe('CRUD Operations', () => {
    it('should create a new user', async () => {
      usersService.create.mockResolvedValue(mockUser);
      const createUserDto = { email: 'test@example.com', fullName: 'Test User' };

      const result = await controller.create(createUserDto);

      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });

    it('should find all users with query parameters', async () => {
      const mockResponse = { users: [mockUser], total: 1, page: 1, limit: 10 };
      usersService.findAll.mockResolvedValue(mockResponse);
      const queryUserDto = { page: 1, limit: 10 };

      const result = await controller.findAll(queryUserDto);

      expect(usersService.findAll).toHaveBeenCalledWith(queryUserDto);
      expect(result).toEqual(mockResponse);
    });

    it('should find user by id', async () => {
      usersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-1');

      expect(usersService.findOne).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockUser);
    });

    it('should find user by exact code', async () => {
      usersService.findByExactCode.mockResolvedValue(mockUser);

      const result = await controller.findByCode('U001');

      expect(usersService.findByExactCode).toHaveBeenCalledWith('U001');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user code not found', async () => {
      usersService.findByExactCode.mockResolvedValue(null);

      await expect(controller.findByCode('NONEXISTENT')).rejects.toThrow(NotFoundException);
    });

    it('should update a user', async () => {
      const updatedUser = { ...mockUser, fullName: 'Updated Name' };
      usersService.update.mockResolvedValue(updatedUser);
      const updateUserDto = { fullName: 'Updated Name' };

      const result = await controller.update('user-1', updateUserDto);

      expect(usersService.update).toHaveBeenCalledWith('user-1', updateUserDto);
      expect(result).toEqual(updatedUser);
    });

    it('should delete a user', async () => {
      usersService.remove.mockResolvedValue({ message: 'User deleted' });

      const result = await controller.remove('user-1');

      expect(usersService.remove).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'User deleted' });
    });

    it('should bulk delete multiple users', async () => {
      usersService.removeMultiple.mockResolvedValue(null);
      const bulkDeleteDto = { ids: ['user-1', 'user-2', 'user-3'] };

      const result = await controller.bulkDelete(bulkDeleteDto);

      expect(usersService.removeMultiple).toHaveBeenCalledWith(['user-1', 'user-2', 'user-3']);
      expect(result.deletedCount).toBe(3);
    });
  });

  describe('Template and Download Operations', () => {
    it('should download template as Excel file', async () => {
      const mockBuffer = Buffer.from('mock excel data');
      importService.generateTemplate.mockResolvedValue(mockBuffer);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as any;

      await controller.downloadTemplate(mockRes);

      expect(importService.generateTemplate).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="mau_danh_sach_thanh_vien.xlsx"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should get users with default password', async () => {
      const usersWithDefaultPassword = [{ id: 'user-1', email: 'test@example.com' }];
      usersService.getUsersWithDefaultPassword.mockResolvedValue(usersWithDefaultPassword);

      const result = await controller.getUsersWithDefaultPassword();

      expect(usersService.getUsersWithDefaultPassword).toHaveBeenCalled();
      expect(result).toEqual(usersWithDefaultPassword);
    });

    it('should get available roles', async () => {
      const roles = [mockRole];
      rolesService.getAllRoles.mockResolvedValue(roles);

      const result = await controller.getAvailableRoles();

      expect(rolesService.getAllRoles).toHaveBeenCalled();
      expect(result).toEqual(roles);
    });
  });

  describe('Import File Operations', () => {
    it('should upload import file', async () => {
      const mockFile = {
        originalname: 'users.xlsx',
        buffer: Buffer.from('file content'),
        size: 1024,
      } as any;
      const importResponse = { sessionId: 'session-1', status: 'uploaded' };
      importService.uploadFile.mockResolvedValue(importResponse);

      const result = await controller.uploadImportFile(mockFile);

      expect(importService.uploadFile).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(importResponse);
    });

    it('should validate import data', async () => {
      const validationResult = { isValid: true, errors: [], warnings: [] };
      importService.validateData.mockResolvedValue(validationResult);

      const result = await controller.validateImportData('session-1');

      expect(importService.validateData).toHaveBeenCalledWith('session-1');
      expect(result).toEqual(validationResult);
    });

    it('should execute import', async () => {
      const executeResult = { importedCount: 100, errorCount: 0 };
      importService.executeImport.mockResolvedValue(executeResult);
      const options = { skipConflicts: true, batchSize: 50 };

      const result = await controller.executeImport('session-1', options);

      expect(importService.executeImport).toHaveBeenCalledWith('session-1', options);
      expect(result).toEqual(executeResult);
    });

    it('should get import session status', async () => {
      const sessionStatus = { sessionId: 'session-1', status: 'completed' };
      importService.getSessionStatus.mockResolvedValue(sessionStatus);

      const result = await controller.getSessionStatus('session-1');

      expect(importService.getSessionStatus).toHaveBeenCalledWith('session-1');
      expect(result).toEqual(sessionStatus);
    });

    it('should get import progress', async () => {
      const progress = { processed: 50, total: 100, percentage: 50 };
      importService.getImportProgress.mockResolvedValue(progress);

      const result = await controller.getImportProgress('session-1');

      expect(importService.getImportProgress).toHaveBeenCalledWith('session-1');
      expect(result).toEqual(progress);
    });

    it('should pause import', async () => {
      const pauseResult = { status: 'paused' };
      importService.pauseImport.mockResolvedValue(pauseResult);

      const result = await controller.pauseImport('session-1');

      expect(importService.pauseImport).toHaveBeenCalledWith('session-1');
      expect(result).toEqual(pauseResult);
    });

    it('should resume import', async () => {
      const resumeResult = { status: 'running' };
      importService.resumeImport.mockResolvedValue(resumeResult);

      const result = await controller.resumeImport('session-1');

      expect(importService.resumeImport).toHaveBeenCalledWith('session-1');
      expect(result).toEqual(resumeResult);
    });

    it('should cancel import', async () => {
      const cancelResult = { status: 'cancelled' };
      importService.cancelImport.mockResolvedValue(cancelResult);

      const result = await controller.cancelImport('session-1');

      expect(importService.cancelImport).toHaveBeenCalledWith('session-1');
      expect(result).toEqual(cancelResult);
    });
  });

  describe('Batch Import Operations', () => {
    it('should validate batch data', async () => {
      const validationResult = {
        isValid: true,
        validRecords: [],
        invalidRecords: [],
      };
      batchImportService.validateParsedData.mockResolvedValue(validationResult);
      const batchData = {
        users: [{ email: 'user1@example.com' }],
        pagination: { errorPage: 1, errorLimit: 10 },
      };

      const result = await controller.validateBatchData(batchData);

      expect(batchImportService.validateParsedData).toHaveBeenCalledWith(
        batchData.users,
        batchData.pagination,
      );
      expect(result).toEqual(validationResult);
    });

    it('should throw BadRequestException for invalid batch data format', async () => {
      const invalidData = { users: null };

      await expect(controller.validateBatchData(invalidData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when data is missing', async () => {
      await expect(controller.validateBatchData(null)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should process batch import', async () => {
      const batchResponse = {
        sessionId: 'session-1',
        totalProcessed: 100,
        successful: 98,
        failed: 2,
      };
      batchImportService.processBatch.mockResolvedValue(batchResponse);
      const batchRequest = {
        users: [{ email: 'user@example.com' }],
        batchInfo: { batchNumber: 1, totalBatches: 1 },
        options: { skipConflicts: false },
      };

      const result = await controller.batchImport(batchRequest);

      expect(batchImportService.processBatch).toHaveBeenCalledWith(batchRequest);
      expect(result).toEqual(batchResponse);
    });

    it('should get batch session summary', async () => {
      const sessionSummary = {
        sessionId: 'session-1',
        totalUsers: 1000,
        successful: 980,
        failed: 20,
      };
      batchImportService.getSessionSummary.mockResolvedValue(sessionSummary);

      const result = await controller.getBatchSessionSummary('session-1');

      expect(batchImportService.getSessionSummary).toHaveBeenCalledWith('session-1');
      expect(result).toEqual(sessionSummary);
    });

    it('should clear batch session', async () => {
      batchImportService.clearSession.mockReturnValue(undefined);

      const result = await controller.clearBatchSession('session-1');

      expect(batchImportService.clearSession).toHaveBeenCalledWith('session-1');
      expect(result.message).toContain('session-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle user not found error in findOne', async () => {
      usersService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle import service errors gracefully', async () => {
      importService.uploadFile.mockRejectedValue(
        new BadRequestException('Invalid file format'),
      );

      await expect(
        controller.uploadImportFile({ originalname: 'file.txt' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle batch service errors', async () => {
      batchImportService.processBatch.mockRejectedValue(
        new Error('Batch processing failed'),
      );

      await expect(
        controller.batchImport({
          users: [],
          batchInfo: { batchNumber: 1, totalBatches: 1 },
          options: {},
        }),
      ).rejects.toThrow('Batch processing failed');
    });
  });
});
