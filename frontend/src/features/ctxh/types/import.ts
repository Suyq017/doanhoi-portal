export interface OldSystemCtxhRecord {
  studentCode: string;
  days: number;
}

export interface ImportOldSystemCtxhRequest {
  records: OldSystemCtxhRecord[];
}

export interface ImportOldSystemCtxhResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
  message: string;
}

export interface ValidateOldSystemCtxhRequest {
  records: OldSystemCtxhRecord[];
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidateOldSystemCtxhResult {
  isValid: boolean;
  total: number;
  valid: number;
  invalid: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}
