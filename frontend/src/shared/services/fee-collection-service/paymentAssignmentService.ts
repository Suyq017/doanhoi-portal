import {
  PaymentAssignment,
  CreatePaymentAssignmentDto,
  PaymentAssignmentFilters,
  PaymentStatistics,
  ApiResponse,
  PaginatedResponse
} from '../../../features/fee-collection/types';

const API_BASE = '/payment/assignments';

class PaymentAssignmentService {
  // CRUD Operations
  async getPaymentAssignments(filters: PaymentAssignmentFilters = {}): Promise<PaginatedResponse<PaymentAssignment>> {
    const params = new URLSearchParams();

    if (filters.campaignId) params.append('campaignId', filters.campaignId);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.organizationId) params.append('organizationId', filters.organizationId);
    if (filters.status) params.append('status', filters.status);
    if (filters.feeLevelId) params.append('feeLevelId', filters.feeLevelId);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${API_BASE}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch payment assignments');
    }
    return response.json();
  }

  async getAssignmentsByCampaign(campaignId: string): Promise<ApiResponse<PaymentAssignment[]>> {
    // Add default pagination parameters to avoid backend errors
    const response = await fetch(`${API_BASE}?campaignId=${campaignId}&page=1&limit=100`);
    if (!response.ok) {
      throw new Error('Failed to fetch campaign assignments');
    }
    return response.json();
  }

  async getCampaignStatistics(campaignId: string): Promise<ApiResponse<PaymentStatistics>> {
    const response = await fetch(`${API_BASE}/statistics?campaignId=${campaignId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch campaign statistics');
    }
    return response.json();
  }

  async getAssignmentsByUser(userId: string): Promise<ApiResponse<PaymentAssignment[]>> {
    const response = await fetch(`${API_BASE}/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user assignments');
    }
    return response.json();
  }

  async getMyAssignments(): Promise<ApiResponse<PaymentAssignment[]>> {
    const response = await fetch(`${API_BASE}/my-assignments`);
    if (!response.ok) {
      throw new Error('Failed to fetch my assignments');
    }
    return response.json();
  }

  async getAssignmentsByOrganization(organizationId: string): Promise<ApiResponse<PaymentAssignment[]>> {
    const response = await fetch(`${API_BASE}/organization/${organizationId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch organization assignments');
    }
    return response.json();
  }

  async getAssignmentById(id: string): Promise<ApiResponse<PaymentAssignment>> {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch assignment');
    }
    return response.json();
  }

  // Create Operations
  async createAssignment(data: CreatePaymentAssignmentDto): Promise<ApiResponse<PaymentAssignment>> {
    const response = await fetch(`${API_BASE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create assignment');
    }
    return response.json();
  }

  async createMultipleAssignments(assignments: CreatePaymentAssignmentDto[], userId: string): Promise<ApiResponse<PaymentAssignment[]>> {
    const requestBody = {
      assignments: assignments,
      userId: userId
    };

    const response = await fetch(`${API_BASE}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error('Failed to create multiple assignments');
    }
    return response.json();
  }

  // Update Operations
  async updateAssignment(id: string, data: Partial<CreatePaymentAssignmentDto>): Promise<ApiResponse<PaymentAssignment>> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update assignment');
    }
    return response.json();
  }

  async deleteAssignment(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete assignment');
    }
    return response.json();
  }

  // Status Update Operations
  async markAsPaid(id: string): Promise<ApiResponse<PaymentAssignment>> {
    const response = await fetch(`${API_BASE}/${id}/mark-paid`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark assignment as paid');
    }
    return response.json();
  }
}

export const paymentAssignmentService = new PaymentAssignmentService();
