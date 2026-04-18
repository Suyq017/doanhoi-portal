import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface ApprovalEmailData {
  to: string;
  studentName: string;
  activityName: string;
  activityStartDate: Date | null;
  activityLocation: string | null;
  totalDays: number;
  customMessage?: string;
}

@Injectable()
export class NodemailerService implements OnModuleInit {
  private readonly logger = new Logger(NodemailerService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT', 587),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
    this.logger.log('✅ Nodemailer transporter initialized');
  }

  async sendApprovalEmail(data: ApprovalEmailData): Promise<boolean> {
    const { to, studentName, activityName, activityStartDate, activityLocation, totalDays, customMessage } = data;

    const formattedDate = activityStartDate
      ? new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          dateStyle: 'full',
          timeStyle: 'short',
        }).format(new Date(activityStartDate))
      : 'Chưa cập nhật';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#1a73e8;">✅ Xác nhận Đăng ký Hoạt động CTXH</h2>
        <p>Chào <strong>${studentName}</strong>,</p>
        <p>Đăng ký của bạn vào hoạt động <strong>"${activityName}"</strong> đã được <strong>CHẤP THUẬN</strong>.</p>
        <table style="border-collapse:collapse;width:100%;">
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Hoạt động</strong></td>
              <td style="padding:8px;border:1px solid #ddd;">${activityName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Thời gian bắt đầu</strong></td>
              <td style="padding:8px;border:1px solid #ddd;">${formattedDate}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Địa điểm</strong></td>
              <td style="padding:8px;border:1px solid #ddd;">${activityLocation ?? 'Chưa cập nhật'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Số ngày CTXH</strong></td>
              <td style="padding:8px;border:1px solid #ddd;">${totalDays} ngày</td></tr>
        </table>
        ${customMessage ? `<p style="margin-top:16px;"><em>${customMessage}</em></p>` : ''}
        <hr style="margin:24px 0;" />
        <p style="font-size:12px;color:#666;">
          Email này được gửi tự động từ Hệ thống Quản lý CTXH. Vui lòng không reply trực tiếp.
        </p>
      </div>`;

    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get('MAIL_FROM_NAME', 'Hệ thống CTXH')}" <${this.configService.get('MAIL_USER')}>`,
        to,
        subject: `[CTXH] Đăng ký hoạt động "${activityName}" đã được duyệt`,
        html,
      });
      this.logger.log(`Email sent → ${to} | activity: "${activityName}"`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false; // không throw — lỗi email không block business logic
    }
  }
}
