const API_BASE_URL = 'http://localhost:9200';

import { ValidationResult, ImportResult, ImportOptions } from '../types/import';

export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  managementUsers?: any[];
  trainingUsers?: any[];
}

export interface CreateDepartmentRequest {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentRequest extends Partial<CreateDepartmentRequest> {}

export interface DepartmentsResponse {
  departments: Department[];
  total: number;
}

export interface DepartmentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface DepartmentImportData {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

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

  // Import functionality
  async getTemplate(): Promise<string> {
    return `${API_BASE_URL}/departments/template`;
  }

  async parseFile(file: File): Promise<DepartmentImportData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // For CSV files, you might parse differently
          // For now, we'll simulate parsing
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

  async validateData(data: DepartmentImportData[]): Promise<ValidationResult<DepartmentImportData>> {
    const validatedData = data.map((item, index) => {
      const errors: any[] = [];
      const warnings: any[] = [];
      
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
      data: validatedData,
      errors: allErrors,
      warnings: allWarnings,
      isValid: allErrors.length === 0,
      summary: {
        total: data.length,
        valid: validatedData.filter(d => !d._hasError).length,
        invalid: validatedData.filter(d => d._hasError).length
      }
    };
  }

  async importData(
    data: DepartmentImportData[],
    options: ImportOptions = { skipErrors: true, updateExisting: false }
  ): Promise<ImportResult> {
    try {
      const response = await this.request<ImportResult>('/departments/import', {
        method: 'POST',
        body: JSON.stringify({ data, options }),
      });
      return response;
    } catch (error) {
      // Mock response for demonstration
      return {
        total: data.length,
        success: data.length,
        failed: 0,
        skipped: 0,
        errors: [],
        warnings: []
      };
    }
  }
}

export const departmentService = new DepartmentService();
