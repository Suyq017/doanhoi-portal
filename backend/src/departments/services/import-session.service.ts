import { Injectable } from "@nestjs/common";
import { DepartmentImportData } from "./excel-parser.service";
import {
  ValidationResult,
  DepartmentImportDataWithValidation,
} from "./import-validation.service";

export interface BatchProcessingStatus {
  currentBatch: number;
  totalBatches: number;
  processedRows: number;
  totalRows: number;
  batchSize: number;
  batchResults: BatchResult[];
  batches: any[];
  errors: string[];
  startTime?: Date;
  endTime?: Date;
  canPause: boolean;
  canResume: boolean;
  isPaused: boolean;
}

export interface BatchResult {
  batchNumber: number;
  status: "pending" | "processing" | "success" | "failed";
  startTime?: Date;
  endTime?: Date;
  processedRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: string[];
  retryCount: number;
  maxRetries: number;
}

export interface ImportSession {
  id: string;
  fileName: string;
  uploadedAt: Date;
  expiresAt: Date;
  status:
    | "uploaded"
    | "validated"
    | "importing"
    | "paused"
    | "imported"
    | "failed"
    | "cancelled";
  data?: DepartmentImportData[];
  validationResult?: ValidationResult;
  importResult?: ImportResult;
  batchProcessing?: BatchProcessingStatus;
  metadata: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  importedIds: string[];
}

@Injectable()
export class ImportSessionService {
  private sessions: Map<string, ImportSession> = new Map();
  private readonly SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  constructor() {
    // Clean up expired sessions every hour
    setInterval(
      () => {
        this.cleanupExpiredSessions();
      },
      60 * 60 * 1000,
    );
  }

  createSession(fileName: string, data: DepartmentImportData[]): ImportSession {
    const session: ImportSession = {
      id: this.generateSessionId(),
      fileName,
      uploadedAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT),
      status: "uploaded",
      data,
      metadata: {
        totalRows: data.length,
        validRows: 0,
        invalidRows: 0,
        errorCount: 0,
        warningCount: 0,
      },
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): ImportSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  updateSessionValidation(
    sessionId: string,
    validationResult: ValidationResult,
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    session.validationResult = validationResult;
    session.status = "validated";
    session.metadata.validRows = validationResult.summary.valid;
    session.metadata.invalidRows = validationResult.summary.invalid;
    session.metadata.errorCount = validationResult.errors.length;
    session.metadata.warningCount = validationResult.warnings.length;

    return true;
  }

  getValidatedData(
    sessionId: string,
  ): DepartmentImportDataWithValidation[] | null {
    const session = this.getSession(sessionId);
    if (!session?.validationResult) {
      return null;
    }

    return session.validationResult.data;
  }

  updateSessionImport(sessionId: string, importResult: ImportResult): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    session.importResult = importResult;
    session.status = importResult.success ? "imported" : "failed";
    return true;
  }

  updateSessionStatus(
    sessionId: string,
    status: ImportSession["status"],
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    session.status = status;
    return true;
  }

  initializeBatchProcessing(
    sessionId: string,
    totalBatches: number,
    totalRows: number,
    batchSize: number = 200,
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const batchResults: BatchResult[] = [];
    for (let i = 0; i < totalBatches; i++) {
      batchResults.push({
        batchNumber: i + 1,
        status: "pending",
        processedRows: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errors: [],
        retryCount: 0,
        maxRetries: 3,
      });
    }

    session.batchProcessing = {
      currentBatch: 0,
      totalBatches,
      processedRows: 0,
      totalRows,
      batchSize,
      batchResults,
      batches: [],
      errors: [],
      startTime: new Date(),
      canPause: true,
      canResume: false,
      isPaused: false,
    };

    session.status = "importing";
    return true;
  }

  updateBatchProgress(
    sessionId: string,
    batchNumber: number,
    processedRows: number,
  ): boolean;
  updateBatchProgress(
    sessionId: string,
    batchNumber: number,
    result: Partial<BatchResult>,
  ): boolean;
  updateBatchProgress(
    sessionId: string,
    batchNumber: number,
    resultOrProcessedRows: Partial<BatchResult> | number,
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session?.batchProcessing) {
      return false;
    }

    // Handle both parameter types
    let result: Partial<BatchResult>;
    if (typeof resultOrProcessedRows === "number") {
      result = { processedRows: resultOrProcessedRows };
    } else {
      result = resultOrProcessedRows;
    }

    const batchIndex = batchNumber - 1;
    if (
      batchIndex >= 0 &&
      batchIndex < session.batchProcessing.batchResults.length
    ) {
      const batchResult = session.batchProcessing.batchResults[batchIndex];

      // Update batch result
      Object.assign(batchResult, result);

      // Update overall progress
      session.batchProcessing.currentBatch = batchNumber;
      session.batchProcessing.processedRows += result.processedRows || 0;

      // Update session status based on batch status
      if (result.status === "success") {
        batchResult.endTime = new Date();
      } else if (result.status === "failed") {
        batchResult.endTime = new Date();
        // Check if we should retry
        if (batchResult.retryCount < batchResult.maxRetries) {
          batchResult.status = "pending";
          batchResult.retryCount++;
        }
      }

      return true;
    }

    return false;
  }

  pauseImport(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session?.batchProcessing || !session.batchProcessing.canPause) {
      return false;
    }

    session.status = "paused";
    session.batchProcessing.isPaused = true;
    session.batchProcessing.canPause = false;
    session.batchProcessing.canResume = true;

    return true;
  }

  resumeImport(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session?.batchProcessing || !session.batchProcessing.canResume) {
      return false;
    }

    session.status = "importing";
    session.batchProcessing.isPaused = false;
    session.batchProcessing.canPause = true;
    session.batchProcessing.canResume = false;

    return true;
  }

  finalizeBatchProcessing(sessionId: string, success: boolean): boolean {
    const session = this.getSession(sessionId);
    if (!session?.batchProcessing) {
      return false;
    }

    session.batchProcessing.endTime = new Date();
    session.batchProcessing.canPause = false;
    session.batchProcessing.canResume = false;
    session.status = success ? "imported" : "failed";

    return true;
  }

  getBatchProgress(sessionId: string): BatchProcessingStatus | null {
    const session = this.getSession(sessionId);
    return session?.batchProcessing || null;
  }

  getNextPendingBatch(sessionId: string): BatchResult | null {
    const session = this.getSession(sessionId);
    if (!session?.batchProcessing) {
      return null;
    }

    return (
      session.batchProcessing.batchResults.find(
        (batch) =>
          batch.status === "pending" ||
          (batch.status === "failed" && batch.retryCount < batch.maxRetries),
      ) || null
    );
  }

  private generateSessionId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log(
        `Cleaned up ${expiredSessions.length} expired import sessions`,
      );
    }
  }
}
