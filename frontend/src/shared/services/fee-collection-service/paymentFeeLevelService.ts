import {
  PaymentFeeLevel,
  CreatePaymentFeeLevelDto,
  UpdatePaymentFeeLevelDto,
  ApiResponse
} from '../../types';

const API_BASE = '/api';

class PaymentFeeLevelService {
  // CRUD Operations
  async getFeeLevelsByCampaign(campaignId: string): Promise<ApiResponse<PaymentFeeLevel[]>> {
    const response = await fetch(`${API_BASE}/payment-fee-levels/campaign/${campaignId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch fee levels');
    }
    return response.json();
  }

  async getFeeLevelById(_campaignId: string, id: string): Promise<ApiResponse<PaymentFeeLevel>> {
    // campaignId kept for API compatibility but not used in direct fee level lookup
    const response = await fetch(`${API_BASE}/payment-fee-levels/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch fee level');
    }
    return response.json();
  }

  async createFeeLevel(campaignId: string, data: CreatePaymentFeeLevelDto): Promise<ApiResponse<PaymentFeeLevel>> {
    const response = await fetch(`${API_BASE}/payment-fee-levels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, campaignId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create fee level');
    }
    return response.json();
  }

  async updateFeeLevel(_campaignId: string, id: string, data: UpdatePaymentFeeLevelDto): Promise<ApiResponse<PaymentFeeLevel>> {
    const response = await fetch(`${API_BASE}/payment-fee-levels/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update fee level');
    }
    return response.json();
  }

  async deleteFeeLevel(_campaignId: string, id: string): Promise<undefined> {
    const response = await fetch(`${API_BASE}/payment-fee-levels/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete fee level');
    }
  }

  async setDefaultFeeLevel(_campaignId: string, id: string): Promise<ApiResponse<PaymentFeeLevel>> {
    const response = await fetch(`${API_BASE}/payment-fee-levels/${id}/set-default`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to set default fee level');
    }
    return response.json();
  }
}

export const paymentFeeLevelService = new PaymentFeeLevelService();
