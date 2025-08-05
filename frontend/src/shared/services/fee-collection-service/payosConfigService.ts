import { apiClient } from '../../../shared/services/apiClient';

export interface PayOSConfig {
  id?: string;
  organizationId: string;
  clientId: string;
  apiKey: string;
  checksumKey: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePayOSConfigRequest {
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
const baseURL = '/api/organizations';

class PayOSConfigService {
  /**
   * Get PayOS configuration for organization
   */
  async getPayOSConfig(organizationId: string): Promise<PayOSConfig | null> {
    try {
      const response = await apiClient.get<PayOSConfigResponse>(`${baseURL}/${organizationId}/payos-config`);
      
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
   * Create PayOS configuration for organization
   */
  async createPayOSConfig(organizationId: string, configData: CreatePayOSConfigRequest): Promise<PayOSConfig> {
    try {
      const response = await apiClient.post<PayOSConfigResponse>(
        `${baseURL}/${organizationId}/payos-config`,
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
   * Update PayOS configuration for organization
   */
  async updatePayOSConfig(organizationId: string, configData: UpdatePayOSConfigRequest): Promise<PayOSConfig> {
    try {
      const response = await apiClient.put<PayOSConfigResponse>(
        `${baseURL}/${organizationId}/payos-config`,
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
}

export const payosConfigService = new PayOSConfigService();
