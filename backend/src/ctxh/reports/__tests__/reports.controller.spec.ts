import { describe, expect, it, beforeEach, jest } from '@jest/globals';

import { ReportsController } from '../reports.controller';

describe('ReportsController', () => {
  let reportsService: {
    getStudentReportByCode: jest.Mock;
    getSystemReport: jest.Mock;
  };
  let controller: ReportsController;

  beforeEach(() => {
    reportsService = {
      getStudentReportByCode: jest.fn(),
      getSystemReport: jest.fn(),
    };

    controller = new ReportsController(reportsService as any);
  });

  it('should return student and system reports', async () => {
    reportsService.getStudentReportByCode.mockResolvedValue({ studentCode: '2150001' });
    reportsService.getSystemReport.mockResolvedValue({ totalActivities: 5 });

    await expect(controller.getStudentReport('2150001')).resolves.toEqual({ studentCode: '2150001' });
    await expect(controller.getSystemReport()).resolves.toEqual({ totalActivities: 5 });
  });
});
