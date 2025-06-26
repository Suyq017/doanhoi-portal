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

export interface ImportModalConfig<T> {
  // Template & File handling
  templateUrl: string;
  templateFileName: string;
  acceptedFileTypes: string[];
  maxFileSize: number;
  
  // Data processing functions
  parseFile: (file: File) => Promise<T[]>;
  validateData: (data: T[]) => Promise<ValidationResult<T>>;
  importData: (data: T[], options?: ImportOptions) => Promise<ImportResult>;
  
  // UI Configuration
  columns: ImportColumn[];
  entityName: string; // Used for i18n keys like 'departments', 'users', 'classes'
  previewRowCount?: number;
  allowPartialImport?: boolean;
  
  // Optional callbacks
  onSuccess?: (result: ImportResult) => void;
  onError?: (error: Error) => void;
  onValidationComplete?: (result: ValidationResult<T>) => void;
}

export type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

export interface ImportState<T> {
  step: ImportStep;
  selectedFile: File | null;
  importData: ValidationResult<T> | null;
  importResult: ImportResult | null;
  options: ImportOptions;
  loading: boolean;
  dragActive: boolean;
}
