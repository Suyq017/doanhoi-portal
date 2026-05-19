// Organization Import Types
export interface Level2ImportData {
  studentCode: string;      // Mã số sinh viên
  classOrUnitCode: string;  // Mã lớp/đơn vị
}

export interface Level3ImportData {
  studentCode: string;      // Mã số sinh viên
}

export interface OrganizationMemberImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: string[];
  warnings: string[];
}

export interface ImportUploadResponse {
  sessionId: string;
  filename: string;
  totalRows: number;
}

export interface ImportValidationResponse {
  sessionId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validRows: number;
  invalidRows: number;
  data?: any[];
}

export interface ImportExecuteResponse {
  sessionId: string;
  result: OrganizationMemberImportResult;
}
