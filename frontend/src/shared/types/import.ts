export interface ValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult<T> {
  data: (T & { 
    _rowIndex: number; 
    _hasError: boolean; 
    _errors: ValidationError[];
    _warnings: ValidationError[];
  })[];
  errors: ValidationError[];
  warnings: ValidationError[];
  isValid: boolean;
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  details?: {
    successIds: string[];
    failedRows: number[];
    duplicates: number[];
  };
}

export interface ImportOptions {
  skipErrors: boolean;
  updateExisting: boolean;
  dryRun?: boolean;
  batchSize?: number;
}

// Server-side import types
export interface ServerImportSession {
  sessionId: string;
  fileName: string;
  totalRows: number;
  message: string;
}

export interface ServerValidationResult {
  sessionId: string;
  isValid: boolean;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    conflicts: number;
  };
  errors: ValidationError[];
  warnings: ValidationError[];
  previewData: any[];
}

export interface ServerImportResult {
  sessionId: string;
  success: boolean;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  message: string;
}

export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'number' | 'boolean' | 'date' | 'email' | 'select';
  validator?: (value: any, row: any) => string | null;
  formatter?: (value: any) => any;
  selectOptions?: { value: string; label: string }[];
  width?: string;
}

// Enhanced config interface supporting both client-side and server-side processing
export interface ImportModalConfig<T> {
  // Template & File handling
  templateUrl: string;
  templateFileName: string;
  acceptedFileTypes: string[];
  maxFileSize: number;
  
  // Processing mode: 'client' for legacy, 'server' for new implementation
  processingMode: 'client' | 'server';
  
  // Client-side data processing functions (legacy)
  parseFile?: (file: File) => Promise<T[]>;
  validateData?: (data: T[]) => Promise<ValidationResult<T>>;
  importData?: (data: T[], options?: ImportOptions) => Promise<ImportResult>;
  
  // Server-side data processing functions (new)
  uploadFile?: (file: File) => Promise<ServerImportSession>;
  validateServerData?: (sessionId: string) => Promise<ServerValidationResult>;
  executeServerImport?: (sessionId: string, options?: { skipConflicts?: boolean }) => Promise<ServerImportResult>;
  getImportStatus?: (sessionId: string) => Promise<any>;
  
  // UI Configuration
  columns: ImportColumn[];
  entityName: string; // Used for i18n keys like 'departments', 'users', 'classes'
  previewRowCount?: number;
  allowPartialImport?: boolean;
  
  // Optional callbacks
  onSuccess?: (result: ImportResult | ServerImportResult) => void;
  onError?: (error: Error) => void;
  onValidationComplete?: (result: ValidationResult<T> | ServerValidationResult) => void;
}

export type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

export interface ImportState<T> {
  step: ImportStep;
  selectedFile: File | null;
  importData: ValidationResult<T> | null;
  importResult: ImportResult | null;
  
  // Server-side state
  serverSession: ServerImportSession | null;
  serverValidation: ServerValidationResult | null;
  serverResult: ServerImportResult | null;
  
  options: ImportOptions;
  loading: boolean;
  dragActive: boolean;
}
