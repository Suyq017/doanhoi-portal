import { apiClient } from '../../../shared/services/apiClient';

export interface CreatePaymentRequest {
  assignmentId: string;
  amount: number;
  returnUrl: string;
  cancelUrl: string;
}

// PayOS API Interfaces
export interface CreatePaymentLinkRequest {
  assignmentId: string;  // Required for creating payment history
  campaignId: string;   // Campaign ID for PayOS config
  amount: number;
  description: string;
  organizationId: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreatePaymentLinkResponse {
  success: boolean;
  data?: {
    orderCode: number;
    checkoutUrl: string;
    qrCode?: string;
    amount: number;
    description: string;
  };
  message?: string;
  assignmentId?: string; // Added to match the backend response
}

export interface PaymentResponse {
  qrCode: string;
  orderCode: string;
  amount: number;
  description?: string;
  paymentUrl?: string;
}

export interface PaymentStatusResponse {
  id: string;
  orderCode: number;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  transactions?: Array<{
    reference: string;
    amount: number;
    accountNumber: string;
    description: string;
    transactionDateTime: string;
  }>;
}

class PaymentService {
  private baseUrl = '/payment';

  // PayOS Service Methods
  async createPaymentLink(data: CreatePaymentLinkRequest): Promise<CreatePaymentLinkResponse> {
    const backendUrl = import.meta.env.VITE_BACKEND_API_URL || '/api';
    const response = await fetch(`${backendUrl}/payment/create-payment-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Không thể tạo link thanh toán');
    }

    return response.json();
  }

  async checkPaymentStatus(orderCode: string): Promise<PaymentStatusResponse> {
    const backendUrl = import.meta.env.VITE_BACKEND_API_URL || '/api';
    const response = await fetch(`${backendUrl}/payment/check-status/${orderCode}`);

    if (!response.ok) {
      throw new Error('Không thể kiểm tra trạng thái thanh toán');
    }

    return response.json();
  }

  // Legacy methods (giữ lại cho compatibility)
  async createPayment(data: CreatePaymentRequest): Promise<PaymentResponse> {
    const response = await apiClient.post<PaymentResponse>(`${this.baseUrl}/create`, data);
    return response;
  }

  async processPayment(orderCode: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/process/${orderCode}`);
  }

  async getPaymentHistory(params?: {
    page?: number;
    limit?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    transactions: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Build query string manually for GET request
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const url = queryParams.toString()
      ? `${this.baseUrl}/history?${queryParams.toString()}`
      : `${this.baseUrl}/history`;

    const response = await apiClient.get<{
      transactions: any[];
      total: number;
      page: number;
      totalPages: number;
    }>(url);
    return response;
  }

  async cancelPayment(orderCode: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/cancel/${orderCode}`);
  }
}

export const paymentService = new PaymentService();
