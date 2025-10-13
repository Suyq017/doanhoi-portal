# Kế hoạch Migration: Chuyển xử lý Import từ Backend sang Frontend cho Classes

## Tổng quan

**Hiện tại**: Backend nhận file, parse Excel, validate và import lớp học  
**Mục tiêu**: Frontend parse Excel, tạo JSON array, gửi qua API cho Backend xử lý theo batch

## Module Classes - Implementation Plan

### 1. Phân tích hiện tại

#### Backend hiện tại:
```
POST /classes/import/upload -> ImportService.uploadFile()
GET /classes/import/{sessionId}/validate -> ImportService.validateData()  
POST /classes/import/{sessionId}/execute -> ImportService.executeImport()
GET /classes/import/{sessionId}/status -> ImportService.getSessionStatus()
GET /classes/template -> ExcelParserService.generateTemplate()
```

#### Frontend hiện tại:
```typescript
// ClassesPage sử dụng useImportConfig
const {
  importConfig,
  isImportModalOpen,
  openImportModal,
  closeImportModal
} = useImportConfig({
  entityName: 'classes',
  entityService: {
    getTemplate: () => `${import.meta.env.VITE_BACKEND_API_URL}/classes/template`,
    uploadImportFile: classService.uploadImportFile.bind(classService),
    validateImportData: classService.validateImportData.bind(classService),
    executeImport: classService.executeImport.bind(classService),
    getImportStatus: classService.getImportStatus.bind(classService),
  },
  columns: classColumns(t),
  processingMode: 'server', // HIỆN TẠI
  maxFileSize: 5 * 1024 * 1024
});
```

#### Dữ liệu flow hiện tại:
```
File Excel -> Backend Parse -> ClassImportData[] -> Validation -> Database
```

#### Mục tiêu mới:
```
File Excel -> Frontend Parse -> JSON Array -> Batch API -> Database
```

### 2. Class Import Data Structure

```typescript
interface ClassImportData {
  name: string;              // Tên lớp (required)
  year?: number;             // Năm học (optional)
  departmentCode?: string;   // Mã khoa (optional, lookup by code)
}
```

**Lưu ý**: Đã loại bỏ trường `code` (Mã lớp) theo yêu cầu người dùng.

### 3. Tận dụng Frontend Components có sẵn

#### 3.1 ImportModal Component (Đã có sẵn - SỬ DỤNG LẠI)
```typescript
// ImportModal đã có đầy đủ chức năng:
// - File upload với drag & drop
// - Preview data table
// - Validation error display  
// - Progress tracking với batch support
// - Result summary

// Chỉ cần cấu hình ImportModalConfig mới:
const classImportConfig: ImportModalConfig = {
  entityName: 'classes',
  columns: classColumns(t), // Đã được cập nhật (bỏ code)
  acceptedFileTypes: ['.xlsx', '.xls'],
  maxFileSize: 10 * 1024 * 1024,
  
  // NEW: Client-side processing functions
  parseFile: frontendParseClassFile,
  validateClientData: frontendValidateClassData,
  submitClientData: frontendSubmitClassImport,
  
  // NEW: Batch processing config cho large files
  batchSize: 200,
  useClientSideProcessing: true,
  enableBatchProcessing: true
}
```

#### 3.2 classColumns Configuration (Đã có sẵn - ĐÃ CẬP NHẬT)
```typescript
// src/shared/utils/importColumns.ts - ĐÃ CẬP NHẬT
export const classColumns = (t: (key: string) => string): ImportColumn[] => [
  { key: 'name', label: t('classes:fields.name'), required: true, type: 'text' },
  { key: 'year', label: t('classes:fields.year'), required: false, type: 'number' },
  { key: 'departmentCode', label: t('classes:fields.departmentCode'), required: false, type: 'text' }
  // Đã bỏ cột isActive vì backend tự động set mặc định là true
  // Đã bỏ cột code (Mã lớp) theo yêu cầu
];
```

#### 3.3 useImportConfig Hook Integration
```typescript
// ClassesPage sẽ được cập nhật để support client-side mode
const useNewClassImport = useFeatureFlag('NEW_CLASS_IMPORT_SYSTEM');

const {
  importConfig,
  isImportModalOpen,
  openImportModal,
  closeImportModal
} = useImportConfig({
  entityName: 'classes',
  
  // OLD: Server-side processing (backward compatible)
  entityService: !useNewClassImport ? {
    getTemplate: () => `${import.meta.env.VITE_BACKEND_API_URL}/classes/template`,
    uploadImportFile: classService.uploadImportFile.bind(classService),
    validateImportData: classService.validateImportData.bind(classService),
    executeImport: classService.executeImport.bind(classService),
    getImportStatus: classService.getImportStatus.bind(classService),
  } : undefined,
  
  // NEW: Client-side processing functions
  parseFile: useNewClassImport ? frontendParseClassFile : undefined,
  validateClientData: useNewClassImport ? frontendValidateClassData : undefined,
  submitClientData: useNewClassImport ? frontendSubmitClassImport : undefined,
  
  columns: classColumns(t),
  templateFileName: t('classes:import.templateFile', { defaultValue: 'classes_template.xlsx' }),
  
  // Configuration
  processingMode: useNewClassImport ? 'client' : 'server',
  useClientSideProcessing: useNewClassImport,
  enableBatchProcessing: useNewClassImport,
  batchSize: 200,
  maxFileSize: 10 * 1024 * 1024,
  acceptedFileTypes: ['.xlsx', '.xls'],
  
  onSuccess: () => {
    loadClasses();
    showSuccess(t('classes:import.importSuccess'));
  },
  onError: (error: Error) => {
    console.error('Import error:', error);
    showError(t('classes:import.importError'));
  }
});
```

### 4. Frontend Services cần tạo mới

#### 4.1 Class Excel Parser Service
```typescript
// src/shared/services/classExcelParserService.ts - CREATE NEW
export class ClassExcelParserService {
  private readonly BATCH_SIZE = 200;
  
  /**
   * Parse class import file
   * @param file - Excel file to parse
   * @param onProgress - Progress callback
   * @returns Parsed class data
   */
  async parseClassImportFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ClassImportData[]> {
    this.validateFileType(file);
    this.validateFileSize(file);
    
    const workbook = await this.readExcelFile(file);
    const rawData = this.parseExcelToJson(workbook);
    
    return this.processInChunks(rawData, onProgress);
  }
  
  private validateFileType(file: File): void {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)');
    }
  }
  
  private validateFileSize(file: File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File quá lớn. Kích thước tối đa là 10MB');
    }
  }
  
  private async readExcelFile(file: File): Promise<WorkBook> {
    const buffer = await file.arrayBuffer();
    return XLSX.read(buffer, { type: 'array' });
  }
  
  private parseExcelToJson(workbook: WorkBook): any[] {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  }
  
  private processInChunks(
    rawData: any[],
    onProgress?: (progress: number) => void
  ): ClassImportData[] {
    const result: ClassImportData[] = [];
    const totalRows = rawData.length - 1; // Exclude header
    
    // Skip header row
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (this.isEmptyRow(row)) continue;
      
      const mappedData = this.mapRowToClassData(row, i + 1);
      if (mappedData) {
        result.push(mappedData);
      }
      
      // Report progress
      if (onProgress && i % 100 === 0) {
        onProgress((i / totalRows) * 100);
      }
    }
    
    return result;
  }
  
  private mapRowToClassData(row: any[], rowNumber: number): ClassImportData | null {
    // Template structure: Tên lớp | Năm | Mã khoa
    return {
      name: this.normalizeName(row[0]),
      year: this.normalizeYear(row[1]),
      departmentCode: this.normalizeDepartmentCode(row[2])
    };
  }
  
  private normalizeName(name: any): string {
    if (!name) return '';
    return String(name).trim();
  }
  
  private normalizeYear(year: any): number | undefined {
    if (!year || year === '') return undefined;
    const yearNum = parseInt(String(year));
    return isNaN(yearNum) ? undefined : yearNum;
  }
  
  private normalizeDepartmentCode(code: any): string | undefined {
    if (!code || code === '' || code === '*') return undefined;
    return String(code).trim().toUpperCase();
  }
  
  private isEmptyRow(row: any[]): boolean {
    return !row || row.every(cell => !cell || String(cell).trim() === '');
  }
}
```

#### 4.2 Class Import Validation Service
```typescript
// src/shared/services/classImportValidationService.ts - CREATE NEW
export class ClassImportValidationService {
  /**
   * Validate class import data
   * @param data - Array of class data to validate
   * @returns Validation result with errors and warnings
   */
  async validateClassImportData(
    data: ClassImportData[]
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate each row
    data.forEach((item, index) => {
      const rowNumber = index + 2; // Excel row (1-indexed + header)

      // Validate required fields
      const fieldErrors = this.validateRequiredFields(item, rowNumber);
      errors.push(...fieldErrors);

      // Validate formats
      const formatErrors = this.validateFormats(item, rowNumber);
      warnings.push(...formatErrors);

      // Validate business rules
      const businessErrors = this.validateBusinessRules(item, rowNumber);
      warnings.push(...businessErrors);
    });

    // Check for duplicate class names
    const duplicateErrors = this.checkDuplicates(data);
    errors.push(...duplicateErrors);

    // Validate department codes exist (call API)
    const departmentErrors = await this.validateDepartmentCodes(data);
    errors.push(...departmentErrors);

    // Calculate summary
    const uniqueRowsWithErrors = new Set(
      errors.filter(e => e.type === 'error').map(e => e.row)
    );

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        total: data.length,
        valid: data.length - uniqueRowsWithErrors.size,
        invalid: uniqueRowsWithErrors.size,
        duplicates: duplicateErrors.length
      }
    };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(
    item: ClassImportData,
    rowNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Class name is required
    if (!item.name || !item.name.trim()) {
      errors.push({
        row: rowNumber,
        field: 'name',
        value: item.name,
        message: 'Tên lớp không được để trống',
        type: 'error'
      });
    }

    return errors;
  }

  /**
   * Validate data formats
   */
  private validateFormats(
    item: ClassImportData,
    rowNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate year format
    if (item.year !== undefined) {
      if (!this.isValidYear(item.year)) {
        errors.push({
          row: rowNumber,
          field: 'year',
          value: item.year,
          message: 'Năm học không hợp lệ (phải từ 2000 đến 2100)',
          type: 'warning'
        });
      }
    }

    // Validate department code format
    if (item.departmentCode && !this.isValidDepartmentCode(item.departmentCode)) {
      errors.push({
        row: rowNumber,
        field: 'departmentCode',
        value: item.departmentCode,
        message: 'Mã khoa không đúng định dạng',
        type: 'warning'
      });
    }

    return errors;
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    item: ClassImportData,
    rowNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Class name should not be too long
    if (item.name && item.name.length > 100) {
      errors.push({
        row: rowNumber,
        field: 'name',
        value: item.name,
        message: 'Tên lớp quá dài (tối đa 100 ký tự)',
        type: 'warning'
      });
    }

    return errors;
  }

  /**
   * Check for duplicate class names within the file
   */
  private checkDuplicates(data: ClassImportData[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const seen = new Map<string, number>();

    data.forEach((item, index) => {
      const rowNumber = index + 2;
      const key = item.name.trim().toLowerCase();

      if (seen.has(key)) {
        errors.push({
          row: rowNumber,
          field: 'name',
          value: item.name,
          message: `Tên lớp bị trùng với dòng ${seen.get(key)}`,
          type: 'error'
        });
      } else {
        seen.set(key, rowNumber);
      }
    });

    return errors;
  }

  /**
   * Validate that department codes exist in the database
   */
  private async validateDepartmentCodes(data: ClassImportData[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    // Get unique department codes
    const departmentCodes = [...new Set(
      data
        .filter(item => item.departmentCode)
        .map(item => item.departmentCode!)
    )];

    if (departmentCodes.length === 0) {
      return errors;
    }

    try {
      // Call API to validate department codes
      const response = await apiClient.post<{
        validCodes: string[];
        invalidCodes: string[];
      }>('/departments/validate-codes', { codes: departmentCodes });

      const invalidCodesSet = new Set(response.invalidCodes);

      // Add errors for rows with invalid department codes
      data.forEach((item, index) => {
        if (item.departmentCode && invalidCodesSet.has(item.departmentCode)) {
          errors.push({
            row: index + 2,
            field: 'departmentCode',
            value: item.departmentCode,
            message: `Không tìm thấy khoa với mã: ${item.departmentCode}`,
            type: 'error'
          });
        }
      });
    } catch (error) {
      console.error('Error validating department codes:', error);
      // Don't block import if validation API fails
    }

    return errors;
  }

  private isValidYear(year: number): boolean {
    return year >= 2000 && year <= 2100;
  }

  private isValidDepartmentCode(code: string): boolean {
    // Basic validation - alphanumeric, 2-20 characters
    return /^[A-Z0-9]{2,20}$/.test(code);
  }
}
```

#### 4.3 Class Import Submit Service
```typescript
// src/shared/services/classImportSubmitService.ts - CREATE NEW
export class ClassImportSubmitService {
  private readonly BATCH_SIZE = 200;
  private readonly REQUEST_DELAY = 100; // ms between batches

  /**
   * Submit class import data in batches
   * @param data - Array of class import data
   * @param onProgress - Callback for progress updates
   * @returns Import result summary
   */
  async submitClassImport(
    data: ClassImportData[],
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<ImportResult> {
    const sessionId = this.generateSessionId();
    const totalBatches = Math.ceil(data.length / this.BATCH_SIZE);

    let totalSuccessful = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    try {
      // Process each batch
      for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * this.BATCH_SIZE;
        const endIndex = Math.min(startIndex + this.BATCH_SIZE, data.length);
        const batch = data.slice(startIndex, endIndex);

        // Report progress before processing
        if (onProgress) {
          onProgress({
            currentBatch: i + 1,
            totalBatches,
            processedRecords: startIndex,
            totalRecords: data.length,
            percentage: (startIndex / data.length) * 100,
            currentOperation: 'importing',
            message: `Đang xử lý batch ${i + 1}/${totalBatches} (${batch.length} lớp)...`
          });
        }

        // Submit batch to backend
        const batchResult = await this.submitBatch(
          batch,
          {
            batchNumber: i + 1,
            totalBatches,
            sessionId
          }
        );

        // Accumulate results
        totalSuccessful += batchResult.batchResult.successful;
        totalFailed += batchResult.batchResult.failed;
        if (batchResult.batchResult.errors && batchResult.batchResult.errors.length > 0) {
          allErrors.push(...batchResult.batchResult.errors);
        }

        // Small delay between batches
        if (i < totalBatches - 1) {
          await this.delay(this.REQUEST_DELAY);
        }
      }

      // Final progress update
      if (onProgress) {
        onProgress({
          currentBatch: totalBatches,
          totalBatches,
          processedRecords: data.length,
          totalRecords: data.length,
          percentage: 100,
          currentOperation: 'importing',
          message: 'Hoàn thành import!'
        });
      }

      return {
        sessionId,
        success: totalFailed === 0,
        importedCount: totalSuccessful,
        skippedCount: 0,
        failedCount: totalFailed,
        errors: allErrors,
        message: totalFailed === 0
          ? `Import thành công ${totalSuccessful} lớp học`
          : `Import thành công ${totalSuccessful}, thất bại ${totalFailed} lớp học`
      };

    } catch (error) {
      throw new Error(`Lỗi trong quá trình import: ${error.message}`);
    }
  }

  private async submitBatch(
    batch: ClassImportData[],
    batchInfo: BatchInfo
  ): Promise<BatchImportResult> {
    const endpoint = '/classes/import/batch';

    const response = await apiClient.post<BatchImportResult>(endpoint, {
      classes: batch,
      batchInfo,
      options: {
        skipDuplicates: false, // Classes with duplicate names will error
        validateDepartments: true
      }
    });

    return response;
  }

  private generateSessionId(): string {
    return `class_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 4.4 Main Class Import Service (Orchestrator)
```typescript
// src/shared/services/classImportService.ts - CREATE NEW
const classExcelParser = new ClassExcelParserService();
const classValidator = new ClassImportValidationService();
const classSubmitter = new ClassImportSubmitService();

/**
 * Frontend parse class import file
 */
export const frontendParseClassFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<ClassImportData[]> => {
  return classExcelParser.parseClassImportFile(file, onProgress);
};

/**
 * Frontend validate class import data
 */
export const frontendValidateClassData = async (
  data: ClassImportData[]
): Promise<ValidationResult> => {
  return classValidator.validateClassImportData(data);
};

/**
 * Frontend submit class import
 */
export const frontendSubmitClassImport = async (
  data: ClassImportData[],
  onProgress?: (progress: ProgressInfo) => void
): Promise<ImportResult> => {
  return classSubmitter.submitClassImport(data, onProgress);
};

/**
 * Complete workflow: parse -> validate -> submit
 */
export const processClassImportFile = async (
  file: File,
  onProgress?: (progress: { stage: string; percentage: number }) => void
): Promise<ImportResult> => {
  // Stage 1: Parsing
  onProgress?.({ stage: 'parsing', percentage: 0 });
  const parsedData = await frontendParseClassFile(file, (p) => {
    onProgress?.({ stage: 'parsing', percentage: p * 0.3 }); // 0-30%
  });

  // Stage 2: Validation
  onProgress?.({ stage: 'validating', percentage: 30 });
  const validationResult = await frontendValidateClassData(parsedData);
  onProgress?.({ stage: 'validating', percentage: 40 });

  if (!validationResult.isValid) {
    throw new Error(`Validation failed: ${validationResult.errors.length} errors found`);
  }

  // Stage 3: Import
  onProgress?.({ stage: 'importing', percentage: 40 });
  const importResult = await frontendSubmitClassImport(parsedData, (p) => {
    onProgress?.({ stage: 'importing', percentage: 40 + (p.percentage * 0.6) }); // 40-100%
  });

  return importResult;
};
```

### 5. Backend API Changes - Batch Processing Support

#### 5.1 New Batch Import Endpoint
```typescript
// backend/src/classes/classes.controller.ts - ADD NEW ENDPOINT
@Post('import/batch')
@ApiOperation({ summary: 'Import lớp học theo batch với client-side processing' })
@ApiResponse({ status: 200, description: 'Kết quả import batch' })
async importClassesBatch(
  @Body() importData: {
    classes: ClassImportData[],
    batchInfo: {
      batchNumber: number,
      totalBatches: number,
      sessionId: string
    },
    options: {
      skipDuplicates?: boolean,
      validateDepartments?: boolean
    }
  }
) {
  return this.batchImportService.processBatch(
    importData.classes,
    importData.batchInfo,
    importData.options
  );
}

@Get('import/batch/:sessionId/status')
@ApiOperation({ summary: 'Lấy trạng thái import batch' })
@ApiResponse({ status: 200, description: 'Trạng thái session import' })
async getBatchImportStatus(@Param('sessionId') sessionId: string) {
  return this.batchImportService.getSessionSummary(sessionId);
}
```

#### 5.2 DTO for Batch Import
```typescript
// backend/src/classes/dto/batch-import-classes.dto.ts - CREATE NEW
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClassDataDto {
  @ApiProperty({ description: 'Tên lớp' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Năm học' })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: 'Mã khoa' })
  @IsOptional()
  @IsString()
  departmentCode?: string;
}

export class BatchInfoDto {
  @ApiProperty({ description: 'Số thứ tự batch' })
  @IsNumber()
  batchNumber: number;

  @ApiProperty({ description: 'Tổng số batches' })
  @IsNumber()
  totalBatches: number;

  @ApiProperty({ description: 'ID session' })
  @IsString()
  sessionId: string;
}

export class ImportOptionsDto {
  @ApiPropertyOptional({ description: 'Bỏ qua lớp trùng tên' })
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;

  @ApiPropertyOptional({ description: 'Kiểm tra department tồn tại' })
  @IsOptional()
  @IsBoolean()
  validateDepartments?: boolean;
}

export class BatchImportClassesDto {
  @ApiProperty({ description: 'Danh sách lớp học', type: [ClassDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassDataDto)
  classes: ClassDataDto[];

  @ApiProperty({ description: 'Thông tin batch', type: BatchInfoDto })
  @ValidateNested()
  @Type(() => BatchInfoDto)
  batchInfo: BatchInfoDto;

  @ApiProperty({ description: 'Tùy chọn import', type: ImportOptionsDto })
  @ValidateNested()
  @Type(() => ImportOptionsDto)
  options: ImportOptionsDto;
}
```

#### 5.3 Batch Import Service
```typescript
// backend/src/classes/services/batch-import.service.ts - CREATE NEW
@Injectable()
export class ClassBatchImportService {
  private readonly sessionCache = new Map<string, SessionData>();

  constructor(
    @InjectRepository(Class)
    private classesRepository: Repository<Class>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    private dataSource: DataSource
  ) {}

  async processBatch(
    classes: ClassDataDto[],
    batchInfo: BatchInfo,
    options: ImportOptions
  ): Promise<BatchImportResult> {
    try {
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each class in the batch
      for (const classData of classes) {
        try {
          await this.processClass(classData, options);
          successful++;
        } catch (error) {
          failed++;
          errors.push(`${classData.name}: ${error.message}`);
        }
      }

      // Update session progress
      await this.updateSessionProgress(batchInfo.sessionId, {
        processed: classes.length,
        successful,
        failed,
        errors
      });

      const sessionSummary = await this.getSessionSummary(batchInfo.sessionId);

      return {
        success: failed === 0,
        batchResult: {
          processed: classes.length,
          successful,
          failed,
          errors
        },
        sessionSummary
      };

    } catch (error) {
      throw new BadRequestException(`Lỗi xử lý batch: ${error.message}`);
    }
  }

  private async processClass(
    classData: ClassDataDto,
    options: ImportOptions
  ): Promise<void> {
    // Check if class with same name exists
    const existingClass = await this.classesRepository.findOne({
      where: { name: classData.name }
    });

    if (existingClass) {
      if (options.skipDuplicates) {
        throw new Error('Lớp đã tồn tại (bỏ qua)');
      } else {
        throw new Error('Lớp đã tồn tại trong hệ thống');
      }
    }

    // Find department by code if provided
    let departmentId: string | undefined;
    if (classData.departmentCode) {
      if (options.validateDepartments) {
        const department = await this.departmentsRepository.findOne({
          where: { code: classData.departmentCode }
        });
        if (!department) {
          throw new Error(`Không tìm thấy khoa với mã: ${classData.departmentCode}`);
        }
        departmentId = department.id;
      }
    }

    // Create class
    const newClass = this.classesRepository.create({
      name: classData.name,
      year: classData.year,
      departmentId,
      isActive: true // Default active
    });

    await this.classesRepository.save(newClass);
  }

  private async updateSessionProgress(
    sessionId: string,
    batchResult: BatchResult
  ): Promise<void> {
    let sessionData = this.sessionCache.get(sessionId) || {
      sessionId,
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      errors: [],
      isComplete: false,
      startTime: new Date()
    };

    sessionData.totalProcessed += batchResult.processed;
    sessionData.totalSuccessful += batchResult.successful;
    sessionData.totalFailed += batchResult.failed;
    sessionData.errors.push(...batchResult.errors);

    this.sessionCache.set(sessionId, sessionData);

    // Auto cleanup after 24 hours
    setTimeout(() => {
      this.sessionCache.delete(sessionId);
    }, 24 * 60 * 60 * 1000);
  }

  async getSessionSummary(sessionId: string): Promise<SessionSummary> {
    return this.sessionCache.get(sessionId) || {
      sessionId,
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      errors: [],
      isComplete: false
    };
  }
}
```

#### 5.4 Department Code Validation Endpoint
```typescript
// backend/src/departments/departments.controller.ts - ADD NEW ENDPOINT
@Post('validate-codes')
@ApiOperation({ summary: 'Kiểm tra danh sách mã khoa có tồn tại không' })
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      codes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Danh sách mã khoa cần kiểm tra'
      }
    }
  }
})
@ApiResponse({ 
  status: 200, 
  description: 'Kết quả kiểm tra',
  schema: {
    type: 'object',
    properties: {
      validCodes: {
        type: 'array',
        items: { type: 'string' }
      },
      invalidCodes: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
})
async validateDepartmentCodes(@Body('codes') codes: string[]) {
  return this.departmentsService.validateDepartmentCodes(codes);
}
```

```typescript
// backend/src/departments/departments.service.ts - ADD NEW METHOD
async validateDepartmentCodes(codes: string[]): Promise<{
  validCodes: string[];
  invalidCodes: string[];
}> {
  if (!codes || codes.length === 0) {
    return { validCodes: [], invalidCodes: [] };
  }

  const uniqueCodes = [...new Set(codes.map(code => code.trim().toUpperCase()))];

  const departments = await this.departmentsRepository.find({
    where: { code: In(uniqueCodes) },
    select: ['code']
  });

  const foundCodes = new Set(departments.map(dept => dept.code.toUpperCase()));
  const validCodes: string[] = [];
  const invalidCodes: string[] = [];

  uniqueCodes.forEach(code => {
    if (foundCodes.has(code)) {
      validCodes.push(code);
    } else {
      invalidCodes.push(code);
    }
  });

  return { validCodes, invalidCodes };
}
```

### 6. Frontend Integration Updates

#### 6.1 Update ClassesPage (Minimal changes)
```typescript
// src/features/classes/ClassesPage.tsx - MINIMAL UPDATE
// Import new functions
import {
  frontendParseClassFile,
  frontendValidateClassData,
  frontendSubmitClassImport
} from '../../shared/services/classImportService';

// Feature flag to enable new system
const useNewClassImport = useFeatureFlag('NEW_CLASS_IMPORT_SYSTEM');

// Update useImportConfig
const {
  importConfig,
  isImportModalOpen,
  openImportModal,
  closeImportModal
} = useImportConfig({
  entityName: 'classes',
  
  // Conditional configuration
  entityService: !useNewClassImport ? {
    getTemplate: () => `${import.meta.env.VITE_BACKEND_API_URL}/classes/template`,
    uploadImportFile: classService.uploadImportFile.bind(classService),
    validateImportData: classService.validateImportData.bind(classService),
    executeImport: classService.executeImport.bind(classService),
    getImportStatus: classService.getImportStatus.bind(classService),
  } : undefined,
  
  // NEW: Client-side processing
  parseFile: useNewClassImport ? frontendParseClassFile : undefined,
  validateClientData: useNewClassImport ? frontendValidateClassData : undefined,
  submitClientData: useNewClassImport ? frontendSubmitClassImport : undefined,
  
  columns: classColumns(t),
  templateFileName: t('classes:import.templateFile', { defaultValue: 'classes_template.xlsx' }),
  
  // Processing mode
  processingMode: useNewClassImport ? 'client' : 'server',
  useClientSideProcessing: useNewClassImport,
  enableBatchProcessing: useNewClassImport,
  batchSize: 200,
  maxFileSize: 10 * 1024 * 1024,
  
  onSuccess: () => {
    loadClasses();
    showSuccess(t('classes:import.importSuccess', { defaultValue: 'Import lớp học thành công!' }));
  },
  onError: (error: Error) => {
    console.error('Import error:', error);
    showError(t('classes:import.importError', { defaultValue: 'Có lỗi xảy ra khi import lớp học' }));
  }
});

// No other changes needed - ImportModal handles everything
```

### 7. Performance Considerations

#### 7.1 Frontend Batch Processing
```typescript
// Batch size optimization
const BATCH_SIZE = 200; // Classes per batch
const PARSE_CHUNK_SIZE = 1000; // Parse in larger chunks

// Web Workers for heavy parsing (optional for very large files)
const parseInWorker = async (file: File) => {
  const worker = new Worker('/workers/classExcelParser.worker.js');
  return new Promise<ClassImportData[]>((resolve, reject) => {
    worker.postMessage({ file });
    worker.onmessage = (e) => {
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.result);
      worker.terminate();
    };
  });
}
```

#### 7.2 Backend Optimizations
```typescript
// Bulk operations for better performance
async processBatchOptimized(classes: ClassDataDto[]) {
  // Fetch all departments in one query
  const departmentCodes = classes
    .filter(c => c.departmentCode)
    .map(c => c.departmentCode!);
  
  const departments = await this.departmentsRepository.find({
    where: { code: In(departmentCodes) }
  });
  
  const departmentMap = new Map(
    departments.map(d => [d.code, d.id])
  );
  
  // Batch insert classes
  const classEntities = classes.map(classData => {
    return this.classesRepository.create({
      name: classData.name,
      year: classData.year,
      departmentId: classData.departmentCode 
        ? departmentMap.get(classData.departmentCode) 
        : undefined,
      isActive: true
    });
  });
  
  await this.classesRepository.save(classEntities);
}
```

### 8. Implementation Phases

#### Phase 1: Frontend Services Setup (Week 1)
- [ ] Install dependencies: `xlsx`, `yup`, `validator`, `@types/file-saver`
- [ ] Create `ClassExcelParserService` for client-side parsing
- [ ] Create `ClassImportValidationService` for client-side validation
- [ ] Create `ClassImportSubmitService` for batch submission
- [ ] Test parsing with classColumns configuration (3 columns: name, year, departmentCode)

#### Phase 2: Frontend Integration (Week 2)
- [ ] Add feature flag support: `NEW_CLASS_IMPORT_SYSTEM`
- [ ] Update ClassesPage to use client-side processing conditionally
- [ ] Configure batch processing (batchSize: 200)
- [ ] Test with existing ImportModal UI (no UI changes needed)

#### Phase 3: Backend Batch API (Week 3)
- [ ] Create new batch import endpoint `POST /classes/import/batch`
- [ ] Implement `ClassBatchImportService` with session management
- [ ] Add department code validation endpoint `POST /departments/validate-codes`
- [ ] Implement bulk operations for performance
- [ ] Keep old endpoints for backward compatibility

#### Phase 4: Integration & Testing (Week 4)
- [ ] End-to-end testing with feature flag enabled
- [ ] Test batch processing with large files (1k+ records)
- [ ] Test real-time progress tracking in ImportModal
- [ ] Performance testing vs old system
- [ ] Error handling and recovery testing

#### Phase 5: Migration & Cleanup (Week 5)
- [ ] Performance comparison old vs new system
- [ ] User acceptance testing
- [ ] Enable feature flag for production
- [ ] Monitor for issues
- [ ] Remove old import endpoints after stable period

### 9. Testing Strategy

#### 9.1 Unit Tests
```typescript
// Frontend Services
describe('ClassExcelParserService', () => {
  test('should parse class file with 3 columns correctly')
  test('should handle optional year field')
  test('should handle optional departmentCode field')
  test('should skip empty rows')
  test('should normalize class names')
})

describe('ClassImportValidationService', () => {
  test('should validate required name field')
  test('should validate year range (2000-2100)')
  test('should detect duplicate class names')
  test('should validate department codes exist')
})

// Backend Service
describe('ClassBatchImportService', () => {
  test('should process batch correctly')
  test('should handle duplicate class names')
  test('should validate department codes')
  test('should rollback on errors')
})
```

#### 9.2 Integration Tests
- Complete import flow with 3-column template
- Large file processing (500+ classes)
- Department code validation
- Error scenarios and recovery
- Performance benchmarks

### 10. Migration Strategy with Feature Flag

#### 10.1 Backward Compatibility
```typescript
// Use feature flag for smooth transition
const useNewClassImport = useFeatureFlag('NEW_CLASS_IMPORT_SYSTEM');

// Same ImportModal component, different config
const importConfig = {
  entityName: 'classes',
  columns: classColumns(t),
  
  // Switch processing mode based on feature flag
  processingMode: useNewClassImport ? 'client' : 'server',
  useClientSideProcessing: useNewClassImport,
  
  // Old system (fallback)
  entityService: !useNewClassImport ? classService : undefined,
  
  // New system
  parseFile: useNewClassImport ? frontendParseClassFile : undefined,
  validateClientData: useNewClassImport ? frontendValidateClassData : undefined,
  submitClientData: useNewClassImport ? frontendSubmitClassImport : undefined
};
```

#### 10.2 Rollback Plan
- Feature flag for instant rollback to server-side processing
- Keep old endpoints for 2-3 versions
- Database schema unchanged
- ImportModal component unchanged (only config changes)
- Monitoring for performance and error rates

### 11. Success Metrics

#### 11.1 Performance Metrics
- File parsing time: < 2s for 1000 classes
- Memory usage: < 80MB for 1000 classes
- Batch processing: 200 classes/batch
- Import throughput: ~2000 classes/minute
- Progress update: Real-time for each batch
- Error recovery: < 3s per failed batch

#### 11.2 User Experience
- **Same UI**: Upload -> Preview -> Importing -> Result
- **Immediate feedback**: Real-time parsing and validation
- **Better error messages**: Row-level error reporting
- **Department validation**: Check department codes before import

#### 11.3 Development Efficiency
- **80% code reuse**: ImportModal and UI components unchanged
- **Service-only development**: Only business logic services needed
- **Easy A/B testing**: Feature flag switching
- **Low risk**: UI already stable and tested

## Lợi ích của Migration cho Classes

### 1. Performance
- **Faster processing**: Client-side parsing for immediate feedback
- **Reduced server load**: Server only handles business logic
- **Batch optimization**: 200 classes/batch for optimal throughput

### 2. User Experience
- **Real-time validation**: Immediate feedback on errors
- **Better error messages**: Row-specific error reporting
- **Department validation**: Check department codes exist before import
- **Progress visibility**: Track progress through batches

### 3. Development & Maintenance
- **Reuse existing components**: ImportModal, classColumns, useImportConfig
- **Single responsibility**: Parsing, validation, submission separated
- **Easy testing**: Unit test each service independently
- **Feature flag rollback**: Safe deployment strategy

### 4. Business Logic
- **Duplicate detection**: Check for duplicate class names
- **Department validation**: Validate department codes exist
- **Bulk operations**: Efficient database operations
- **Session tracking**: Monitor import progress and errors

## Rủi ro và Mitigation

### 1. Duplicate Class Names
**Risk**: Multiple classes with same name in file or database  
**Mitigation**: Client-side duplicate detection + server-side validation

### 2. Invalid Department Codes
**Risk**: Department codes that don't exist in database  
**Mitigation**: Frontend calls validation API before submission

### 3. Large File Processing
**Risk**: Very large files (5k+ classes) may slow browser  
**Mitigation**: Batch processing, Web Workers, chunking

### 4. Network Issues
**Risk**: Batch submission failures due to network  
**Mitigation**: 
- Retry logic for failed batches
- Session-based recovery
- Progress persistence

### 5. Template Structure Changes
**Risk**: Users may use old template with 4 columns (including code)  
**Mitigation**: 
- Clear template download in ImportModal
- Validation to detect unexpected columns
- Migration guide for users

## Kết luận

Kế hoạch này tận dụng tối đa components có sẵn (ImportModal, classColumns, useImportConfig) để migration smooth và low-risk cho class import functionality. Việc loại bỏ trường `code` (Mã lớp) đã được phản ánh trong toàn bộ kế hoạch, chỉ còn 3 trường: `name` (required), `year` (optional), `departmentCode` (optional).
