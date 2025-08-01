import { useState } from 'react';
import { paymentService } from '../services/paymentService';

export interface PaymentData {
  qrCode: string;
  orderCode: string;
  amount: number;
  description?: string;
  paymentUrl?: string;
}

export const usePaymentProcess = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = async (assignmentId: string, amount: number): Promise<PaymentData> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await paymentService.createPayment({
        assignmentId,
        amount,
        returnUrl: `${window.location.origin}/member/payment`,
        cancelUrl: `${window.location.origin}/member/payment`,
      });

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi tạo thanh toán';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (orderCode: string): Promise<{
    status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
    paidAt?: string;
  }> => {
    try {
      const response = await paymentService.checkPaymentStatus(orderCode);
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi kiểm tra trạng thái';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const processPayment = async (orderCode: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await paymentService.processPayment(orderCode);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi xử lý thanh toán';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createPayment,
    checkPaymentStatus,
    processPayment,
    clearError: () => setError(null),
  };
};
