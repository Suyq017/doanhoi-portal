import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { UserImportData } from "./excel-parser.service";
import { UserValidationResult } from "./import-validation.service";

export interface BatchProcessingStatus {
  currentBatch: number;
  totalBatches: number;
  processedRows: number;
  totalRows: number;
  batchSize: number;
  canPause: boolean;
  canResume: boolean;
  isPaused: boolean;
  batchResults: BatchResult[];
}

export interface BatchResult {
  batchNumber: number;
  status: "pending" | "processing" | "success" | "failed";
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  errors: string[];
  warnings: string[];
  retryCount: number;
  startTime?: Date;
  endTime?: Date;
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
    | "failed";
  data?: UserImportData[];
  validationResult?: UserValidationResult[];
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
  private sessions = new Map<string, ImportSession>();
  private readonly SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours (increased from 30 minutes)
  private readonly DEFAULT_BATCH_SIZE = 200;

  createSession(fileName: string, data: UserImportData[]): ImportSession {
    const sessionId = this.generateSessionId();
    const now = new Date();

    const session: ImportSession = {
      id: sessionId,
      fileName,
      uploadedAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TIMEOUT),
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

    this.sessions.set(sessionId, session);
    return session;
  }

  updateSessionValidation(
    sessionId: string,
    validationResults: UserValidationResult[],
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.validationResult = validationResults;
      session.status = "validated";
      session.metadata.validRows = validationResults.filter(
        (r) => r.validation.isValid,
      ).length;
      session.metadata.invalidRows = validationResults.filter(
        (r) => !r.validation.isValid,
      ).length;
      session.metadata.errorCount = validationResults.reduce(
        (count, r) => count + r.validation.errors.length,
        0,
      );
      session.metadata.warningCount = validationResults.reduce(
        (count, r) => count + r.validation.warnings.length,
        0,
      );
    }
  }

  getSession(sessionId: string): ImportSession | null {
    const session = this.sessions.get(sessionId);
    if (session && session.expiresAt < new Date()) {
      // Session expired, remove it
      this.sessions.delete(sessionId);
      return null;
    }
    return session || null;
  }

  updateImportResult(sessionId: string, result: ImportResult): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.importResult = result;
      session.status = result.success ? "imported" : "failed";
    }
  }

  getValidatedData(sessionId: string): UserValidationResult[] {
    const session = this.sessions.get(sessionId);
    if (!session || !session.validationResult) {
      return [];
    }
    return session.validationResult.filter((item) => item.validation.isValid);
  }

  getAllSessions(): ImportSession[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
    );
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private generateSessionId(): string {
    return uuidv4();
  }

  initializeBatchProcessing(
    sessionId: string,
    totalRows: number,
    batchSize: number = this.DEFAULT_BATCH_SIZE,
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const totalBatches = Math.ceil(totalRows / batchSize);
    const batchResults: BatchResult[] = [];

    for (let i = 0; i < totalBatches; i++) {
      batchResults.push({
        batchNumber: i + 1,
        status: "pending",
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        errors: [],
        warnings: [],
        retryCount: 0,
      });
    }

    session.batchProcessing = {
      currentBatch: 0,
      totalBatches,
      processedRows: 0,
      totalRows,
      batchSize,
      canPause: true,
      canResume: false,
      isPaused: false,
      batchResults,
    };

    session.status = "importing";
    return true;
  }

  updateBatchProgress(
    sessionId: string,
    batchNumber: number,
    result: Partial<BatchResult>,
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session?.batchProcessing) {
      return false;
    }

    const batchIndex = batchNumber - 1;
    if (
      batchIndex >= 0 &&
      batchIndex < session.batchProcessing.batchResults.length
    ) {
      const batchResult = session.batchProcessing.batchResults[batchIndex];
      Object.assign(batchResult, result);

      // Update overall progress
      session.batchProcessing.currentBatch = batchNumber;
      session.batchProcessing.processedRows += result.processedRows || 0;

      return true;
    }

    return false;
  }

  pauseImport(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session?.batchProcessing) {
      return false;
    }

    session.batchProcessing.isPaused = true;
    session.batchProcessing.canResume = true;
    session.status = "paused";
    return true;
  }

  resumeImport(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session?.batchProcessing) {
      return false;
    }

    session.batchProcessing.isPaused = false;
    session.batchProcessing.canResume = false;
    session.status = "importing";
    return true;
  }

  finalizeBatchProcessing(sessionId: string, success: boolean): boolean {
    const session = this.getSession(sessionId);
    if (!session?.batchProcessing) {
      return false;
    }

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
        (batch) => batch.status === "pending",
      ) || null
    );
  }
}
