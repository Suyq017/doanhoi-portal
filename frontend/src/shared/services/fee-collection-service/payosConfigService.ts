import { apiClient } from '../../../shared/services/apiClient';

export interface PayOSConfig {
  id?: string;
  campaignId: string;
  organizationId: string;
  userId: string;
  clientId: string;
  apiKey: string;
  checksumKey: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  isInherited?: boolean;
}

export interface CreatePayOSConfigRequest {
  organizationId: string;
  clientId: string;
  apiKey: string;
  checksumKey: string;
}

export interface UpdatePayOSConfigRequest {
  clientId?: string;
  apiKey?: string;
  checksumKey?: string;
  isActive?: boolean;
}

export interface PayOSConfigResponse {
  success: boolean;
  message?: string;
  data?: PayOSConfig;
  error?: string;
}
const baseURL = '/api/payment-campaigns';

class PayOSConfigService {
  /**
   * Get PayOS configuration for payment campaign
   */
  async getPayOSConfig(campaignId: string): Promise<PayOSConfig | null> {
    try {
      const response = await apiClient.get<PayOSConfigResponse>(`${baseURL}/${campaignId}/payos-config`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error fetching PayOS config:', error);
      return null;
    }
  }

  /**
   * Get effective PayOS configuration for payment campaign (with fallback from organization hierarchy)
   */
  async getEffectivePayOSConfig(campaignId: string): Promise<PayOSConfig | null> {
    try {
      const response = await apiClient.get<PayOSConfigResponse>(`${baseURL}/${campaignId}/payos-config/effective`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error fetching effective PayOS config:', error);
      return null;
    }
  }

  /**
   * Create PayOS configuration for payment campaign
   */
  async createPayOSConfig(campaignId: string, configData: CreatePayOSConfigRequest): Promise<PayOSConfig> {
    try {
      const response = await apiClient.post<PayOSConfigResponse>(
        `${baseURL}/${campaignId}/payos-config`,
        configData
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.message || 'Không thể tạo cấu hình PayOS');
    } catch (error: any) {
      console.error('Error creating PayOS config:', error);
      
      if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('Không thể tạo cấu hình PayOS');
    }
  }

  /**
   * Update PayOS configuration for payment campaign
   */
  async updatePayOSConfig(campaignId: string, configData: UpdatePayOSConfigRequest): Promise<PayOSConfig> {
    try {
      const response = await apiClient.put<PayOSConfigResponse>(
        `${baseURL}/${campaignId}/payos-config`,
        configData
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.message || 'Không thể cập nhật cấu hình PayOS');
    } catch (error: any) {
      console.error('Error updating PayOS config:', error);
      
      if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('Không thể cập nhật cấu hình PayOS');
    }
  }

  /**
   * Delete PayOS configuration for payment campaign
   */
  async deletePayOSConfig(campaignId: string): Promise<void> {
    try {
      const response = await apiClient.delete<PayOSConfigResponse>(`${baseURL}/${campaignId}/payos-config`);
      
      if (!response.success) {
        throw new Error(response.message || 'Không thể xóa cấu hình PayOS');
      }
    } catch (error: any) {
      console.error('Error deleting PayOS config:', error);
      
      if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('Không thể xóa cấu hình PayOS');
    }
  }

  /**
   * Toggle PayOS configuration active status
   */
  async toggleActiveStatus(campaignId: string): Promise<PayOSConfig> {
    try {
      const response = await apiClient.post<PayOSConfigResponse>(`${baseURL}/${campaignId}/payos-config/toggle-active`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.message || 'Không thể thay đổi trạng thái cấu hình PayOS');
    } catch (error: any) {
      console.error('Error toggling PayOS config status:', error);
      
      if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('Không thể thay đổi trạng thái cấu hình PayOS');
    }
  }

  /**
   * Test PayOS connection
   */
  async testConnection(campaignId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<PayOSConfigResponse>(`${baseURL}/${campaignId}/payos-config/test-connection`);
      
      return response.success;
    } catch (error: any) {
      console.error('Error testing PayOS connection:', error);
      return false;
    }
  }
}

export const payosConfigService = new PayOSConfigService();
