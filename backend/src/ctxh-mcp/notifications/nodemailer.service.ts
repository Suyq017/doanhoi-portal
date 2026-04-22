import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface ApprovalEmailData {
  bcc: string;
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
    this.logger.log('Nodemailer transporter initialized');
  }

  async sendApprovalEmail(data: ApprovalEmailData): Promise<boolean> {
    const { bcc, activityName, activityStartDate, activityLocation, totalDays, customMessage } = data;

    if (!bcc.length) return true;

    const formattedDate = activityStartDate
      ? new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          dateStyle: 'full',
          timeStyle: 'short',
        }).format(new Date(activityStartDate))
      : 'Chưa cập nhật';

    const infoRows = [
      `<tr><td style="padding:6px 0;color:#555;">Tên hoạt động</td><td style="padding:6px 0;font-weight:bold;">${activityName}</td></tr>`,
      `<tr><td style="padding:6px 0;color:#555;">Thời gian bắt đầu</td><td style="padding:6px 0;">${formattedDate}</td></tr>`,
      activityLocation ? `<tr><td style="padding:6px 0;color:#555;">Địa điểm</td><td style="padding:6px 0;">${activityLocation}</td></tr>` : '',
      `<tr><td style="padding:6px 0;color:#555;">Số ngày CTXH</td><td style="padding:6px 0;">${totalDays} ngày</td></tr>`,
    ].filter(Boolean).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#1a73e8;">Xác nhận Đăng ký Hoạt động CTXH</h2>
        <p>Đăng ký của bạn vào hoạt động <strong>"${activityName}"</strong> đã được <strong style="color:#2e7d32;">CHẤP THUẬN</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">${infoRows}</table>
        ${customMessage ? `<div style="margin-top:16px;padding:12px 16px;background:#f1f8e9;border-left:4px solid #66bb6a;border-radius:4px;white-space:pre-line;">${customMessage}</div>` : ''}
        <hr style="margin:24px 0;" />
        <p style="font-size:12px;color:#666;">
          Email này được gửi tự động từ Hệ thống Quản lý CTXH. Vui lòng không reply trực tiếp.
        </p>
      </div>`;

    const senderAddress = this.configService.get<string>('MAIL_USER');

    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get('MAIL_FROM_NAME', 'Hệ thống CTXH')}" <${senderAddress}>`,
        to: senderAddress,
        bcc: bcc,
        subject: `[CTXH] Đăng ký hoạt động "${activityName}" đã được duyệt`,
        html,
      });
      this.logger.log(`Approval email sent (bcc: "${bcc}") | activity: "${activityName}"`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send approval email: ${error.message}`);
      return false;
    }
  }
}
