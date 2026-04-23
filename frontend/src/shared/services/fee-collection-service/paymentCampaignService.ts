import {
  PaymentCampaign,
  CreatePaymentCampaignDto,
  UpdatePaymentCampaignDto,
  PaymentCampaignFilters,
  ApiResponse,
  PaymentCampaignPaginatedResponse,
  Organization
} from '../../../features/fee-collection/types';
import { authService } from '../../../features/auth/services/authService';

const API_BASE = '/api';

class PaymentCampaignService {
  private getAuthHeaders(): Record<string, string> {
    const token = authService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // CRUD Operations
  async getPaymentCampaigns(filters: PaymentCampaignFilters = {}): Promise<PaymentCampaignPaginatedResponse> {
    const params = new URLSearchParams();

    if (filters.organizationId) params.append('organizationId', filters.organizationId);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${API_BASE}/payment-campaigns?${params}`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch payment campaigns');
    }
    return response.json();
  }
  async getPaymentCampaignById(id: string): Promise<PaymentCampaign> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch payment campaign');
    }
    return response.json();
  }

  async getPaymentCampaignsByOrganization(organizationId: string): Promise<ApiResponse<PaymentCampaign[]>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/organization/${organizationId}`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch organization payment campaigns');
    }
    return response.json();
  }

  async createPaymentCampaign(data: CreatePaymentCampaignDto): Promise<ApiResponse<PaymentCampaign>> {
    const response = await fetch(`${API_BASE}/payment-campaigns`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
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
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update payment campaign');
    }
    return response.json();
  }

  async deletePaymentCampaign(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete payment campaign');
    }

  }
  // Status Management
  async activatePaymentCampaign(id: string): Promise<ApiResponse<PaymentCampaign>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}/activate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to activate payment campaign');
    }
    return response.json();
  }

  async completePaymentCampaign(id: string): Promise<ApiResponse<PaymentCampaign>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}/complete`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to complete payment campaign');
    }
    return response.json();
  }

  async cancelPaymentCampaign(id: string): Promise<ApiResponse<PaymentCampaign>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}/cancel`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel payment campaign');
    } return response.json();
  }

  // Statistics
  async getPaymentCampaignStatistics(id: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE}/payment-campaigns/${id}/statistics`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment campaign statistics');
    }
    return response.json();
  }

  // Get accessible organizations for current user
  async getAccessibleOrganizations(): Promise<Organization[]> {
    const response = await fetch(`${API_BASE}/payment-campaigns/accessible-organizations`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch accessible organizations');
    }
    return response.json();
  }
}

export const paymentCampaignService = new PaymentCampaignService();
