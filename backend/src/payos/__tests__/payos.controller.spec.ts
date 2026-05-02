import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { HttpException } from '@nestjs/common';

import { PayOSController } from '../payos.controller';

describe('PayOSController', () => {
  let payosService: any;
  let paymentHistoryService: any;
  let controller: PayOSController;

  beforeEach(() => {
    payosService = {
      getPayOSConfig: jest.fn(),
      createPaymentLink: jest.fn(),
      getPaymentLinkInformation: jest.fn(),
    };
    paymentHistoryService = {
      createPaymentRecord: jest.fn(),
      findByOrderCode: jest.fn(),
    };

    controller = new PayOSController(payosService as any, paymentHistoryService as any);
  });

  it('should create payment link and persist payment history', async () => {
    payosService.getPayOSConfig.mockResolvedValue({
      clientId: 'client-1',
      apiKey: 'api-1',
      checksumKey: 'checksum-1',
    });
    paymentHistoryService.createPaymentRecord.mockResolvedValue({ id: 'history-1' });
    payosService.createPaymentLink.mockResolvedValue({
      checkoutUrl: 'https://checkout.example',
      qrCode: 'qr-data',
    });

    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    process.env.FRONTEND_URL = 'http://frontend.test';

    await expect(
      controller.createPaymentLink({
        campaignId: 'campaign-1',
        assignmentId: 'assignment-1',
        amount: 50000,
      }),
    ).resolves.toEqual({
      success: true,
      data: {
        orderCode: 211111,
        checkoutUrl: 'https://checkout.example',
        qrCode: 'qr-data',
        amount: 50000,
        description: 'Thanh toan ma 211111',
        paymentHistoryId: 'history-1',
      },
    });

    expect(paymentHistoryService.createPaymentRecord).toHaveBeenCalledWith({
      assignmentId: 'assignment-1',
      amount: 50000,
      orderCode: 211111,
      clientId: 'client-1',
      apiKey: 'api-1',
      checksumKey: 'checksum-1',
    });
  });

  it('should throw a server error when payment link creation fails', async () => {
    payosService.getPayOSConfig.mockRejectedValue(new Error('config failed'));

    await expect(
      controller.createPaymentLink({
        campaignId: 'campaign-1',
        assignmentId: 'assignment-1',
        amount: 50000,
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('should check payment status and return provider info', async () => {
    paymentHistoryService.findByOrderCode.mockResolvedValue({
      assignment: { campaign: { id: 'campaign-1' } },
    });
    payosService.getPaymentLinkInformation.mockResolvedValue({
      status: 'PAID',
    });

    await expect(controller.checkPaymentStatus('123456')).resolves.toEqual({
      status: 'PAID',
    });

    expect(paymentHistoryService.findByOrderCode).toHaveBeenCalledWith(123456);
    expect(payosService.getPaymentLinkInformation).toHaveBeenCalledWith(123456, 'campaign-1');
  });

  it('should reject invalid order codes and missing payment history', async () => {
    await expect(controller.checkPaymentStatus('abc')).rejects.toBeInstanceOf(HttpException);

    paymentHistoryService.findByOrderCode.mockResolvedValue(null);
    await expect(controller.checkPaymentStatus('123456')).rejects.toBeInstanceOf(HttpException);

    paymentHistoryService.findByOrderCode.mockResolvedValue({ assignment: {} });
    await expect(controller.checkPaymentStatus('123456')).rejects.toBeInstanceOf(HttpException);
  });
});
