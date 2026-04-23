export interface Class {
    id: string;
    name: string;
    code?: string;
    year?: number;
    department?: {
        id: string;
        name: string;
        code?: string;
    };
    students?: any[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateClassRequest {
    name: string;
    code?: string;
    year?: number;
    departmentId?: string;
    isActive?: boolean;
}

export interface UpdateClassRequest extends Partial<CreateClassRequest> { }

export interface ClassesResponse {
    classes: Class[];
    total: number;
}

export interface ClassQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    year?: number;
    departmentId?: string;
    isActive?: boolean;
}

export interface ClassImportData {
    name: string;
    code?: string;
    year?: number;
    departmentCode?: string;
    isActive?: boolean;
}

// New types for server-side import
export interface ImportUploadResponseClass {
    sessionId: string;
    fileName: string;
    totalRows: number;
    message: string;
}

export interface ImportValidationResponseClass {
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
    previewData: any[];
}

export interface ImportExecuteResponseClass {
    sessionId: string;
    success: boolean;
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: string[];
    message: string;
}
