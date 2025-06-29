const API_BASE_URL = 'http://localhost:9200';

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

export interface UpdateClassRequest extends Partial<CreateClassRequest> {}

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

class ClassService {
  parseFile: any;
  validateData: any;
  importData: any;
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
}

export const classService = new ClassService();
