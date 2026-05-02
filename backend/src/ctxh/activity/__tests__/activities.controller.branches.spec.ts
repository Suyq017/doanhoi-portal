import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { ActivitiesController } from '../activities.controller';

describe('ActivitiesController Branches', () => {
  let activitiesService: any;
  let participationService: any;
  let excelService: any;
  let controller: ActivitiesController;

  beforeEach(() => {
    activitiesService = {
      findOne: jest.fn(),
    };
    participationService = {
      gradeParticipation: jest.fn(),
      bulkGradeFromExcel: jest.fn(),
      addStudent: jest.fn(),
      findByActivity: jest.fn(),
    };
    excelService = {
      processGradingExcel: jest.fn(),
    };

    controller = new ActivitiesController(
      activitiesService as any,
      participationService as any,
      excelService as any,
    );
  });

  it('should reject gradeParticipants when activity status is invalid', async () => {
    activitiesService.findOne.mockResolvedValue({ status: 'DRAFT', total_days: 5, name: 'A' });

    await expect(
      controller.gradeParticipants(
        'activity-1',
        { participants: [{ participation_id: 'p-1', actual_days: 2 }] } as any,
        { user: { id: 'user-1' } } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject gradeParticipants when total_days is invalid', async () => {
    activitiesService.findOne.mockResolvedValue({ status: 'ACTIVE', total_days: 0, name: 'A' });

    await expect(
      controller.gradeParticipants(
        'activity-1',
        { participants: [{ participation_id: 'p-1', actual_days: 2 }] } as any,
        { user: { id: 'user-1' } } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject gradeParticipants when actual_days exceeds max', async () => {
    activitiesService.findOne.mockResolvedValue({ status: 'ACTIVE', total_days: 3, name: 'A' });

    await expect(
      controller.gradeParticipants(
        'activity-1',
        { participants: [{ participation_id: 'p-1', actual_days: 4 }] } as any,
        { user: { id: 'user-1' } } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject bulkGradeFromExcel when file is missing', async () => {
    await expect(
      controller.bulkGradeFromExcel('activity-1', undefined as any, { user: { id: 'user-1' } } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject bulkGradeFromExcel when activity status is invalid', async () => {
    activitiesService.findOne.mockResolvedValue({ status: 'CANCELLED', total_days: 3, name: 'A' });

    await expect(
      controller.bulkGradeFromExcel('activity-1', { originalname: 'grades.xlsx' } as any, { user: { id: 'user-1' } } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject bulkGradeFromExcel when total_days is invalid', async () => {
    activitiesService.findOne.mockResolvedValue({ status: 'ACTIVE', total_days: 0, name: 'A' });

    await expect(
      controller.bulkGradeFromExcel('activity-1', { originalname: 'grades.xlsx' } as any, { user: { id: 'user-1' } } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should collect failures in addParticipantsBatch', async () => {
    participationService.addStudent
      .mockRejectedValueOnce(new Error('duplicate'))
      .mockResolvedValueOnce({ id: 'ok-1' });

    const result = await controller.addParticipantsBatch(
      'activity-1',
      { students: [{ student_code: '2150001' }, { student_code: '2150002' }] } as any,
      { user: { id: 'user-1' } } as any,
    );

    expect(result.total).toBe(2);
    expect(result.successful.length).toBe(1);
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].error).toContain('duplicate');
  });

  it('should collect failures in gradeParticipantsBatch', async () => {
    activitiesService.findOne.mockResolvedValue({ status: 'ACTIVE', total_days: 3, name: 'A' });
    participationService.gradeParticipation
      .mockResolvedValueOnce({ id: 'graded-1' })
      .mockResolvedValueOnce({ id: 'graded-2' });

    const result = await controller.gradeParticipantsBatch(
      'activity-1',
      {
        participants: [
          { participation_id: 'p-1', actual_days: 2 },
          { participation_id: 'p-2', actual_days: 5 },
        ],
      } as any,
      { user: { id: 'user-1' } } as any,
    );

    expect(result.total).toBe(2);
    expect(result.successful.length).toBe(1);
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].error).toContain('vượt quá giới hạn');
  });
});
