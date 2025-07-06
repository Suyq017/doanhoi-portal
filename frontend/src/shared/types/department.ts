export interface Department {
    id: string;
    name: string;
    code?: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    managementUsers?: any[];
    trainingUsers?: any[];
}

export interface CreateDepartmentRequest {
    name: string;
    code?: string;
    description?: string;
    isActive?: boolean;
}

export interface UpdateDepartmentRequest extends Partial<CreateDepartmentRequest> { }

export interface DepartmentsResponse {
    departments: Department[];
    total: number;
}

export interface DepartmentQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}

export interface DepartmentImportData {
    name: string;
    code?: string;
    description?: string;
    isActive?: boolean;
}

// New types for server-side import
export interface ImportUploadResponseDepartment {
    sessionId: string;
    fileName: string;
    totalRows: number;
    message: string;
}

export interface ImportValidationResponseDepartment {
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
        name: string;
        code?: string;
        description?: string;
        hasErrors: boolean;
        hasWarnings: boolean;
        errors: any[];
        warnings: any[];
    }>;
}

export interface ImportExecuteResponseDepartment {
    sessionId: string;
    success: boolean;
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: string[];
    message: string;
}