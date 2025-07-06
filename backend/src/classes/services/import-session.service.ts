import { Injectable } from '@nestjs/common';
import { ClassImportData } from './excel-parser.service';
import { ValidationResult, ClassImportDataWithValidation } from './import-validation.service';

export interface BatchProcessingStatus {
  currentBatch: number;
  totalBatches: number;
  processedRows: number;
  batchSize: number;
  batchResults: BatchResult[];
  startTime?: Date;
  endTime?: Date;
  canPause: boolean;
  canResume: boolean;
  isPaused: boolean;
}

export interface BatchResult {
  batchNumber: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
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
  status: 'uploaded' | 'validated' | 'importing' | 'paused' | 'imported' | 'failed';
  data?: ClassImportData[];
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
  private sessions = new Map<string, ImportSession>();
  private readonly SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours (increased from 30 minutes)
  private readonly DEFAULT_BATCH_SIZE = 200;

  createSession(fileName: string, data: ClassImportData[]): ImportSession {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session: ImportSession = {
      id: sessionId,
      fileName,
      uploadedAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TIMEOUT),
      status: 'uploaded',
      data,
      metadata: {
        totalRows: data.length,
        validRows: 0,
        invalidRows: 0,
        errorCount: 0,
        warningCount: 0
      }
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): ImportSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  updateSessionValidation(sessionId: string, validationResult: ValidationResult): ImportSession | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    session.status = 'validated';
    session.validationResult = validationResult;
    session.metadata = {
      ...session.metadata,
      validRows: validationResult.summary.valid,
      invalidRows: validationResult.summary.invalid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length
    };

    return session;
  }

  updateSessionImport(sessionId: string, importResult: ImportResult): ImportSession | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    session.status = importResult.success ? 'imported' : 'failed';
    session.importResult = importResult;

    return session;
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  getSessionMetadata(sessionId: string): ImportSession['metadata'] | null {
    const session = this.getSession(sessionId);
    return session ? session.metadata : null;
  }

  getValidatedData(sessionId: string): ClassImportDataWithValidation[] | null {
    const session = this.getSession(sessionId);
    return session?.validationResult?.data || null;
  }

  initializeBatchProcessing(sessionId: string, totalRows: number, batchSize: number = this.DEFAULT_BATCH_SIZE): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const totalBatches = Math.ceil(totalRows / batchSize);
    const batchResults: BatchResult[] = [];
    
    // Initialize all batch results
    for (let i = 0; i < totalBatches; i++) {
      batchResults.push({
        batchNumber: i + 1,
        status: 'pending',
        processedRows: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errors: [],
        retryCount: 0,
        maxRetries: 3
      });
    }

    session.batchProcessing = {
      currentBatch: 0,
      totalBatches,
      processedRows: 0,
      batchSize,
      batchResults,
      startTime: new Date(),
      canPause: true,
      canResume: false,
      isPaused: false
    };

    session.status = 'importing';
    return true;
  }

  updateBatchProgress(sessionId: string, batchNumber: number, result: Partial<BatchResult>): boolean {
    const session = this.getSession(sessionId);
    if (!session?.batchProcessing) {
      return false;
    }

    const batchIndex = batchNumber - 1;
    if (batchIndex >= 0 && batchIndex < session.batchProcessing.batchResults.length) {
      const batchResult = session.batchProcessing.batchResults[batchIndex];
      
      // Update batch result
      Object.assign(batchResult, result);
      
      // Update overall progress
      session.batchProcessing.currentBatch = batchNumber;
      session.batchProcessing.processedRows += result.processedRows || 0;
      
      // Update session status based on batch status
      if (result.status === 'success') {
        batchResult.endTime = new Date();
      } else if (result.status === 'failed') {
        batchResult.endTime = new Date();
        // Check if we should retry
        if (batchResult.retryCount < batchResult.maxRetries) {
          batchResult.status = 'pending';
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

    session.status = 'paused';
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

    session.status = 'importing';
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
    session.status = success ? 'imported' : 'failed';
    
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

    return session.batchProcessing.batchResults.find(batch => 
      batch.status === 'pending' || 
      (batch.status === 'failed' && batch.retryCount < batch.maxRetries)
    ) || null;
  }

  private generateSessionId(): string {
    return `class_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
