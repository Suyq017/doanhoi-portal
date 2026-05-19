import { apiClient } from '../../../shared/services/apiClient';
import {
  CtxhLimitConfig,
  CreateLimitConfigRequest,
  UpdateLimitConfigRequest,
  PaginatedResponse,
  LimitConfigQueryParams
} from '../types';

export class LimitConfigService {
  private basePath = '/ctxh/limit-config';

  // Get all limit configs with pagination and filtering
  async findAll(params?: LimitConfigQueryParams): Promise<PaginatedResponse<CtxhLimitConfig>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.organization_id) searchParams.append('organization_id', params.organization_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
    
    return apiClient.get<PaginatedResponse<CtxhLimitConfig>>(endpoint);
  }

  // Get limit config by ID
  async findOne(id: string): Promise<CtxhLimitConfig> {
    return apiClient.get<CtxhLimitConfig>(`${this.basePath}/${id}`);
  }

  // Create new limit config
  async create(data: CreateLimitConfigRequest): Promise<CtxhLimitConfig> {
    return apiClient.post<CtxhLimitConfig>(this.basePath, data);
  }

  // Update limit config
  async update(id: string, data: UpdateLimitConfigRequest): Promise<CtxhLimitConfig> {
    return apiClient.patch<CtxhLimitConfig>(`${this.basePath}/${id}`, data);
  }

  // Soft delete limit config
  async delete(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${this.basePath}/${id}`);
  }

  // Restore soft-deleted limit config
  async restore(id: string): Promise<CtxhLimitConfig> {
    return apiClient.post<CtxhLimitConfig>(`${this.basePath}/${id}/restore`);
  }
}

export const limitConfigService = new LimitConfigService();