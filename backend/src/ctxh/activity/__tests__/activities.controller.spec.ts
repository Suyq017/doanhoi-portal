jest.mock('../../../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class {},
}));

jest.mock('../../../auth/guards/permission.guard', () => ({
  PermissionGuard: class {},
}));

jest.mock('../../../auth/decorators/permissions.decorator', () => ({
  RequirePermissions: () => () => undefined,
}));

jest.mock('../activities.service', () => ({
  ActivitiesService: class {},
}));

jest.mock('../services/participation.service', () => ({
  ParticipationService: class {},
}));

jest.mock('../services/excel.service', () => ({
  ExcelService: class {},
}));

import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { ActivitiesController } from '../activities.controller';

describe('ActivitiesController', () => {
  let activitiesService: any;
  let participationService: any;
  let excelService: any;
  let controller: ActivitiesController;

  beforeEach(() => {
    activitiesService = {
      create: jest.fn() as any,
      findAll: jest.fn() as any,
      findOne: jest.fn() as any,
      update: jest.fn() as any,
      remove: jest.fn() as any,
      restore: jest.fn() as any,
    };
    participationService = {
      findByActivity: jest.fn() as any,
      findPendingByActivity: jest.fn() as any,
      registerSelf: jest.fn() as any,
      cancelSelfRegistration: jest.fn() as any,
      approveParticipation: jest.fn() as any,
      approveParticipationsBatch: jest.fn() as any,
      addStudent: jest.fn() as any,
      addMultipleStudents: jest.fn() as any,
      gradeParticipation: jest.fn() as any,
      bulkGradeFromExcel: jest.fn() as any,
      removeParticipant: jest.fn() as any,
    };
    excelService = {
      generateParticipantsTemplate: jest.fn() as any,
      processParticipantsExcel: jest.fn() as any,
      validateStudentCodes: jest.fn() as any,
      generateGradingTemplate: jest.fn() as any,
      processGradingExcel: jest.fn() as any,
      exportParticipants: jest.fn() as any,
    };
    controller = new ActivitiesController(
      activitiesService as any,
      participationService as any,
      excelService as any,
    );
    (global as any).uploadSessions = new Map();
  });

  afterEach(() => {
    delete (global as any).uploadSessions;
  });

  it('should cover core CRUD and participant endpoints', async () => {
    excelService.generateParticipantsTemplate.mockResolvedValue(Buffer.from('template'));
    activitiesService.create.mockResolvedValue({ id: 'activity-1' });
    activitiesService.findAll.mockResolvedValue({ data: [{ id: 'activity-1' }], total: 1 });
    activitiesService.findOne.mockResolvedValue({ id: 'activity-1', status: 'ACTIVE', total_days: 5, name: 'Hoạt động CTXH', start_date: '2026-04-29', end_date: '2026-04-30' });
    activitiesService.update.mockResolvedValue({ id: 'activity-1', updated: true });
    activitiesService.remove.mockResolvedValue(undefined);
    activitiesService.restore.mockResolvedValue({ id: 'activity-1', restored: true });
    participationService.findByActivity.mockResolvedValue([{ id: 'p-1' }]);
    participationService.findPendingByActivity.mockResolvedValue([{ id: 'p-2' }]);
    participationService.registerSelf.mockResolvedValue({ id: 'p-3' });
    participationService.cancelSelfRegistration.mockResolvedValue(undefined);
    participationService.approveParticipation.mockResolvedValue({ id: 'p-4' });
    participationService.approveParticipationsBatch.mockResolvedValue({ approved: 2 });
    participationService.addStudent.mockResolvedValue({ id: 'participant-1' });
    participationService.addMultipleStudents.mockResolvedValue({ imported: 2 });
    participationService.gradeParticipation.mockResolvedValue({ id: 'graded-1' });
    participationService.bulkGradeFromExcel.mockResolvedValueOnce({ imported: 2 });
    participationService.removeParticipant.mockResolvedValue(undefined);
    excelService.generateGradingTemplate.mockResolvedValue(Buffer.from('grading-template'));
    excelService.processParticipantsExcel.mockResolvedValue(['2150001', '2150002']);
    excelService.validateStudentCodes.mockResolvedValue({ validUsers: [{ code: '2150001' }], invalidCodes: ['9999999'] });
    excelService.processGradingExcel.mockResolvedValue([{ studentCode: '2150001', actualDays: 2 }]);
    excelService.exportParticipants.mockResolvedValue(Buffer.from('export'));

    const response = { set: jest.fn(), send: jest.fn() } as any;

    await expect(controller.downloadGenericParticipantsTemplate(response)).resolves.toBeUndefined();
    expect(response.set).toHaveBeenCalled();

    await expect(controller.create({ name: 'A' } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'activity-1' });
    await expect(controller.findAll({ user: { id: 'user-1', userType: 'student' } } as any, 2, 25, 'cat-1', 'org-1', 'ACTIVE', 'search', '2026-01-01', '2026-01-31')).resolves.toEqual({ data: [{ id: 'activity-1' }], total: 1 });
    await expect(controller.findOne('activity-1', { user: { userType: 'student' } } as any)).resolves.toEqual({ id: 'activity-1', status: 'ACTIVE', total_days: 5, name: 'Hoạt động CTXH', start_date: '2026-04-29', end_date: '2026-04-30' });
    await expect(controller.update('activity-1', { name: 'B' } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'activity-1', updated: true });
    await expect(controller.remove('activity-1', { user: { id: 'user-1' } } as any)).resolves.toBeUndefined();
    await expect(controller.restore('activity-1', { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'activity-1', restored: true });

    await expect(controller.debugActivity('activity-1')).resolves.toEqual({
      id: 'activity-1',
      name: 'Hoạt động CTXH',
      total_days: 5,
      start_date: '2026-04-29',
      end_date: '2026-04-30',
      status: 'ACTIVE',
    });

    await expect(controller.getParticipants('activity-1')).resolves.toEqual([{ id: 'p-1' }]);
    await expect(controller.getPendingParticipants('activity-1')).resolves.toEqual([{ id: 'p-2' }]);
    await expect(controller.registerSelf('activity-1', { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'p-3' });
    await expect(controller.cancelSelfRegistration('activity-1', { user: { id: 'user-1' } } as any)).resolves.toEqual({ message: 'Hủy đăng ký thành công' });
    await expect(controller.approveParticipant('activity-1', 'p-1', { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'p-4' });
    await expect(controller.approveParticipantsBatch('activity-1', { participation_ids: ['p-1', 'p-2'] } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({ approved: 2 });
    await expect(controller.addParticipantsBatch('activity-1', { students: [{ student_code: '2150001' }, { student_code: '2150002' }] } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({
      successful: [
        { student_code: '2150001', participant_id: 'participant-1' },
        { student_code: '2150002', participant_id: 'participant-1' },
      ],
      failed: [],
      total: 2,
    });
    await expect(controller.gradeParticipantsBatch('activity-1', { participants: [{ participation_id: 'p-1', actual_days: 2 }] } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({
      successful: [
        { participation_id: 'p-1', actual_days: 2, graded_participant: { id: 'graded-1' } },
      ],
      failed: [],
      total: 1,
    });
    await expect(controller.addStudent('activity-1', { student_code: '2150001' } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'participant-1' });
    await expect(controller.downloadGradingTemplate('activity-1', response)).resolves.toBeUndefined();
    await expect(controller.removeParticipant('activity-1', 'p-1', { user: { id: 'user-1' } } as any)).resolves.toBeUndefined();
  });

  it('should handle upload, validation, execution and export flows', async () => {
    activitiesService.findOne.mockResolvedValue({ id: 'activity-1', status: 'ACTIVE', total_days: 5, name: 'Hoạt động CTXH' });
    participationService.findByActivity.mockResolvedValue([{ student_code: '2150001', student: { full_name: 'Nguyen Van A' } }]);
    excelService.processParticipantsExcel.mockResolvedValue(['2150001']);
    participationService.addMultipleStudents.mockResolvedValue({ imported: 2 });
    participationService.gradeParticipation.mockResolvedValue({ id: 'graded-1' });
    excelService.processGradingExcel.mockResolvedValue([{ studentCode: '2150001', actualDays: 3, errors: [] }]);
    excelService.validateStudentCodes.mockResolvedValue({ validUsers: [{ code: '2150001', familyName: 'Nguyen', givenName: 'Van A', email: 'a@example.com', fullName: 'Nguyen Van A' }], invalidCodes: [] });
    participationService.bulkGradeFromExcel.mockResolvedValue({ imported: 2 });
    participationService.addStudent.mockResolvedValue({ id: 'participant-1' });
    excelService.exportParticipants.mockResolvedValue(Buffer.from('export'));

    await expect(controller.uploadParticipants('activity-1', undefined as any, { user: { id: 'user-1' } } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.uploadParticipants('activity-1', { originalname: 'students.xlsx' } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({ imported: 2 });

    await expect(controller.gradeParticipants('activity-1', { participants: [{ participation_id: 'p-1', actual_days: 3 }] } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual([
      { id: 'graded-1' },
    ]);

    await expect(controller.bulkGradeFromExcel('activity-1', undefined as any, { user: { id: 'user-1' } } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.bulkGradeFromExcel('activity-1', { originalname: 'grades.xlsx' } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({ imported: 2 });

    const studentSessionResult = await controller.uploadParticipantsFile('activity-1', { originalname: 'students.xlsx' } as any, {} as any);
    expect(studentSessionResult).toEqual({
      sessionId: expect.any(String),
      fileName: 'students.xlsx',
      totalRows: 1,
      message: 'File uploaded and processed successfully',
    });

    const [studentSessionId] = Array.from((global as any).uploadSessions.keys()) as string[];
    await expect(controller.validateImportSession(studentSessionId)).resolves.toMatchObject({
      sessionId: studentSessionId,
      isValid: true,
      summary: { total: 1, valid: 1, invalid: 0 },
    });

    await expect(controller.executeImport(studentSessionId, {}, { user: { id: 'user-1' } } as any)).resolves.toMatchObject({
      sessionId: studentSessionId,
      success: true,
      importedCount: 1,
    });

    const gradingSessionResult = await controller.uploadGradingFile('activity-1', { originalname: 'grades.xlsx' } as any, {} as any);
    expect(gradingSessionResult).toEqual({
      sessionId: expect.any(String),
      fileName: 'grades.xlsx',
      totalRows: 1,
      message: 'Grading file uploaded and processed successfully',
    });

    const gradingSessionId = Array.from((global as any).uploadSessions.keys()).pop() as string;
    await expect(controller.validateImportSession(gradingSessionId)).resolves.toMatchObject({
      sessionId: gradingSessionId,
      isValid: true,
    });
    // bulkGradeFromExcel returns different shapes depending on call context; ensure next call returns successful/failed
    participationService.bulkGradeFromExcel.mockResolvedValueOnce({ successful: [{ studentCode: '2150001' }], failed: [] } as any);
    await expect(controller.executeImport(gradingSessionId, {}, { user: { id: 'user-1' } } as any)).resolves.toMatchObject({
      sessionId: gradingSessionId,
      success: true,
      importedCount: 1,
    });

    const response = { set: jest.fn(), send: jest.fn() } as any;
    await expect(controller.exportParticipants('activity-1', response)).resolves.toBeUndefined();
    expect(response.set).toHaveBeenCalled();
  });
});
