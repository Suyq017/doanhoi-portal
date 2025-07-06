const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL;

import { ServerValidationResult, ServerImportResult, ImportOptions, ValidationError } from '../types/import';
import {
  Department, CreateDepartmentRequest, UpdateDepartmentRequest,
  DepartmentsResponse, DepartmentQueryParams, DepartmentImportData,
  ImportUploadResponseDepartment, ImportValidationResponseDepartment,
  ImportExecuteResponseDepartment
} from '../types/department';


class DepartmentService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check if response has content
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null as T;
    }

    // Check if response content type is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return null as T;
  }

  async getDepartments(params: DepartmentQueryParams = {}): Promise<DepartmentsResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

    const query = searchParams.toString();
    const endpoint = query ? `/departments?${query}` : '/departments';

    return this.request<DepartmentsResponse>(endpoint);
  }

  async getDepartmentById(id: string): Promise<Department> {
    return this.request<Department>(`/departments/${id}`);
  }

  async createDepartment(departmentData: CreateDepartmentRequest): Promise<Department> {
    return this.request<Department>('/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
  }

  async updateDepartment(id: string, departmentData: UpdateDepartmentRequest): Promise<Department> {
    return this.request<Department>(`/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(departmentData),
    });
  }

  async deleteDepartment(id: string): Promise<void> {
    await this.request(`/departments/${id}`, {
      method: 'DELETE',
    });
  }

  // Import functionality - Updated for server-side processing
  async getTemplate(): Promise<string> {
    return `${API_BASE_URL}/departments/template`;
  }

  async uploadImportFile(file: File): Promise<ImportUploadResponseDepartment> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/departments/import/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }

  async validateImportData(sessionId: string): Promise<ImportValidationResponseDepartment> {
    return this.request<ImportValidationResponseDepartment>(`/departments/import/${sessionId}/validate`);
  }

  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<ImportExecuteResponseDepartment> {
    return this.request<ImportExecuteResponseDepartment>(`/departments/import/${sessionId}/execute`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async getImportStatus(sessionId: string): Promise<any> {
    return this.request(`/departments/import/${sessionId}/status`);
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
  }
  async importData(
    data: DepartmentImportData[],
    options: ImportOptions = { skipErrors: true, updateExisting: false }
  ): Promise<ServerImportResult> {
    // This method is now deprecated in favor of server-side import workflow
    // Keep for backward compatibility
    try {
      const response = await this.request<ServerImportResult>('/departments/import', {
        method: 'POST',
        body: JSON.stringify({ data, options }),
      });
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
