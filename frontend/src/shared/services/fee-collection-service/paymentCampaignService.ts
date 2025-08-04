import { 
  PaymentCampaign, 
  CreatePaymentCampaignDto, 
  UpdatePaymentCampaignDto,
  PaymentCampaignFilters,
  ApiResponse,
  PaginatedResponse
} from '../../../features/fee-collection/types';

const API_BASE = '/api';

class PaymentCampaignService {
  // CRUD Operations
  async getPaymentCampaigns(filters: PaymentCampaignFilters = {}): Promise<PaginatedResponse<PaymentCampaign>> {
    const params = new URLSearchParams();
    
    if (filters.organizationId) params.append('organizationId', filters.organizationId);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${API_BASE}/payment-campaigns?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch payment campaigns');
    }
    return response.json();
  }

  async getPaymentCampaignById(id: string): Promise<PaymentCampaign> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch payment campaign');
    }
    return response.json();
  }

  async getPaymentCampaignsByOrganization(organizationId: string): Promise<ApiResponse<PaymentCampaign[]>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/organization/${organizationId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch organization payment campaigns');
    }
    return response.json();
  }

  async createPaymentCampaign(data: CreatePaymentCampaignDto): Promise<ApiResponse<PaymentCampaign>> {
    const response = await fetch(`${API_BASE}/payment-campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create payment campaign');
    }
    return response.json();
  }

  async updatePaymentCampaign(id: string, data: UpdatePaymentCampaignDto): Promise<ApiResponse<PaymentCampaign>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update payment campaign');
    }
    return response.json();
  }

  async deletePaymentCampaign(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete payment campaign');
    }
    return response.json();
  }

  // Status Management
  async activatePaymentCampaign(id: string): Promise<ApiResponse<PaymentCampaign>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}/activate`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to activate payment campaign');
    }
    return response.json();
  }

  async completePaymentCampaign(id: string): Promise<ApiResponse<PaymentCampaign>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}/complete`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to complete payment campaign');
    }
    return response.json();
  }

  async cancelPaymentCampaign(id: string): Promise<ApiResponse<PaymentCampaign>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}/cancel`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel payment campaign');
    }
    return response.json();
  }
}

export const paymentCampaignService = new PaymentCampaignService();
