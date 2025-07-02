import { Injectable } from '@nestjs/common';
import { ClassImportData } from './excel-parser.service';
import { ValidationResult, ClassImportDataWithValidation } from './import-validation.service';

export interface ImportSession {
  id: string;
  fileName: string;
  uploadedAt: Date;
  expiresAt: Date;
  status: 'uploaded' | 'validated' | 'imported' | 'failed';
  data?: ClassImportData[];
  validationResult?: ValidationResult;
  importResult?: ImportResult;
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
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

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

  private generateSessionId(): string {
    return `class_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
