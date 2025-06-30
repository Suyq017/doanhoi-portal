import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities/department.entity';
import { ExcelParserService, DepartmentImportData } from './excel-parser.service';
import { ImportValidationService, ValidationResult } from './import-validation.service';
import { ImportSessionService, ImportSession, ImportResult } from './import-session.service';

export interface ImportUploadResponse {
  sessionId: string;
  fileName: string;
  totalRows: number;
  message: string;
}

export interface ImportValidationResponse {
  sessionId: string;
  isValid: boolean;
  summary: ValidationResult['summary'];
  errors: ValidationResult['errors'];
  warnings: ValidationResult['warnings'];
  previewData: any[];
}

export interface ImportExecuteResponse {
  sessionId: string;
  success: boolean;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  message: string;
}

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    private excelParserService: ExcelParserService,
    private validationService: ImportValidationService,
    private sessionService: ImportSessionService,
  ) {}

  async uploadFile(file: Express.Multer.File): Promise<ImportUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException('Only Excel files (.xlsx, .xls) are allowed');
    }

    try {
      // Parse Excel file
      const data = await this.excelParserService.parseExcelFile(file.buffer);
      
      if (data.length === 0) {
        throw new BadRequestException('Excel file contains no data rows');
      }

      // Create session
      const session = this.sessionService.createSession(file.originalname, data);

      return {
        sessionId: session.id,
        fileName: file.originalname,
        totalRows: data.length,
        message: `File uploaded successfully. Found ${data.length} rows to import.`
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse Excel file: ${error.message}`);
    }
  }

  async validateData(sessionId: string): Promise<ImportValidationResponse> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (!session.data) {
      throw new BadRequestException('No data found in session');
    }

    try {
      // Validate data
      const validationResult = await this.validationService.validateDepartmentData(session.data);
      
      // Update session with validation result
      this.sessionService.updateSessionValidation(sessionId, validationResult);

      // Create preview data (first 10 rows with validation info)
      const previewData = validationResult.data.slice(0, 10).map((item, index) => ({
        row: index + 2, // Excel row number
        name: item.name,
        code: item.code,
        description: item.description,
        hasErrors: item._errors.length > 0,
        hasWarnings: item._warnings.length > 0,
        errors: item._errors,
        warnings: item._warnings
      }));

      return {
        sessionId,
        isValid: validationResult.isValid,
        summary: validationResult.summary,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        previewData
      };
    } catch (error) {
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
  }

  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<ImportExecuteResponse> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (session.status !== 'validated') {
      throw new BadRequestException('Data must be validated before import');
    }

    const validatedData = this.sessionService.getValidatedData(sessionId);
    if (!validatedData) {
      throw new BadRequestException('No validated data found');
    }

    try {
      const importResult = await this.performImport(validatedData, options);
      
      // Update session with import result
      this.sessionService.updateSessionImport(sessionId, importResult);

      return {
        sessionId,
        success: importResult.success,
        importedCount: importResult.importedCount,
        skippedCount: importResult.skippedCount,
        failedCount: importResult.failedCount,
        errors: importResult.errors,
        message: importResult.success 
          ? `Import completed successfully. ${importResult.importedCount} departments imported.`
          : `Import completed with errors. ${importResult.importedCount} imported, ${importResult.failedCount} failed.`
      };
    } catch (error) {
      const importResult: ImportResult = {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        failedCount: validatedData.length,
        errors: [error.message],
        importedIds: []
      };

      this.sessionService.updateSessionImport(sessionId, importResult);
      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  async getSessionStatus(sessionId: string): Promise<ImportSession> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }
    return session;
  }

  async generateTemplate(): Promise<Buffer> {
    return this.excelParserService.generateTemplate();
  }

  private async performImport(
    validatedData: any[],
    options?: { skipConflicts?: boolean }
  ): Promise<ImportResult> {
    const importResult: ImportResult = {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: []
    };

    // Filter out rows with errors
    const validRows = validatedData.filter(item => item._errors.length === 0);
    
    // Handle conflicts if skipConflicts is true
    let rowsToImport = validRows;
    if (options?.skipConflicts) {
      rowsToImport = validRows.filter(item => item._warnings.length === 0);
      importResult.skippedCount = validRows.length - rowsToImport.length;
    }

    for (const rowData of rowsToImport) {
      try {
        // Check for existing department by name or code
        const existingByName = rowData.name ? 
          await this.departmentsRepository.findOne({ where: { name: rowData.name } }) : null;
        const existingByCode = rowData.code ? 
          await this.departmentsRepository.findOne({ where: { code: rowData.code } }) : null;

        if (existingByName || existingByCode) {
          if (!options?.skipConflicts) {
            importResult.errors.push(
              `Row with name "${rowData.name}" ${existingByCode ? `or code "${rowData.code}"` : ''} already exists`
            );
            importResult.failedCount++;
            continue;
          } else {
            importResult.skippedCount++;
            continue;
          }
        }

        // Create new department
        const department = this.departmentsRepository.create({
          name: rowData.name,
          code: rowData.code || null,
          description: rowData.description || null
        });

        const savedDepartment = await this.departmentsRepository.save(department);
        importResult.importedCount++;
        importResult.importedIds.push(savedDepartment.id);

      } catch (error) {
        importResult.errors.push(`Failed to import row: ${error.message}`);
        importResult.failedCount++;
        importResult.success = false;
      }
    }

    return importResult;
  }
}
