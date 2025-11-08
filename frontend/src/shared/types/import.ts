export interface ValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
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

// Client-side import types
export interface ClientValidationResult {
  isValid: boolean;
  data: any[];
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
}

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

export interface ClientImportResult {
  success: boolean;
  sessionSummary: {
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
    isComplete: boolean;
  };
  errors: string[];
}

// Enhanced config interface supporting both server-side and client-side processing
export interface ImportModalConfig {
  // Template & File handling
  templateUrl?: string;
  templateFileName?: string;
  downloadTemplate?: () => void;
  acceptedFileTypes: string[];
  maxFileSize: number;

  // Processing mode
  useClientSideProcessing?: boolean;
  enableBatchProcessing?: boolean;
  batchSize?: number;

  // Server-side data processing functions (legacy)
  uploadFile?: (file: File) => Promise<ServerImportSession>;
  validateServerData?: (sessionId: string) => Promise<ServerValidationResult>;
  executeServerImport?: (sessionId: string, options?: { skipConflicts?: boolean }) => Promise<ServerImportResult>;
  getImportStatus?: (sessionId: string) => Promise<any>;

  // Client-side data processing functions (new)
  parseFile?: (file: File, onProgress?: (progress: number) => void) => Promise<any[]>;
  validateClientData?: (
    data: any[], 
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void
  ) => Promise<ClientValidationResult>;
  submitClientData?: (data: any[], onProgress?: (progress: ProgressInfo) => void) => Promise<ClientImportResult>;

  // UI Configuration
  columns: ImportColumn[];
  entityName: string; // Used for i18n keys like 'departments', 'users', 'classes'
  previewRowCount?: number;
  allowPartialImport?: boolean;

  // Optional callbacks
  onSuccess?: (result: ServerImportResult | ClientImportResult) => void;
  onError?: (error: Error) => void;
  onValidationComplete?: (result: ServerValidationResult) => void;
}

export type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

export interface ImportState {
  step: ImportStep;
  selectedFile: File | null;

  // Server-side state (legacy)
  serverSession: ServerImportSession | null;
  serverValidation: ServerValidationResult | null;
  serverResult: ServerImportResult | null;

  // Client-side state (new)
  clientData: any[] | null;
  clientValidation: ClientValidationResult | null;
  clientResult: ClientImportResult | null;
  
  // Batch processing state
  batchProgress: ProgressInfo | null;
  sessionId: string | null;
  totalRecords: number | null;
  isBatchProcessing: boolean;

  options: ImportOptions;
  loading: boolean;
  dragActive: boolean;
}
