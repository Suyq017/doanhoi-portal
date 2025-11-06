// Payment Campaign Types
import { User } from '../../../shared/types/index'

export interface PaymentCampaign {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  // Relationships
  organization?: Organization;
  feeLevels?: PaymentFeeLevel[];
  assignments?: PaymentAssignment[];
  createdByUser?: User;
}

export interface CreatePaymentCampaignDto {
  organizationId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

export interface UpdatePaymentCampaignDto {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

// Payment Fee Level Types
export interface PaymentFeeLevel {
  id: string;
  campaignId: string;
  levelName: string;
  amount: number;
  description: string;
  createdAt: string;
  updatedAt: string;

  // Relationships
  campaign?: PaymentCampaign;
  assignments?: PaymentAssignment[];
}

export interface CreatePaymentFeeLevelDto {
  levelName: string;
  amount: number;
  description: string;
}

export interface UpdatePaymentFeeLevelDto {
  levelName?: string;
  amount?: number;
  description?: string;
  note?: string;
  isDefault?: boolean;
  orderIndex?: number;
}

// Payment Assignment Types
export interface PaymentAssignment {
  id: string;
  campaignId: string;
  userId: string;
  feeLevelId?: string;
  note: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  dueDate?: string;
  assignedAt: string;
  paidAt?: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
  assignments?: PaymentAssignment[];
  // Relationships
  campaign?: PaymentCampaign;
  user?: User;
  feeLevel?: PaymentFeeLevel;
  assignedByUser?: User;
}

export interface CreatePaymentAssignmentDto {
  campaignId: string;
  userId: string;
  feeLevelId?: string;
  note?: string;
  dueDate?: string;
}

export interface CreateBulkPaymentAssignmentDto {
  campaignId: string;
  userIds: string[];
  feeLevelId?: string;
  note?: string;
  dueDate?: string;
}

export interface CreateMultiplePaymentAssignmentDto {
  campaignId: string;
  assignments: {
    userId: string;
    feeLevelId?: string;
    note?: string;
  }[];
  dueDate?: string;
}

// Organization PayOS Config Types
export interface OrganizationPayOSConfig {
  id: string;
  organizationId: string;
  clientId: string;
  apiKey: string; // Will be encrypted in backend
  checksumKey: string; // Will be encrypted in backend
  isActive: boolean;
  webhookUrl?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;

  // Relationships
  organization?: Organization;
}

export interface CreateOrganizationPayOSConfigDto {
  organizationId: string;
  clientId: string;
  apiKey: string;
  checksumKey: string;
  webhookUrl?: string;
  note?: string;
}

export interface UpdateOrganizationPayOSConfigDto {
  clientId?: string;
  apiKey?: string;
  checksumKey?: string;
  isActive?: boolean;
  webhookUrl?: string;
  note?: string;
}

// Existing Types (from current system)
export interface Organization {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId?: string;
  level: number;
  path: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Relationships
  parent?: Organization;
  children?: Organization[];
  users?: User[];
}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  isActive: boolean;
  joinedAt: string;

  // Relationships
  user?: User;
  organization?: Organization;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Payment Campaign specific paginated response (uses 'campaigns' key)
export interface PaymentCampaignPaginatedResponse {
  campaigns: PaymentCampaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Generic paginated response (uses 'data' key)
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
}

// Filter and Query Types
export interface PaymentCampaignFilters {
  organizationId?: string;
  status?: PaymentCampaign['status'];
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaymentAssignmentFilters {
  campaignId?: string;
  userId?: string;
  organizationId?: string;
  status?: PaymentAssignment['status'];
  feeLevelId?: string;
  page?: number;
  limit?: number;
}

export interface PaymentStatistics {
  campaignId: string;
  totalAssignments: number;
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentRate: number; // percentage
}

// Form Types
export interface PaymentCampaignFormData {
  organizationId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  feeLevels: PaymentFeeLevelFormData[];
}

export interface PaymentFeeLevelFormData {
  levelName: string;
  amount: number;
  description: string;
  note: string;
  isDefault: boolean;
  orderIndex: number;
}

export interface PaymentAssignmentFormData {
  campaignId: string;
  selectedUsers: string[];
  feeLevelId?: string;
  note?: string;
  dueDate?: string;
}

// UI State Types
export interface PaymentCampaignListState {
  campaigns: PaymentCampaign[];
  loading: boolean;
  error: string | null;
  filters: PaymentCampaignFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentAssignmentListState {
  assignments: PaymentAssignment[];
  loading: boolean;
  error: string | null;
  filters: PaymentAssignmentFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentProcessState {
  assignment: PaymentAssignment | null;
  qrCode: string | null;
  checkoutUrl: string | null;
  status: 'idle' | 'creating' | 'pending' | 'completed' | 'failed';
  error: string | null;
}
