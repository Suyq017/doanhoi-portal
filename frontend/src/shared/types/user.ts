export interface User {
    id: string;
    code: string;
    familyName: string;
    givenName: string;
    email: string;
    phone: string;
    password?: string;
    googleId?: string;
    userType: 'student' | 'staff';
    membershipStatus: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
    createdAt: string;
    updatedAt: string;
    managementDepartment?: any;
    trainingDepartment?: any;
    class?: any;
}
export interface UserQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    userType?: 'student' | 'staff';
    membershipStatus?: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
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
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> { }

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
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> { }

export interface UsersResponse {
    users: User[];
    total: number;
}

export interface UserQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    userType?: 'student' | 'staff';
    membershipStatus?: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
}