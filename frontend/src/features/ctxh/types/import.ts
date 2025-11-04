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
