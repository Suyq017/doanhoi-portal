const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL;

export interface Class {
  id: string;
  name: string;
  code?: string;
  year?: number;
  department?: {
    id: string;
    name: string;
    code?: string;
  };
  students?: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassRequest {
  name: string;
  code?: string;
  year?: number;
  departmentId?: string;
  isActive?: boolean;
}

export interface UpdateClassRequest extends Partial<CreateClassRequest> { }

export interface ClassesResponse {
  classes: Class[];
  total: number;
}

export interface ClassQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  year?: number;
  departmentId?: string;
  isActive?: boolean;
}

export interface ClassImportData {
  name: string;
  code?: string;
  year?: number;
  departmentCode?: string;
  isActive?: boolean;
}

// New types for server-side import
export interface ImportUploadResponseClass {
  sessionId: string;
  fileName: string;
  totalRows: number;
  message: string;
}

export interface ImportValidationResponseClass {
  sessionId: string;
  isValid: boolean;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    conflicts: number;
  };
  errors: any[];
  warnings: any[];
  previewData: any[];
}

export interface ImportExecuteResponseClass {
  sessionId: string;
  success: boolean;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  message: string;
}

class ClassService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response has content to parse as JSON
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      // If no content-type header with JSON or content-length is 0, return undefined
      if (!contentType?.includes('application/json') || contentLength === '0') {
        return undefined as T;
      }

      // Try to parse JSON, return undefined if empty response
      const text = await response.text();
      return text ? JSON.parse(text) : undefined as T;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

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

    return this.request<ClassesResponse>(endpoint);
  }

  async getClass(id: string): Promise<Class> {
    return this.request<Class>(`/classes/${id}`);
  }

  async createClass(classData: CreateClassRequest): Promise<Class> {
    return this.request<Class>('/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    });
  }

  async updateClass(id: string, classData: UpdateClassRequest): Promise<Class> {
    return this.request<Class>(`/classes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(classData),
    });
  }

  async deleteClass(id: string): Promise<void> {
    await this.request(`/classes/${id}`, {
      method: 'DELETE',
    });
  }

  // Import functionality - Server-side processing
  async getTemplate(): Promise<string> {
    return `${API_BASE_URL}/classes/template`;
  }

  async uploadImportFile(file: File): Promise<ImportUploadResponseClass> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/classes/import/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }

  async validateImportData(sessionId: string): Promise<ImportValidationResponseClass> {
    return this.request<ImportValidationResponseClass>(`/classes/import/${sessionId}/validate`);
  }

  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<ImportExecuteResponseClass> {
    return this.request<ImportExecuteResponseClass>(`/classes/import/${sessionId}/execute`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async getImportStatus(sessionId: string): Promise<any> {
    return this.request(`/classes/import/${sessionId}/status`);
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
