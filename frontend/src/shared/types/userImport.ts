// User Import Data Types
// Maps to backend UserImportData interface from excel-parser.service.ts

export interface UserImportData {
  // Required fields
  familyName: string;
  givenName: string;
  code: string; // Mã số sinh viên/cán bộ
  
  // Optional basic fields
  email?: string | null; // Allow null for "*" values
  password?: string;
  phone?: string;
  
  // Class and department information
  className?: string;  // Changed from classCode to className since Class entity uses name
  managementDepartment?: string;
  trainingDepartment?: string;
  organizationCodes?: string; // "ORG1;ORG2;ORG3"
  
  // User classification
  userType?: 'student' | 'staff';
  membershipStatus?: 'doan_vien' | 'hoi_vien' | 'both' | 'none' | 'ACTIVE' | 'INACTIVE' | 'GRADUATED';
  isActive?: boolean;
  
  // Enhanced fields from enhanced-import.service
  identityCard?: string;
  birthDate?: Date | string;
  gender?: 'NAM' | 'NU';
  admissionYear?: string;
  curriculumYear?: string;
  facultyCode?: string;
  trainingSystem?: string;
  trainingLevel?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  type: 'validation' | 'business' | 'system';
}

export interface ValidationResult {
  isValid: boolean;
  data: UserImportData[];
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
}

// Batch processing interfaces
export interface BatchInfo {
  batchNumber: number;
  totalBatches: number;
  sessionId: string;
}

export interface ProgressInfo {
  currentBatch: number;
  totalBatches: number;
  processedRecords: number;
  totalRecords: number;
  percentage: number;
  currentOperation: 'parsing' | 'validating' | 'importing';
}

export interface BatchResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  sessionSummary: {
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
    isComplete: boolean;
  };
  errors: string[];
}

export interface ImportBatch {
  id: string;
  data: UserImportData[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  errors?: ValidationError[];
}