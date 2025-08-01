import { 
  PaymentTransaction, 
  CreatePaymentTransactionDto,
  ApiResponse
} from '../types';

const API_BASE = '/api/payment/transactions';

class PaymentTransactionService {
  // Create payment transaction
  async createTransaction(data: CreatePaymentTransactionDto): Promise<ApiResponse<PaymentTransaction>> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return response.json();
  }

  // Get transaction by ID
  async getTransaction(id: string): Promise<ApiResponse<PaymentTransaction>> {
    const response = await fetch(`${API_BASE}/${id}`);
    return response.json();
  }

  // Get transaction by order code
  async getTransactionByOrderCode(orderCode: number): Promise<ApiResponse<PaymentTransaction>> {
    const response = await fetch(`${API_BASE}/order/${orderCode}`);
    return response.json();
  }

  // Check payment status via PayOS
  async checkPaymentStatus(orderCode: number): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/${orderCode}/status`);
    return response.json();
  }

  // Cancel payment transaction
  async cancelTransaction(orderCode: number, reason?: string): Promise<ApiResponse<PaymentTransaction>> {
    const response = await fetch(`${API_BASE}/${orderCode}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });
    return response.json();
  }

  // Get transactions by assignment
  async getTransactionsByAssignment(assignmentId: string): Promise<ApiResponse<PaymentTransaction[]>> {
    const response = await fetch(`${API_BASE}/assignment/${assignmentId}`);
    return response.json();
  }

  // Get transaction statistics
  async getTransactionStatistics(filters?: {
    campaignId?: string;
    organizationId?: string;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (filters?.campaignId) params.append('campaignId', filters.campaignId);
    if (filters?.organizationId) params.append('organizationId', filters.organizationId);

    const response = await fetch(`${API_BASE}/statistics?${params}`);
    return response.json();
  }

  // Real-time status polling
  async pollPaymentStatus(
    orderCode: number, 
    options: {
      interval?: number;
      maxAttempts?: number;
      onStatusChange?: (status: string) => void;
      stopConditions?: string[];
    } = {}
  ): Promise<PaymentTransaction | null> {
    const { 
      interval = 5000, 
      maxAttempts = 60, 
      onStatusChange,
      stopConditions = ['PAID', 'FAILED', 'CANCELLED']
    } = options;

    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;
          
          const result = await this.checkPaymentStatus(orderCode);
          
          if (result.success && result.data?.transaction) {
            const transaction = result.data.transaction;
            onStatusChange?.(transaction.status);

            if (stopConditions.includes(transaction.status) || attempts >= maxAttempts) {
              resolve(transaction);
              return;
            }
          }

          if (attempts >= maxAttempts) {
            resolve(null);
            return;
          }

          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  // Check payment status
  async getPaymentStatus(orderCode: number): Promise<ApiResponse<{
    status: string;
    amount: number;
    description: string;
    accountNumber?: string;
    reference?: string;
  }>> {
    const response = await fetch(`${API_BASE}/payments/${orderCode}/status`);
    if (!response.ok) {
      throw new Error('Failed to get payment status');
    }
    return response.json();
  }

  // Cancel payment
  async cancelPayment(orderCode: number, reason?: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE}/payments/${orderCode}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel payment');
    }
    return response.json();
  }

  // Get QR code for transaction
  async getQRCode(transactionId: string): Promise<ApiResponse<{ qrCode: string }>> {
    const response = await fetch(`${API_BASE}/payments/qr-code/${transactionId}`);
    if (!response.ok) {
      throw new Error('Failed to get QR code');
    }
    return response.json();
  }

  // Get transaction by ID
  async getTransactionById(id: string): Promise<ApiResponse<PaymentTransaction>> {
    const response = await fetch(`${API_BASE}/payment-transactions/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch transaction');
    }
    return response.json();
  }
}

export const paymentTransactionService = new PaymentTransactionService();
