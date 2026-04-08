import { apiClient } from '../../../shared/services/apiClient';
import {
  CtxhActivity,
  CreateActivityRequest,
  UpdateActivityRequest,
  ParticipationResponse,
  AddStudentRequest,
  GradeParticipantsRequest,
  PaginatedResponse,
  ActivityQueryParams,
  ExcelValidationResult
} from '../types';

export class ActivityService {
  private basePath = '/ctxh/activities';

  // Transform backend response to frontend format
  private transformActivity(activity: any): CtxhActivity {
    return {
      ...activity,
      startDate: activity.start_date,
      endDate: activity.end_date,
      categoryId: activity.category_id,
      organizationId: activity.organization_id,
      totalDays: activity.total_days,
      location: activity.location, // Add location field mapping
      requiresApproval: activity.requires_approval,
      maxParticipants: activity.max_participants,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      createdBy: activity.created_by,
      updatedBy: activity.updated_by,
      deletedBy: activity.deleted_by,
      deletedAt: activity.deleted_at,
    };
  }

  // Transform frontend request to backend format
  private transformRequest(data: CreateActivityRequest | UpdateActivityRequest): any {
    const transformed: any = { ...data };
    
    if ('startDate' in data && data.startDate) {
      transformed.start_date = data.startDate;
      delete transformed.startDate;
    }
    
    if ('endDate' in data && data.endDate) {
      transformed.end_date = data.endDate;
      delete transformed.endDate;
    }
    
    if ('categoryId' in data) {
      transformed.category_id = (data as CreateActivityRequest).categoryId;
      delete transformed.categoryId;
    }
    
    if ('organizationId' in data) {
      transformed.organization_id = (data as CreateActivityRequest).organizationId;
      delete transformed.organizationId;
    }
    
    if ('totalDays' in data && data.totalDays) {
      transformed.total_days = data.totalDays;
      delete transformed.totalDays;
    }

    if ('requiresApproval' in data) {
      transformed.requires_approval = (data as any).requiresApproval;
      delete transformed.requiresApproval;
    }

    if ('maxParticipants' in data) {
      transformed.max_participants = (data as any).maxParticipants;
      delete transformed.maxParticipants;
    }
    
    return transformed;
  }

  // Get all activities with pagination and filtering
  async findAll(params?: ActivityQueryParams): Promise<PaginatedResponse<CtxhActivity>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.category_id) searchParams.append('category_id', params.category_id);
    if (params?.organization_id) searchParams.append('organization_id', params.organization_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
    
    const response = await apiClient.get<PaginatedResponse<any>>(endpoint);
    
    // Transform the data to frontend format
    return {
      ...response,
      data: response.data.map(activity => this.transformActivity(activity))
    };
  }

  // Get activity by ID
  async findOne(id: string): Promise<CtxhActivity> {
    const activity = await apiClient.get<any>(`${this.basePath}/${id}`);
    return this.transformActivity(activity);
  }

  // Create new activity
  async create(data: CreateActivityRequest): Promise<CtxhActivity> {
    const transformedData = this.transformRequest(data);
    const activity = await apiClient.post<any>(this.basePath, transformedData);
    return this.transformActivity(activity);
  }

  // Update activity
  async update(id: string, data: UpdateActivityRequest): Promise<CtxhActivity> {
    const transformedData = this.transformRequest(data);
    const activity = await apiClient.patch<any>(`${this.basePath}/${id}`, transformedData);
    return this.transformActivity(activity);
  }

  // Soft delete activity
  async delete(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${this.basePath}/${id}`);
  }

  // Restore soft-deleted activity
  async restore(id: string): Promise<CtxhActivity> {
    const activity = await apiClient.post<any>(`${this.basePath}/${id}/restore`);
    return this.transformActivity(activity);
  }

  // Participant Management Methods

  // Get participants for an activity
  async getParticipants(activityId: string): Promise<ParticipationResponse[]> {
    return apiClient.get<ParticipationResponse[]>(`${this.basePath}/${activityId}/participants`);
  }

  // Add single student manually by student code
  async addStudent(activityId: string, data: AddStudentRequest): Promise<ParticipationResponse> {
    return apiClient.post<ParticipationResponse>(`${this.basePath}/${activityId}/participants`, data);
  }

  // Student self registration
  async registerSelf(activityId: string): Promise<ParticipationResponse> {
    return apiClient.post<ParticipationResponse>(`${this.basePath}/${activityId}/register`);
  }

  // Student cancels pending registration
  async cancelSelfRegistration(activityId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${this.basePath}/${activityId}/register`);
  }

  // Manager gets pending registration list
  async getPendingParticipants(activityId: string): Promise<ParticipationResponse[]> {
    return apiClient.get<ParticipationResponse[]>(`${this.basePath}/${activityId}/participants/pending`);
  }

  // Manager approves one pending registration
  async approveParticipant(activityId: string, participationId: string): Promise<ParticipationResponse> {
    return apiClient.post<ParticipationResponse>(`${this.basePath}/${activityId}/participants/${participationId}/approve`);
  }

  // Manager approves multiple pending registrations
  async approveParticipantsBatch(
    activityId: string,
    participationIds: string[],
  ): Promise<{ successful: { participation_id: string }[]; failed: { participation_id: string; error: string }[]; total: number }> {
    return apiClient.post(`${this.basePath}/${activityId}/participants/approve-batch`, {
      participation_ids: participationIds,
    });
  }

  // Upload Excel file with student list
  async uploadParticipantsExcel(activityId: string, file: File): Promise<ExcelValidationResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.uploadFile<ExcelValidationResult>(`${this.basePath}/${activityId}/participants/excel`, formData);
  }

  // Grade participants manually
  async gradeParticipants(activityId: string, data: GradeParticipantsRequest): Promise<any> {
    return apiClient.post(`${this.basePath}/${activityId}/participants/grade`, data);
  }

  // Grade participants from Excel file
  async gradeParticipantsFromExcel(activityId: string, file: File): Promise<ExcelValidationResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.uploadFile<ExcelValidationResult>(`${this.basePath}/${activityId}/participants/grading-upload`, formData);
  }

  // Remove participant from activity
  async removeParticipant(activityId: string, participationId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${this.basePath}/${activityId}/participants/${participationId}`);
  }

  // Download Excel template for participants
  async downloadParticipantsTemplate(): Promise<Blob> {
    return apiClient.downloadBlob('/ctxh/activities/participants/template');
  }

  // Export participants list for grading
  async exportParticipants(activityId: string): Promise<Blob> {
    return apiClient.downloadBlob(`${this.basePath}/${activityId}/export`);
  }
}

export const activityService = new ActivityService();