import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UserImportData } from './excel-parser.service';
import { UserValidationResult } from './import-validation.service';

export interface ImportSession {
  id: string;
  fileName: string;
  uploadedAt: Date;
  expiresAt: Date;
  status: 'uploaded' | 'validated' | 'imported' | 'failed';
  data?: UserImportData[];
  validationResult?: UserValidationResult[];
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

  createSession(fileName: string, data: UserImportData[]): ImportSession {
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

  updateSessionValidation(sessionId: string, validationResults: UserValidationResult[]): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.validationResult = validationResults;
      session.status = 'validated';
      session.metadata.validRows = validationResults.filter(r => r.validation.isValid).length;
      session.metadata.invalidRows = validationResults.filter(r => !r.validation.isValid).length;
      session.metadata.errorCount = validationResults.reduce((count, r) => count + r.validation.errors.length, 0);
      session.metadata.warningCount = validationResults.reduce((count, r) => count + r.validation.warnings.length, 0);
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
      session.status = result.success ? 'imported' : 'failed';
    }
  }

  getValidatedData(sessionId: string): UserValidationResult[] {
    const session = this.sessions.get(sessionId);
    if (!session || !session.validationResult) {
      return [];
    }
    return session.validationResult.filter(item => item.validation.isValid);
  }

  getAllSessions(): ImportSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => 
      b.uploadedAt.getTime() - a.uploadedAt.getTime()
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
}
