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
  data?: any[]; // For local processing
  previewData?: any[]; // For local processing preview
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

// Enhanced config interface for server-side processing only
export interface ImportModalConfig {
  // Template & File handling
  templateUrl?: string;
  templateFileName: string;
  downloadTemplate?: () => Promise<void>;
  acceptedFileTypes: string[];
  maxFileSize: number;

  // Server-side data processing functions
  uploadFile: (file: File) => Promise<ServerImportSession>;
  validateServerData: (sessionId: string) => Promise<ServerValidationResult>;
  executeServerImport: (sessionId: string, options?: { skipConflicts?: boolean }) => Promise<ServerImportResult>;
  getImportStatus?: (sessionId: string) => Promise<any>;

  // UI Configuration
  title?: string; // Custom title for the modal
  columns: ImportColumn[];
  entityName: string; // Used for i18n keys like 'departments', 'users', 'classes'
  previewRowCount?: number;
  allowPartialImport?: boolean;
  instructions?: string[]; // Custom instructions for upload process

  // Optional callbacks
  onSuccess?: (result: ServerImportResult) => void;
  onError?: (error: Error) => void;
  onValidationComplete?: (result: ServerValidationResult) => void;
}

export type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

export interface ImportState {
  step: ImportStep;
  selectedFile: File | null;
  // Remove client-side fields
  importData: null;
  importResult: null;

  // Server-side state
  serverSession: ServerImportSession | null;
  serverValidation: ServerValidationResult | null;
  serverResult: ServerImportResult | null;

  options: ImportOptions;
  loading: boolean;
  dragActive: boolean;
}
