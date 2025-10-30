import { apiClient } from './apiClient';
import {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationStats,
  OrganizationImportData,
  UserOrganizationWithUser,
  UserOrganization
} from '../types/organization';

class OrganizationService {
  async getOrganizations(): Promise<Organization[]> {
    return apiClient.get<Organization[]>('/organizations');
  } async getAccessibleOrganizations(): Promise<Organization[]> {
    try {
      const result = await apiClient.get<Organization[]>('/organizations/accessible');
      return result;
    } catch (error) {
      console.error('[OrganizationService] Error calling /organizations/accessible:', error);
      throw error;
    }
  }

  async getOrganizationTree(): Promise<Organization[]> {
    return apiClient.get<Organization[]>('/organizations/tree');
  }
  async getOrganizationsByType(type: string): Promise<Organization[]> {
    return apiClient.get<Organization[]>(`/organizations/type/${type}`);
  }
  async getOrganizationById(id: string): Promise<Organization> {
    return apiClient.get<Organization>(`/organizations/${id}`);
  }
  async createOrganization(organizationData: CreateOrganizationRequest): Promise<Organization> {
    return apiClient.post<Organization>('/organizations', organizationData);
  }
  async updateOrganization(id: string, organizationData: UpdateOrganizationRequest): Promise<Organization> {
    return apiClient.patch<Organization>(`/organizations/${id}`, organizationData);
  } async deleteOrganization(id: string): Promise<void> {
    await apiClient.delete(`/organizations/${id}`);
  }

  async addUserToOrganization(organizationId: string, userId: string, role: string = 'member'): Promise<UserOrganization> {
    return apiClient.post<UserOrganization>(`/organizations/${organizationId}/members/${userId}`, { role });
  }

  async addUserToOrganizationWithParents(organizationId: string, userId: string, role: string = 'member'): Promise<UserOrganization[]> {
    return apiClient.post<UserOrganization[]>(`/organizations/${organizationId}/members/${userId}/with-parents`, { role });
  }

  async removeUserFromOrganization(organizationId: string, userId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/members/${userId}`);
  }
  async removeUserFromOrganizationSafely(organizationId: string, userId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/members/${userId}/safely`);
  }
  async removeUsersFromOrganization(organizationId: string, userIds: string[]): Promise<{
    message: string;
    removedCount: number;
  }> {
    return apiClient.delete(`/organizations/${organizationId}/members/bulk-remove`, { userIds });
  } async getOrganizationMembers(
    organizationId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ members: UserOrganizationWithUser[], total: number, page: number, limit: number, totalPages: number }> {
    return apiClient.get<{ members: UserOrganizationWithUser[], total: number, page: number, limit: number, totalPages: number }>(
      `/organizations/${organizationId}/members?page=${page}&limit=${limit}`
    );
  }
  // Bổ sung các API mới theo kế hoạch
  async getOrganizationByTypeAndCode(type: string, code: string): Promise<Organization> {
    return apiClient.get<Organization>(`/organizations/by-type-code/${type}/${code}`);
  }
  async getOrganizationChildren(id: string): Promise<Organization[]> {
    return apiClient.get<Organization[]>(`/organizations/${id}/children`);
  }
  async getOrganizationParent(id: string): Promise<Organization | null> {
    try {
      return apiClient.get<Organization>(`/organizations/${id}/parent`);
    } catch (error) {
      // Nếu 404 (không có parent), return null
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }
  async getOrganizationBreadcrumb(id: string): Promise<Organization[]> {
    return apiClient.get<Organization[]>(`/organizations/${id}/breadcrumb`);
  }
  async getOrganizationStats(): Promise<OrganizationStats> {
    const response = await apiClient.get<OrganizationStats>('/organizations/stats');
    return response;
  }

  async addMemberBySimpleCode(organizationCode: string, userCode: string): Promise<UserOrganization> {
    return apiClient.post<UserOrganization>(`/organizations/${organizationCode}/member/${userCode}`, { userCode });
  }

  /**
   * Bulk add members to an organization by user codes (student IDs)
   * Used for importing members from Excel with just student codes
   */
  async bulkAddMembersByCode(organizationId: string, userCodes: string[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; code: string; message: string }>;
  }> {
    return apiClient.post(`/organizations/${organizationId}/members/bulk-add`, { userCodes });
  }

  async uploadImportFile(file: File, level: number = 3, organizationId?: string): Promise<{
    sessionId: string;
    previewData: OrganizationImportData[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    // Validate level parameter
    if (![2, 3].includes(level)) {
      throw new Error('Level phải là 2 hoặc 3');
    }

    // New endpoint format: /organizations/members/import/upload?level={level}&organizationId={organizationId}
    let endpoint = `/organizations/members/import/upload?level=${level}`;
    if (organizationId) {
      endpoint += `&organizationId=${organizationId}`;
    }

    return apiClient.uploadFile<{
      sessionId: string;
      previewData: OrganizationImportData[];
    }>(endpoint, formData);
  } async validateImportData(sessionId: string): Promise<{
    sessionId: string;
    isValid: boolean;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      duplicates: number;
      conflicts: number;
    };
    errors: Array<{
      row: number;
      column: string;
      message: string;
      severity: 'error' | 'warning';
    }>;
    warnings: Array<{
      row: number;
      column: string;
      message: string;
      severity: 'error' | 'warning';
    }>;
    previewData: Array<{
      row: number;
      studentCode: string;
      classOrUnitCode?: string;
      hasErrors: boolean;
      hasWarnings: boolean;
      errors: Array<{
        row: number;
        column: string;
        message: string;
        severity: 'error' | 'warning';
      }>;
      warnings: Array<{
        row: number;
        column: string;
        message: string;
        severity: 'error' | 'warning';
      }>;
    }>;
  }> {
    return apiClient.get(`/organizations/import/${sessionId}/validate`);
  } async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<{
    sessionId: string;
    success: boolean;
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: string[];
    message: string;
  }> {
    return apiClient.post(`/organizations/import/${sessionId}/execute`, options || {});
  }
  async getImportStatus(sessionId: string): Promise<{
    sessionId: string;
    status: 'processing' | 'completed' | 'failed';
    total: number;
    processed: number;
    errors?: any[];
  }> {
    return apiClient.get(`/organizations/import/${sessionId}/status`);
  }
  async downloadTemplate(level: number = 3): Promise<Blob> {
    return apiClient.downloadBlob(`/organizations/members/import/template/${level}`);
  }

  getTemplate(level: number = 3): string {
    return `${apiClient.getBaseURL()}/organizations/template/${level}`;
  }

  /**
   * Get organizations user can access for CTXH activity creation
   * Based on ctxh.activities.create permission and hierarchy level
   */
  async getCtxhActivityAccessibleOrganizations(): Promise<{
    organizations: Organization[];
    canSelectMultiple: boolean;
    fixedOrganization: Organization | null;
  }> {
    const response = await apiClient.get<{
      organizations: Organization[];
      canSelectMultiple: boolean;
      fixedOrganization: Organization | null;
    }>('/organizations/ctxh-activity-accessible');
    return response;
  }

  async getCtxhActivityViewableOrganizations(): Promise<{
    organizations: Organization[];
  }> {
    const response = await apiClient.get<{
      organizations: Organization[];
    }>('/organizations/ctxh-activity-viewable');
    return response;
  }

}

export const organizationService = new OrganizationService();
