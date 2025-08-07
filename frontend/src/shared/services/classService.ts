import { apiClient } from './apiClient';
import {
  Class,
  CreateClassRequest,
  UpdateClassRequest,
  ClassesResponse,
  ClassQueryParams,
  ClassImportData,
  ImportUploadResponseClass,
  ImportValidationResponseClass,
  ImportExecuteResponseClass
} from '../types/class';

class ClassService {
  async getClasses(params?: ClassQueryParams): Promise<ClassesResponse> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.departmentId) searchParams.append('departmentId', params.departmentId);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

    const queryString = searchParams.toString();
    const endpoint = `/classes${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<ClassesResponse>(endpoint);
  }

  async getClass(id: string): Promise<Class> {
    return apiClient.get<Class>(`/classes/${id}`);
  }

  async createClass(classData: CreateClassRequest): Promise<Class> {
    return apiClient.post<Class>('/classes', classData);
  }

  async updateClass(id: string, classData: UpdateClassRequest): Promise<Class> {
    return apiClient.patch<Class>(`/classes/${id}`, classData);
  }

  async deleteClass(id: string): Promise<void> {
    await apiClient.delete(`/classes/${id}`);
  }

  async bulkDeleteClasses(ids: string[]): Promise<void> {
    await apiClient.delete('/classes/bulk', { ids });
  }
  // Import functionality - Server-side processing
  async getTemplate(): Promise<string> {
    return `${apiClient.getBaseURL()}/classes/template`;
  }

  async uploadImportFile(file: File): Promise<ImportUploadResponseClass> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.uploadFile<ImportUploadResponseClass>('/classes/import/upload', formData);
  }

  async validateImportData(sessionId: string): Promise<ImportValidationResponseClass> {
    return apiClient.get<ImportValidationResponseClass>(`/classes/import/${sessionId}/validate`);
  }

  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<ImportExecuteResponseClass> {
    return apiClient.post<ImportExecuteResponseClass>(`/classes/import/${sessionId}/execute`, options || {});
  }

  async getImportStatus(sessionId: string): Promise<any> {
    return apiClient.get(`/classes/import/${sessionId}/status`);
  }

  // Legacy methods for backward compatibility (empty implementations)
  async parseFile(_file: File): Promise<ClassImportData[]> {
    // Deprecated - use server-side processing instead
    return [];
  }

  async validateData(_data: ClassImportData[]): Promise<any> {
    // Deprecated - use server-side processing instead
    return { isValid: true, data: [], errors: [], warnings: [] };
  }

  async importData(_data: ClassImportData[], _options: any = {}): Promise<any> {
    // Deprecated - use server-side processing instead
    return { total: 0, success: 0, failed: 0, skipped: 0, errors: [], warnings: [] };
  }
}

export const classService = new ClassService();
