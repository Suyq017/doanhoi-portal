import { ExportRequest } from '../../types/export.types';

class ExportService {
  private baseUrl = '/api';

  async exportOrganizationMembers(organizationId: string, fields: string[]): Promise<Blob> {
    const request: ExportRequest = {
      fields,
      format: 'xlsx'
    };

    const response = await fetch(`${this.baseUrl}/export/organizations/${organizationId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Xuất file thất bại');
    }

    return response.blob();
  }

  async exportUsers(fields: string[]): Promise<Blob> {
    const request: ExportRequest = {
      fields,
      format: 'xlsx'
    };

    const response = await fetch(`${this.baseUrl}/export/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Xuất file thất bại');
    }

    return response.blob();
  }

  async exportPaymentAssignments(campaignId: string, fields: string[]): Promise<Blob> {
    const request: ExportRequest = {
      fields,
      format: 'xlsx'
    };

    const response = await fetch(`${this.baseUrl}/export/payment-assignments/${campaignId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Xuất file danh sách phân công thất bại');
    }

    return response.blob();
  }

  downloadFile(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  generateFileName(prefix: string, organizationName?: string): string {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (organizationName) {
      const cleanOrgName = organizationName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');
      return `${prefix}_${cleanOrgName}_${timestamp}.xlsx`;
    }
    
    return `${prefix}_${timestamp}.xlsx`;
  }
}

export const exportService = new ExportService();