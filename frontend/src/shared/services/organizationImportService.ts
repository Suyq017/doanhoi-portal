const API_BASE_URL = 'http://localhost:9200';

export interface OrganizationImportMemberData {
  studentCode: string;
  classOrUnitCode?: string;
}

export interface OrganizationImportUploadResponse {
  sessionId: string;
  previewData: OrganizationImportMemberData[];
}

export interface OrganizationImportValidationResult {
  rowIndex: number;
  data: OrganizationImportMemberData;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OrganizationImportExecutionResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    rowIndex: number;
    data: OrganizationImportMemberData;
    error: string;
  }>;
}

export interface CreateOrganizationRequest {
  code: string;
  name: string;
  type: string;
  description?: string;
  parentId?: string;
}

class OrganizationImportService {
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
      const errorText = await response.text();
      let errorData: any = {};

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Upload file and get session
  async uploadImportFile(
    organizationId: string,
    file: File,
    level: number = 3
  ): Promise<OrganizationImportUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_BASE_URL}/organizations/${organizationId}/members/import/upload?level=${level}`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Validate import data
  async validateImportData(sessionId: string): Promise<OrganizationImportValidationResult[]> {
    return this.request('/organizations/members/import/validate', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  // Execute import
  async executeImport(
    sessionId: string,
    skipErrors: boolean = false
  ): Promise<OrganizationImportExecutionResult> {
    return this.request('/organizations/members/import/execute', {
      method: 'POST',
      body: JSON.stringify({ sessionId, skipErrors }),
    });
  }

  // Download template file
  async downloadTemplate(level: number): Promise<Blob> {
    try {
      const url = `${API_BASE_URL}/organizations/members/import/template/${level}`;
      const response = await fetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Verify the blob is not empty and has correct type
      if (blob.size === 0) {
        throw new Error('File mẫu trống hoặc không hợp lệ');
      }

      // Check if blob type is correct
      if (!blob.type.includes('spreadsheet') && !blob.type.includes('excel') && !blob.type.includes('octet-stream')) {
        console.warn('Blob type may be incorrect:', blob.type);
      }

      return blob;
    } catch (error) {
      console.error('Download template error:', error);
      throw error;
    }
  }

  // Create organization
  async createOrganization(data: CreateOrganizationRequest) {
    return this.request('/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Add member by student code
  async addMemberByCode(organizationCode: string, studentCode: string) {
    return this.request(`/organizations/${organizationCode}/member/${studentCode}`, {
      method: 'POST',
    });
  }
}

export const organizationImportService = new OrganizationImportService();
