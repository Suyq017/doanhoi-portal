import { apiClient } from '../../../shared/services/apiClient';
import {
  CtxhCategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryQueryParams,
  PaginatedResponse
} from '../types';

export class CategoryService {
  private basePath = '/ctxh/categories';

  // Get all categories with pagination and filtering
  async findAll(params?: CategoryQueryParams): Promise<PaginatedResponse<CtxhCategory>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
    
    return apiClient.get<PaginatedResponse<CtxhCategory>>(endpoint);
  }

  // Get category by ID
  async findOne(id: string): Promise<CtxhCategory> {
    return apiClient.get<CtxhCategory>(`${this.basePath}/${id}`);
  }

  // Create new category
  async create(data: CreateCategoryRequest): Promise<CtxhCategory> {
    return apiClient.post<CtxhCategory>(this.basePath, data);
  }

  // Update category
  async update(id: string, data: UpdateCategoryRequest): Promise<CtxhCategory> {
    return apiClient.patch<CtxhCategory>(`${this.basePath}/${id}`, data);
  }

  // Soft delete category
  async delete(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${this.basePath}/${id}`);
  }

  // Restore soft-deleted category
  async restore(id: string): Promise<CtxhCategory> {
    return apiClient.post<CtxhCategory>(`${this.basePath}/${id}/restore`);
  }
}

export const categoryService = new CategoryService();