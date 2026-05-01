import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NodemailerService } from '../nodemailer.service';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('NodemailerService', () => {
  let service: NodemailerService;
  let mockConfigService: ConfigService;
  let mockTransporter: any;

  beforeEach(async () => {
    // Setup mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-123' }),
    };

    // Setup mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          MAIL_HOST: 'smtp.test.com',
          MAIL_PORT: 587,
          MAIL_SECURE: 'false',
          MAIL_USER: 'test@test.com',
          MAIL_PASSWORD: 'password',
          MAIL_FROM_NAME: 'Test System',
        };
        return (config as any)[key] ?? defaultValue;
      }),
    } as any;

    // Mock createTransport
    const nodemailer = require('nodemailer');
    nodemailer.createTransport.mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodemailerService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NodemailerService>(NodemailerService);
    service.onModuleInit();
  });

  describe('onModuleInit', () => {
    it('should initialize transporter with config values', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('MAIL_HOST');
      expect(mockConfigService.get).toHaveBeenCalledWith('MAIL_PORT');
      expect(mockConfigService.get).toHaveBeenCalledWith('MAIL_SECURE');
      expect(mockConfigService.get).toHaveBeenCalledWith('MAIL_USER');
      expect(mockConfigService.get).toHaveBeenCalledWith('MAIL_PASSWORD');
    });

    it('should create transport with correct config', () => {
      const nodemailer = require('nodemailer');
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'password',
        },
      });
    });
  });

  describe('sendApprovalEmail', () => {
    it('should return true when bcc is empty', async () => {
      const result = await service.sendApprovalEmail({
        bcc: '',
        activityName: 'Activity',
        activityStartDate: new Date(),
        activityLocation: 'Location',
        totalDays: 3,
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should send approval email with all data', async () => {
      const startDate = new Date('2024-01-15');
      const result = await service.sendApprovalEmail({
        bcc: 'student@test.com',
        activityName: 'Cleanup Activity',
        activityStartDate: startDate,
        activityLocation: 'Central Park',
        totalDays: 2,
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          bcc: 'student@test.com',
          subject: expect.stringContaining('Cleanup Activity'),
          html: expect.stringContaining('Xác nhận Đăng ký'),
        }),
      );
    });

    it('should handle null activityStartDate', async () => {
      const result = await service.sendApprovalEmail({
        bcc: 'student@test.com',
        activityName: 'Activity',
        activityStartDate: null,
        activityLocation: 'Location',
        totalDays: 1,
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should handle null activityLocation', async () => {
      const result = await service.sendApprovalEmail({
        bcc: 'student@test.com',
        activityName: 'Activity',
        activityStartDate: new Date(),
        activityLocation: null,
        totalDays: 1,
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should include custom message when provided', async () => {
      const result = await service.sendApprovalEmail({
        bcc: 'student@test.com',
        activityName: 'Activity',
        activityStartDate: new Date(),
        activityLocation: 'Location',
        totalDays: 1,
        customMessage: 'Custom note here',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Custom note here'),
        }),
      );
    });

    it('should not include custom message div when not provided', async () => {
      const result = await service.sendApprovalEmail({
        bcc: 'student@test.com',
        activityName: 'Activity',
        activityStartDate: new Date(),
        activityLocation: 'Location',
        totalDays: 1,
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.not.stringContaining('background:#f1f8e9'),
        }),
      );
    });

    it('should return false when send fails', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('SMTP error'),
      );

      const result = await service.sendApprovalEmail({
        bcc: 'student@test.com',
        activityName: 'Activity',
        activityStartDate: new Date(),
        activityLocation: 'Location',
        totalDays: 1,
      });

      expect(result).toBe(false);
    });
  });

  describe('sendRejectionEmail', () => {
    it('should return true when bcc is empty', async () => {
      const result = await service.sendRejectionEmail({
        bcc: '',
        activityName: 'Activity',
        reason: 'Invalid data',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should send rejection email', async () => {
      const result = await service.sendRejectionEmail({
        bcc: 'student@test.com',
        activityName: 'Cleanup Activity',
        reason: 'Attendance not sufficient',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          bcc: 'student@test.com',
          subject: expect.stringContaining('Cleanup Activity'),
          html: expect.stringContaining('KHÔNG ĐƯỢC CHẤP THUẬN'),
        }),
      );
    });

    it('should include rejection reason in email', async () => {
      const reason = 'Medical certificate not valid';
      const result = await service.sendRejectionEmail({
        bcc: 'student@test.com',
        activityName: 'Activity',
        reason,
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(reason),
        }),
      );
    });

    it('should return false when send fails', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('Network error'),
      );

      const result = await service.sendRejectionEmail({
        bcc: 'student@test.com',
        activityName: 'Activity',
        reason: 'Invalid',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendNotificationEmail', () => {
    it('should return true when bcc is empty', async () => {
      const result = await service.sendNotificationEmail({
        bcc: '',
        subject: 'Test Subject',
        body: 'Test body',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should send notification email without activity name', async () => {
      const result = await service.sendNotificationEmail({
        bcc: 'student@test.com',
        subject: 'System Notification',
        body: 'Important update',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          bcc: 'student@test.com',
          subject: '[CTXH] System Notification',
          html: expect.stringContaining('System Notification'),
        }),
      );
    });

    it('should send notification email with activity name', async () => {
      const result = await service.sendNotificationEmail({
        bcc: 'student@test.com',
        subject: 'Schedule Change',
        body: 'Time changed to 2pm',
        activityName: 'Cleanup Event',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '[CTXH - Cleanup Event] Schedule Change',
          html: expect.stringContaining('Cleanup Event'),
        }),
      );
    });

    it('should include formatted body in email', async () => {
      const body = 'Line 1\nLine 2\nLine 3';
      const result = await service.sendNotificationEmail({
        bcc: 'student@test.com',
        subject: 'Test',
        body,
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('pre-line'),
        }),
      );
    });

    it('should return false when send fails', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('SMTP connection failed'),
      );

      const result = await service.sendNotificationEmail({
        bcc: 'student@test.com',
        subject: 'Test',
        body: 'Test body',
      });

      expect(result).toBe(false);
    });

    it('should handle multiple bcc recipients', async () => {
      const result = await service.sendNotificationEmail({
        bcc: 'student1@test.com,student2@test.com,student3@test.com',
        subject: 'Batch Notification',
        body: 'Message for all',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          bcc: 'student1@test.com,student2@test.com,student3@test.com',
        }),
      );
    });
  });

  describe('email address handling', () => {
    it('should use configured sender address from MAIL_USER', async () => {
      const result = await service.sendApprovalEmail({
        bcc: 'student@test.com',
        activityName: 'Activity',
        activityStartDate: new Date(),
        activityLocation: 'Location',
        totalDays: 1,
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@test.com',
        }),
      );
    });
  });
});
