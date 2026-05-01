import { Injectable } from "@nestjs/common";
import { OrganizationMemberImportData } from "./excel-parser.service";
import {
  OrganizationValidationResult,
  OrganizationMemberImportDataWithValidation,
} from "./import-validation.service";

export interface OrganizationImportSession {
  id: string;
  fileName: string;
  organizationId?: string;
  level: number;
  uploadedAt: Date;
  expiresAt: Date;
  status: "uploaded" | "validated" | "imported" | "failed";
  data?: OrganizationMemberImportData[];
  validationResult?: OrganizationValidationResult;
  importResult?: OrganizationImportResult;
  metadata: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface OrganizationImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  importedIds: string[];
}

@Injectable()
export class OrganizationImportSessionService {
  private sessions = new Map<string, OrganizationImportSession>();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  createSession(
    fileName: string,
    organizationId: string | undefined,
    level: number,
    data: OrganizationMemberImportData[],
  ): OrganizationImportSession {
    const sessionId = this.generateSessionId();
    const now = new Date();

    const session: OrganizationImportSession = {
      id: sessionId,
      fileName,
      organizationId,
      level,
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
    this.cleanupExpiredSessions();

    return session;
  }

  getSession(sessionId: string): OrganizationImportSession | undefined {
    this.cleanupExpiredSessions();
    return this.sessions.get(sessionId);
  }

  updateSessionValidation(
    sessionId: string,
    validationResult: OrganizationValidationResult,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.validationResult = validationResult;
    session.status = "validated";
    session.metadata.validRows = validationResult.data.filter(
      (item) => item._errors.length === 0,
    ).length;
    session.metadata.invalidRows = validationResult.data.filter(
      (item) => item._errors.length > 0,
    ).length;
    session.metadata.errorCount = validationResult.errors.length;
    session.metadata.warningCount = validationResult.warnings.length;

    this.sessions.set(sessionId, session);
  }

  updateSessionImport(
    sessionId: string,
    importResult: OrganizationImportResult,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.importResult = importResult;
    session.status = importResult.success ? "imported" : "failed";
    this.sessions.set(sessionId, session);
  }

  getValidatedData(
    sessionId: string,
  ): OrganizationMemberImportDataWithValidation[] | undefined {
    const session = this.sessions.get(sessionId);
    return session?.validationResult?.data;
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private generateSessionId(): string {
    return `org_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Get all active sessions (for debugging/monitoring)
  getAllSessions(): OrganizationImportSession[] {
    this.cleanupExpiredSessions();
    return Array.from(this.sessions.values());
  }

  // Extend session expiry
  extendSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT);
    this.sessions.set(sessionId, session);
    return true;
  }
}
