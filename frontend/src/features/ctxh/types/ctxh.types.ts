// CTXH System Type Definitions
// Matching backend entities and API responses

// Enums
export enum ActivityStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE', 
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ParticipationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REGISTERED = 'REGISTERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum LimitConfigStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE', 
  DRAFT = 'DRAFT'
}

// Base interfaces
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  deletedBy?: string;
  deletedAt?: string;
}

// Category interfaces
export interface CtxhCategory extends BaseEntity {
  name: string;
  description?: string;
  // No organizationId - categories are global for the school
  _count?: {
    activities: number;
  };
  activities_count?: number; // From backend response
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  // No organizationId needed - categories are global
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

// Activity interfaces  
export interface CtxhActivity extends BaseEntity {
  name: string;
  description?: string;
  location?: string; // Add location field
  requiresApproval?: boolean;
  maxParticipants?: number | null;
  categoryId: string;
  organizationId: string;
  startDate?: string; // Keep camelCase for frontend
  endDate?: string;   // Keep camelCase for frontend
  totalDays?: number;
  status: ActivityStatus;
  
  // Relations
  category?: CtxhCategory;
  organization?: {
    id: string;
    name: string;
  };
  _count?: {
    participations: number;
  };
}

export interface CreateActivityRequest {
  name: string;
  description?: string;
  location?: string; // Add location field
  requiresApproval?: boolean;
  maxParticipants?: number | null;
  categoryId: string;
  organizationId: string;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
}

export interface UpdateActivityRequest {
  name?: string;
  description?: string;
  location?: string; // Add location field
  requiresApproval?: boolean;
  maxParticipants?: number | null;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  status?: ActivityStatus;
}

// Participation interfaces
export interface CtxhParticipation extends BaseEntity {
  activityId: string;
  studentId: string;
  actualDays?: number;
  status: ParticipationStatus;
  note?: string;
  gradedBy?: string;
  
  // Relations
  activity?: CtxhActivity;
  student?: {
    id: string;
    code: string;
    fullname: string;
    email: string;
  };
  grader?: {
    id: string;
    fullname: string;
  };
}

// Backend API response format for participants
export interface ParticipationResponse {
  id: string;
  activity_id: string;
  student_id: string;
  student_code?: string;
  actual_days?: number;
  status?: string;
  note?: string;
  graded_by?: string;
  graded_at?: string;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    student_code: string;
    full_name: string;
    email: string;
  };
}

export interface AddStudentRequest {
  student_code: string;
}

export interface GradeParticipantRequest {
  participation_id: string;
  actual_days: number;
  note?: string;
}

export interface GradeParticipantsRequest {
  participants: GradeParticipantRequest[];
}

// Limit Config interfaces
export interface CtxhLimitConfig extends BaseEntity {
  organizationId: string;
  maxDays: number;
  status: LimitConfigStatus;
  
  // Relations
  organization?: {
    id: string;
    name: string;
  };
}

export interface CreateLimitConfigRequest {
  organization_id: string;
  max_days: number; // Updated field name
  description?: string;
  status?: LimitConfigStatus;
}

export interface UpdateLimitConfigRequest {
  max_days?: number; // Updated field name
  status?: LimitConfigStatus;
  description?: string;
}

// Reports interfaces
export interface StudentReportActivity {
  id: string;
  name: string;
  category_name: string;
  actual_days: number;
  status: string;
  activity_start_date?: string;
  activity_end_date?: string;
  graded_by?: string;
  graded_at?: string;
  note?: string;
}

export interface StudentReport {
  student: {
    id: string;
    code: string;
    fullname: string;
    email: string;
  };
  summary: {
    total_activities: number;
    total_days: number;
    completed_activities: number;
    registered_activities: number;
  };
  activities: StudentReportActivity[];
  categories_summary: Array<{
    category_name: string;
    activities_count: number;
    total_days: number;
  }>;
}

export interface SystemReportStats {
  total_activities: number;
  active_activities: number;
  completed_activities: number;
  total_students_participated: number;
  total_days_granted: number;
  total_categories: number;
}

export interface SystemReport {
  statistics: SystemReportStats;
  categories_summary: Array<{
    id: string;
    name: string;
    activities_count: number;
    students_count: number;
    total_days_granted: number;
    organization_name?: string;
  }>;
  recent_activities: Array<{
    id: string;
    name: string;
    status: ActivityStatus;
    participants_count: number;
    organization_name: string;
    created_at: string;
  }>;
}

// Query parameters
export interface CategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ActivityQueryParams {
  page?: number;
  limit?: number;
  category_id?: string;
  organization_id?: string;
  status?: ActivityStatus;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface LimitConfigQueryParams {
  page?: number;
  limit?: number;
  organization_id?: string;
  status?: LimitConfigStatus;
  search?: string;
}

// Pagination response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Excel processing types
export interface ExcelValidationResult {
  successful: Array<{
    studentCode: string;
    message: string;
  }>;
  failed: Array<{
    studentCode: string;
    error: string;
  }>;
}

// UI-specific types
export interface ActivityFilters {
  categoryId?: string;
  organizationId?: string;
  status?: ActivityStatus;
  search?: string;
}

export interface CategoryListItem extends CtxhCategory {
  isDeleted?: boolean;
  canRestore?: boolean;
}

export interface ActivityListItem extends CtxhActivity {
  isDeleted?: boolean;
  canRestore?: boolean;
  participantsCount?: number;
}

// Form validation
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isLoading: boolean;
  isValid: boolean;
}