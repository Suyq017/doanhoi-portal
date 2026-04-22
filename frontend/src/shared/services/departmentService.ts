import { apiClient } from './apiClient';
import { ServerValidationResult, ServerImportResult, ImportOptions, ValidationError } from '../types/import';
import {
  Department, CreateDepartmentRequest, UpdateDepartmentRequest,
  DepartmentsResponse, DepartmentQueryParams, DepartmentImportData,
  ImportUploadResponseDepartment, ImportValidationResponseDepartment,
  ImportExecuteResponseDepartment
} from '../types/department';

class DepartmentService {
  async getDepartments(params: DepartmentQueryParams = {}): Promise<DepartmentsResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

    const query = searchParams.toString();
    const endpoint = query ? `/departments?${query}` : '/departments';

    return apiClient.get<DepartmentsResponse>(endpoint);
  }

  async getDepartmentById(id: string): Promise<Department> {
    return apiClient.get<Department>(`/departments/${id}`);
  }

  async createDepartment(departmentData: CreateDepartmentRequest): Promise<Department> {
    return apiClient.post<Department>('/departments', departmentData);
  }

  async updateDepartment(id: string, departmentData: UpdateDepartmentRequest): Promise<Department> {
    return apiClient.patch<Department>(`/departments/${id}`, departmentData);
  }

  async deleteDepartment(id: string): Promise<void> {
    await apiClient.delete(`/departments/${id}`);
  }

  async bulkDeleteDepartments(ids: string[]): Promise<void> {
    await apiClient.delete('/departments/bulk', { ids });
  }

  // Import functionality - Updated for server-side processing
  async getTemplate(): Promise<string> {
    return `${apiClient.getBaseURL()}/departments/template`;
  }

  async uploadImportFile(file: File): Promise<ImportUploadResponseDepartment> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.uploadFile<ImportUploadResponseDepartment>('/departments/import/upload', formData);
  }

  async validateImportData(sessionId: string): Promise<ImportValidationResponseDepartment> {
    return apiClient.get<ImportValidationResponseDepartment>(`/departments/import/${sessionId}/validate`);
  }

  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<ImportExecuteResponseDepartment> {
    return apiClient.post<ImportExecuteResponseDepartment>(`/departments/import/${sessionId}/execute`, options || {});
  }

  async getImportStatus(sessionId: string): Promise<any> {
    return apiClient.get(`/departments/import/${sessionId}/status`);
  }

  // Legacy methods for backward compatibility
  async parseFile(file: File): Promise<DepartmentImportData[]> {
    // This method is now deprecated in favor of server-side parsing
    // Keep for backward compatibility but recommend using uploadImportFile
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const mockData: DepartmentImportData[] = [
            { name: 'Sample Department', code: 'SAMPLE', description: 'Sample description', isActive: true }
          ];
          resolve(mockData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }
  async validateData(data: DepartmentImportData[]): Promise<ServerValidationResult> {
    // This method is now deprecated in favor of server-side validation
    // Keep for backward compatibility
    const validatedData = data.map((item, index) => {
      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [];

      if (!item.name || item.name.trim() === '') {
        errors.push({
          row: index + 1,
          column: 'name',
          message: 'Department name is required',
          severity: 'error' as const
        });
      }

      if (item.code && item.code.length > 10) {
        warnings.push({
          row: index + 1,
          column: 'code',
          message: 'Department code should be less than 10 characters',
          severity: 'warning' as const
        });
      }

      return {
        ...item,
        _rowIndex: index,
        _hasError: errors.length > 0,
        _errors: errors,
        _warnings: warnings
      };
    });

    const allErrors = validatedData.flatMap(d => d._errors);
    const allWarnings = validatedData.flatMap(d => d._warnings);

    return {
      sessionId: 'legacy-session',
      isValid: allErrors.length === 0,
      summary: {
        total: data.length,
        valid: validatedData.filter(d => !d._hasError).length,
        invalid: validatedData.filter(d => d._hasError).length,
        duplicates: 0,
        conflicts: 0
      },
      errors: allErrors,
      warnings: allWarnings,
      previewData: validatedData
    };
  } async importData(
    data: DepartmentImportData[],
    options: ImportOptions = { skipErrors: true, updateExisting: false }
  ): Promise<ServerImportResult> {
    // This method is now deprecated in favor of server-side import workflow
    // Keep for backward compatibility
    try {
      const response = await apiClient.post<ServerImportResult>('/departments/import', { data, options });
      return response;
    } catch (error) {
      return {
        sessionId: 'legacy-session',
        success: false,
        importedCount: 0,
        skippedCount: 0,
        failedCount: data.length,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        message: 'Import failed'
      };
    }
  }
}

export const departmentService = new DepartmentService();
