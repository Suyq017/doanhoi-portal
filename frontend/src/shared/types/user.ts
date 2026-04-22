import { UserRole } from './permission';
import { UserOrganization } from './organization';

export interface User {
    id: string;
    code: string;
    familyName: string;
    givenName: string;
    fullname: string;
    email: string;
    phone: string;
    password?: string;
    googleId?: string;
    userType: 'student' | 'staff';
    membershipStatus: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
    managementDepartment?: any;
    trainingDepartment?: any;
    facultyCode?: string;
    class?: any;
    userRoles?: UserRole[];
    organizations?: UserOrganization[];
}

export interface UserQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    userType?: 'student' | 'staff';
    membershipStatus?: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
}

// NEW: Interface for role-organization assignments
export interface UserRoleAssignment {
    roleId: string;
    organizationId?: string;
    isActive?: boolean;
}

// NEW: Interface for UI state management
export interface RoleAssignmentItem extends UserRoleAssignment {
    id: string; // Temporary ID for UI management
    isValid?: boolean; // For UI validation
    error?: string; // Error message if invalid
}

export interface CreateUserRequest {
    code: string;
    familyName: string;
    givenName: string;
    email: string;
    phone: string;
    password?: string;
    userType?: 'student' | 'staff';
    membershipStatus?: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
    managementDepartmentId?: string;
    trainingDepartmentId?: string;
    classId?: string;

    // NEW: Additional user fields
    identityCard?: string;
    birthDate?: string;
    gender?: 'male' | 'female' | 'other';
    admissionYear?: string;
    curriculumYear?: string;
    facultyCode?: string;
    trainingSystem?: string;
    trainingLevel?: string;
    isActive?: boolean;

    // NEW: Multiple role-organization assignments (preferred)
    roleAssignments?: UserRoleAssignment[];
    // DEPRECATED: Keep for backward compatibility
    roleId?: string;
    roles?: string[]; // Array of role IDs - legacy field
    organizationId?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
    roles?: string[]; // Array of role IDs
}

export interface UsersResponse {
    users: User[];
    total: number;
}

// Import types
export interface ImportUploadResponse {
    sessionId: string;
    fileName: string;
    totalRows: number;
    message: string;
}

export interface ImportValidationResponse {
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
    previewData: any[]; // Changed from validationResults to previewData
    canProceed: boolean;
}

export interface ImportExecuteResponse {
    sessionId: string;
    success: boolean;
    message: string;
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: string[];
}

export interface ImportSession {
    id: string;
    fileName: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    status: 'pending' | 'validated' | 'importing' | 'completed' | 'failed';
    createdAt: string;
    completedAt?: string;
    errorMessage?: string;
    results?: any;
}

// Batch Import Types (Phase 4)
export interface BatchImportRequest {
    users: UserImportDto[];
    options: ImportOptionsDto;
    batchInfo: BatchInfoDto;
}

export interface UserImportDto {
    code: string;
    familyName: string;
    givenName: string;
    email?: string;
    phone?: string;
    gender?: string;
    birthDate?: string;
    identityCard?: string;
    admissionYear?: string;
    curriculumYear?: string;
    facultyCode?: string;
    trainingSystem?: string;
    trainingLevel?: string;
    trainingDepartment?: string;
    managementDepartment?: string;
    className?: string;
}

export interface ImportOptionsDto {
    skipDuplicates: boolean;
    updateExisting: boolean;
}

export interface BatchInfoDto {
    sessionId: string;
    batchNumber: number;
    totalBatches: number;
}

export interface BatchImportResponse {
    success: boolean;
    batchResult: BatchResultDto;
    sessionSummary: SessionSummaryDto;
    message: string;
}

export interface BatchResultDto {
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
}

export interface SessionSummaryDto {
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
    isComplete: boolean;
    processingTime: number;
}