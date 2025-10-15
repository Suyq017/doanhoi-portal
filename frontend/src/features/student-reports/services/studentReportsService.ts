import { apiClient } from '../../../shared/services/apiClient';
import {
  StudentReport,
  StudentReportQueryParams,
  ExportOptions,
  DashboardSummary
} from '../types';

export class StudentReportsService {
  private readonly baseUrl = '/ctxh/reports';

  /**
   * Get student report by student code
   */
  async getMyReport(studentCode: string, params: StudentReportQueryParams = {}): Promise<StudentReport> {
    const queryParams = new URLSearchParams();
    
    if (params.period) queryParams.append('period', params.period);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.status) queryParams.append('status', params.status);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.organization_id) queryParams.append('organization_id', params.organization_id);

    const url = `${this.baseUrl}/student/${studentCode}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await apiClient.get<StudentReport>(url);
    return response;
  }

  /**
   * Get dashboard summary for student
   */
  async getDashboardSummary(studentCode: string): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>(`${this.baseUrl}/student/${studentCode}/summary`);
    return response;
  }

  /**
   * Export student report
   */
  async exportReport(studentCode: string | undefined, options: ExportOptions): Promise<Blob> {
    const params = new URLSearchParams();
    
    params.append('format', options.format);
    
    if (options.include_summary !== undefined) {
      params.append('include_summary', options.include_summary.toString());
    }
    if (options.include_activities !== undefined) {
      params.append('include_activities', options.include_activities.toString());
    }
    if (options.period) params.append('period', options.period);
    if (options.start_date) params.append('start_date', options.start_date);
    if (options.end_date) params.append('end_date', options.end_date);

    const endpoint = studentCode 
      ? `${this.baseUrl}/student/${studentCode}/export`
      : `${this.baseUrl}/export`;
    
    const response = await apiClient.get(`${endpoint}?${params.toString()}`);
    
    return response as Blob;
  }

  /**
   * Get system-wide reports (admin only)
   */
  async getSystemReport(params: StudentReportQueryParams = {}): Promise<StudentReport[]> {
    const queryParams = new URLSearchParams();
    
    if (params.period) queryParams.append('period', params.period);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.status) queryParams.append('status', params.status);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.organization_id) queryParams.append('organization_id', params.organization_id);

    const url = `${this.baseUrl}/system${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await apiClient.get<StudentReport[]>(url);
    return response;
  }
}

// Export singleton instance
export const studentReportsService = new StudentReportsService();