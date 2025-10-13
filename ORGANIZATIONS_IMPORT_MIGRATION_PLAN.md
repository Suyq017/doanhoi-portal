# Kế hoạch Migration: Chuyển xử lý Import từ Backend sang Frontend cho Organizations

## Tổng quan

**Hiện tại**: Backend nhận file, parse Excel, validate và import thành viên vào tổ chức  
**Mục tiêu**: Frontend parse Excel, tạo JSON array, gửi qua API cho Backend xử lý theo batch

## Module Organizations - Implementation Plan

### 1. Phân tích hiện tại

#### Backend hiện tại:
```
POST /organizations/members/import/upload -> ImportService.uploadFile()
GET /organizations/import/{sessionId}/validate -> ImportService.validateData()  
POST /organizations/import/{sessionId}/execute -> ImportService.executeImport()
GET /organizations/import/{sessionId}/status -> ImportService.getSessionStatus()
GET /organizations/template/{level} -> ImportService.generateTemplate()
```

#### Frontend hiện tại:
```typescript
// useOrganizationImport hook sử dụng useImportConfig
const result = useImportConfig({
  entityName: 'organizations',
  entityService: organizationService,
  columns: organizationColumns(level), // Level 2 hoặc 3
  processingMode: 'server', // HIỆN TẠI
  maxFileSize: 5 * 1024 * 1024
});
```

#### Dữ liệu flow hiện tại:
```
File Excel -> Backend Parse -> OrganizationImportData[] -> Validation -> Database
```

#### Mục tiêu mới:
```
File Excel -> Frontend Parse -> JSON Array -> Batch API -> Database
```

### 2. Organization Import Data Structure

#### Level 2 Organizations (Import vào specific organization):
```typescript
interface OrganizationImportDataLevel2 {
  studentCode: string;        // Mã số sinh viên (required)
  classOrUnitCode: string;    // Mã lớp/đơn vị (required)
}
```

#### Level 3 Organizations (Import vào từng organization riêng):
```typescript
interface OrganizationImportDataLevel3 {
  studentCode: string;        // Mã số sinh viên (required)
  // classOrUnitCode không cần cho level 3
}
```

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
const organizationImportConfig: ImportModalConfig = {
  entityName: 'organizations',
  columns: organizationColumns(level, t), // Level 2 hoặc 3
  acceptedFileTypes: ['.xlsx', '.xls'],
  maxFileSize: 10 * 1024 * 1024,
  
  // NEW: Client-side processing functions
  parseFile: frontendParseOrganizationFile,
  validateClientData: frontendValidateOrganizationData,
  submitClientData: frontendSubmitOrganizationImport,
  
  // NEW: Batch processing config cho large files
  batchSize: 200,
  useClientSideProcessing: true,
  enableBatchProcessing: true
}
```

#### 3.2 organizationColumns Configuration (Đã có sẵn - SỬ DỤNG LẠI)
```typescript
// src/shared/utils/importColumns.ts - GIỮ NGUYÊN
export const organizationColumns = (level: 2 | 3, t?: (key: string) => string): ImportColumn[] => {
  if (level === 2) {
    return [
      {
        key: 'studentCode',
        label: t?.('organizations:fields.studentCode') || 'Mã số sinh viên',
        required: true,
        type: 'text'
      },
      {
        key: 'classOrUnitCode', 
        label: t?.('organizations:fields.classOrUnitCode') || 'Mã lớp/đơn vị',
        required: true,
        type: 'text'
      }
    ];
  } else {
    return [
      {
        key: 'studentCode',
        label: t?.('organizations:fields.studentCode') || 'Mã số sinh viên',
        required: true,
        type: 'text'
      }
    ];
  }
};
```

#### 3.3 useOrganizationImport Hook (Cập nhật để support client-side)
```typescript
// src/features/organizations/hooks/useOrganizationImport.ts - UPDATE
export const useOrganizationImport = (options: UseOrganizationImportOptions): UseImportConfigReturn => {
  const { level, organizationId, onSuccess, onError } = options;
  const useNewImportSystem = useFeatureFlag('NEW_ORGANIZATION_IMPORT_SYSTEM'); // Feature flag

  const result = useImportConfig({
    entityName: 'organizations',
    entityService: useNewImportSystem ? undefined : {
      // OLD: Server-side processing
      getTemplate: () => organizationService.getTemplate(level),
      uploadImportFile: (file: File) => organizationService.uploadImportFile(file, level, organizationId),
      validateImportData: (sessionId: string) => organizationService.validateImportData(sessionId),
      executeImport: (sessionId: string, options?: any) => organizationService.executeImport(sessionId, options),
      getImportStatus: (sessionId: string) => organizationService.getImportStatus(sessionId)
    },
    columns: organizationColumns(level),
    
    // NEW: Client-side processing functions
    parseFile: useNewImportSystem ? frontendParseOrganizationFile : undefined,
    validateClientData: useNewImportSystem ? frontendValidateOrganizationData : undefined,
    submitClientData: useNewImportSystem ? (data, onProgress) => 
      frontendSubmitOrganizationImport(data, level, organizationId, onProgress) : undefined,
    
    templateParams: { level, organizationId },
    templateFileName: `organization_level${level}_template.xlsx`,
    onSuccess,
    onError,
    
    // Configuration
    processingMode: useNewImportSystem ? 'client' : 'server',
    useClientSideProcessing: useNewImportSystem,
    enableBatchProcessing: useNewImportSystem,
    batchSize: 200,
    maxFileSize: 10 * 1024 * 1024,
    acceptedFileTypes: ['.xlsx', '.xls']
  });

  return result;
};
```

### 4. Frontend Services cần tạo mới

#### 4.1 Organization Excel Parser Service
```typescript
// src/shared/services/organizationExcelParserService.ts - CREATE NEW
export class OrganizationExcelParserService {
  private readonly BATCH_SIZE = 200;
  
  async parseOrganizationImportFile(
    file: File, 
    level: 2 | 3,
    onProgress?: (progress: number) => void
  ): Promise<OrganizationImportData[]> {
    this.validateFileType(file);
    this.validateFileSize(file);
    
    const workbook = await this.readExcelFile(file);
    const rawData = this.parseExcelToJson(workbook);
    
    return this.processInChunks(rawData, level, onProgress);
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
    level: 2 | 3,
    onProgress?: (progress: number) => void
  ): OrganizationImportData[] {
    const result: OrganizationImportData[] = [];
    const totalRows = rawData.length - 1; // Exclude header
    
    // Skip header row
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (this.isEmptyRow(row)) continue;
      
      const mappedData = this.mapRowToOrganizationData(row, level, i + 1);
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
  
  private mapRowToOrganizationData(
    row: any[], 
    level: 2 | 3, 
    rowNumber: number
  ): OrganizationImportData | null {
    if (level === 2) {
      return {
        studentCode: this.normalizeStudentCode(row[0]),
        classOrUnitCode: this.normalizeCode(row[1])
      };
    } else {
      return {
        studentCode: this.normalizeStudentCode(row[0])
      };
    }
  }
  
  private normalizeStudentCode(code: any): string {
    if (!code) return '';
    return String(code).trim().toUpperCase();
  }
  
  private normalizeCode(code: any): string {
    if (!code) return '';
    return String(code).trim();
  }
  
  private isEmptyRow(row: any[]): boolean {
    return !row || row.every(cell => !cell || String(cell).trim() === '');
  }
}
```

#### 4.2 Organization Import Validation Service
```typescript
// src/shared/services/organizationImportValidationService.ts - CREATE NEW
export class OrganizationImportValidationService {
  async validateOrganizationImportData(
    data: OrganizationImportData[], 
    level: 2 | 3
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    data.forEach((item, index) => {
      const rowNumber = index + 2; // Excel row (1-indexed + header)
      
      // Validate required fields
      const fieldErrors = this.validateRequiredFields(item, level, rowNumber);
      errors.push(...fieldErrors);
      
      // Validate formats
      const formatErrors = this.validateFormats(item, level, rowNumber);
      errors.push(...formatErrors);
    });
    
    // Check for duplicates
    const duplicateErrors = this.checkDuplicates(data, level);
    errors.push(...duplicateErrors);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        total: data.length,
        valid: data.length - errors.filter(e => e.type === 'error').length,
        invalid: errors.filter(e => e.type === 'error').length,
        duplicates: duplicateErrors.length
      }
    };
  }
  
  private validateRequiredFields(
    item: OrganizationImportData, 
    level: 2 | 3, 
    rowNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!item.studentCode?.trim()) {
      errors.push({
        row: rowNumber,
        field: 'studentCode',
        value: item.studentCode,
        message: 'Mã số sinh viên không được để trống',
        type: 'error'
      });
    }
    
    if (level === 2 && !item.classOrUnitCode?.trim()) {
      errors.push({
        row: rowNumber,
        field: 'classOrUnitCode', 
        value: item.classOrUnitCode,
        message: 'Mã lớp/đơn vị không được để trống',
        type: 'error'
      });
    }
    
    return errors;
  }
  
  private validateFormats(
    item: OrganizationImportData, 
    level: 2 | 3, 
    rowNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Validate student code format (basic validation)
    if (item.studentCode && !this.isValidStudentCode(item.studentCode)) {
      errors.push({
        row: rowNumber,
        field: 'studentCode',
        value: item.studentCode,
        message: 'Mã số sinh viên không đúng định dạng',
        type: 'warning' // Warning because format might vary
      });
    }
    
    return errors;
  }
  
  private checkDuplicates(data: OrganizationImportData[], level: 2 | 3): ValidationError[] {
    const errors: ValidationError[] = [];
    const seen = new Set<string>();
    
    data.forEach((item, index) => {
      const rowNumber = index + 2;
      const key = level === 2 
        ? `${item.studentCode}_${item.classOrUnitCode}`
        : item.studentCode;
      
      if (seen.has(key)) {
        errors.push({
          row: rowNumber,
          field: level === 2 ? 'studentCode,classOrUnitCode' : 'studentCode',
          value: key,
          message: 'Dòng dữ liệu bị trùng lặp',
          type: 'error'
        });
      } else {
        seen.add(key);
      }
    });
    
    return errors;
  }
  
  private isValidStudentCode(code: string): boolean {
    // Basic validation - could be enhanced based on business rules
    return /^[A-Z0-9]{6,15}$/.test(code);
  }
}
```

#### 4.3 Frontend Organization Import Submit Service
```typescript
// src/shared/services/organizationImportSubmitService.ts - CREATE NEW
export class OrganizationImportSubmitService {
  private readonly BATCH_SIZE = 200;
  
  async submitOrganizationImport(
    data: OrganizationImportData[],
    level: 2 | 3,
    organizationId?: string,
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<ImportResult> {
    const sessionId = this.generateSessionId();
    const totalBatches = Math.ceil(data.length / this.BATCH_SIZE);
    
    let totalSuccessful = 0;
    let totalFailed = 0;
    const errors: string[] = [];
    
    try {
      for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * this.BATCH_SIZE;
        const endIndex = Math.min(startIndex + this.BATCH_SIZE, data.length);
        const batch = data.slice(startIndex, endIndex);
        
        // Report progress
        if (onProgress) {
          onProgress({
            currentBatch: i + 1,
            totalBatches,
            processedRecords: startIndex,
            totalRecords: data.length,
            percentage: (startIndex / data.length) * 100,
            currentOperation: 'importing'
          });
        }
        
        // Submit batch
        const batchResult = await this.submitBatch(batch, {
          batchNumber: i + 1,
          totalBatches,
          sessionId
        }, level, organizationId);
        
        totalSuccessful += batchResult.successful;
        totalFailed += batchResult.failed;
        if (batchResult.errors) {
          errors.push(...batchResult.errors);
        }
      }
      
      return {
        sessionId,
        success: totalFailed === 0,
        importedCount: totalSuccessful,
        skippedCount: 0,
        failedCount: totalFailed,
        errors,
        message: totalFailed === 0 
          ? `Import thành công ${totalSuccessful} thành viên`
          : `Import thành công ${totalSuccessful}, thất bại ${totalFailed} thành viên`
      };
      
    } catch (error) {
      throw new Error(`Lỗi trong quá trình import: ${error.message}`);
    }
  }
  
  private async submitBatch(
    batch: OrganizationImportData[],
    batchInfo: BatchInfo,
    level: 2 | 3,
    organizationId?: string
  ): Promise<BatchImportResult> {
    const endpoint = '/organizations/members/import/batch';
    
    const response = await apiClient.post<BatchImportResult>(endpoint, {
      members: batch,
      batchInfo,
      options: {
        level,
        organizationId,
        skipDuplicates: true,
        validateBusinessRules: true
      }
    });
    
    return response;
  }
  
  private generateSessionId(): string {
    return `org_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 5. Backend API Changes - Batch Processing Support

#### 5.1 New Batch Import Endpoint
```typescript
// backend/src/organizations/organizations.controller.ts - ADD NEW ENDPOINT
@Post('members/import/batch')
@ApiOperation({ summary: 'Import thành viên theo batch với client-side processing' })
@ApiResponse({ status: 200, description: 'Kết quả import batch' })
async importMembersBatch(
  @Body() importData: {
    members: OrganizationImportData[],
    batchInfo: {
      batchNumber: number,
      totalBatches: number,
      sessionId: string
    },
    options: {
      level: 2 | 3,
      organizationId?: string,
      skipDuplicates?: boolean,
      validateBusinessRules?: boolean
    }
  }
) {
  return this.batchImportService.processBatch(
    importData.members,
    importData.batchInfo,
    importData.options
  );
}
```

#### 5.2 Batch Import Service
```typescript
// backend/src/organizations/services/batch-import.service.ts - CREATE NEW
@Injectable()
export class OrganizationBatchImportService {
  private readonly sessionCache = new Map<string, SessionData>();
  
  async processBatch(
    members: OrganizationImportData[],
    batchInfo: BatchInfo,
    options: ImportOptions
  ): Promise<BatchImportResult> {
    try {
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (const memberData of members) {
        try {
          await this.processMember(memberData, options);
          successful++;
        } catch (error) {
          failed++;
          errors.push(`${memberData.studentCode}: ${error.message}`);
        }
      }
      
      // Update session progress
      await this.updateSessionProgress(batchInfo.sessionId, {
        batchNumber: batchInfo.batchNumber,
        successful,
        failed,
        errors
      });
      
      const sessionSummary = await this.getSessionSummary(batchInfo.sessionId);
      
      return {
        success: failed === 0,
        batchResult: {
          processed: members.length,
          successful,
          failed,
          errors
        },
        sessionSummary
      };
      
    } catch (error) {
      throw new Error(`Lỗi xử lý batch: ${error.message}`);
    }
  }
  
  private async processMember(
    memberData: OrganizationImportData,
    options: ImportOptions
  ): Promise<void> {
    // Validate business rules
    await this.validateBusinessRules(memberData, options);
    
    // Find user by student code
    const user = await this.usersService.findByStudentCode(memberData.studentCode);
    if (!user) {
      throw new Error('Không tìm thấy sinh viên');
    }
    
    // Determine target organization
    let targetOrganizationId: string;
    
    if (options.level === 2) {
      // Level 2: Find organization by classOrUnitCode
      const organization = await this.organizationsService.findByCode(memberData.classOrUnitCode);
      if (!organization) {
        throw new Error(`Không tìm thấy tổ chức với mã: ${memberData.classOrUnitCode}`);
      }
      targetOrganizationId = organization.id;
    } else {
      // Level 3: Use provided organizationId
      if (!options.organizationId) {
        throw new Error('organizationId là bắt buộc cho level 3');
      }
      targetOrganizationId = options.organizationId;
    }
    
    // Check for duplicates
    if (options.skipDuplicates) {
      const existingMembership = await this.organizationsService.findMembership(
        user.id, 
        targetOrganizationId
      );
      if (existingMembership?.isActive) {
        throw new Error('Sinh viên đã là thành viên của tổ chức');
      }
    }
    
    // Add member to organization
    await this.organizationsService.addMember(targetOrganizationId, user.id);
  }
  
  private async validateBusinessRules(
    memberData: OrganizationImportData,
    options: ImportOptions
  ): Promise<void> {
    // Add specific business validation rules here
    if (options.level === 2 && !memberData.classOrUnitCode) {
      throw new Error('Mã lớp/đơn vị là bắt buộc cho level 2');
    }
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
      isComplete: false
    };
    
    sessionData.totalProcessed += batchResult.processed;
    sessionData.totalSuccessful += batchResult.successful;
    sessionData.totalFailed += batchResult.failed;
    sessionData.errors.push(...batchResult.errors);
    
    this.sessionCache.set(sessionId, sessionData);
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

### 6. Frontend Integration Updates

#### 6.1 Update OrganizationsPage (Minimal changes)
```typescript
// src/features/organizations/OrganizationsPage.tsx - MINIMAL UPDATE
// Chỉ cần update useImportModal để support client-side mode
const { importConfig, handleImportModalClose } = useImportModal({
  level,
  organizationId: undefined,
  onRefresh: fetchData
});

// Không cần thay đổi gì khác - OrganizationPageLayout và ImportModal đều support batch processing
```

#### 6.2 Frontend Main Functions
```typescript
// src/shared/services/organizationImportService.ts - CREATE NEW
const organizationExcelParser = new OrganizationExcelParserService();
const organizationValidator = new OrganizationImportValidationService();
const organizationSubmitter = new OrganizationImportSubmitService();

export const frontendParseOrganizationFile = async (
  file: File, 
  level: 2 | 3,
  onProgress?: (progress: number) => void
): Promise<OrganizationImportData[]> => {
  return organizationExcelParser.parseOrganizationImportFile(file, level, onProgress);
};

export const frontendValidateOrganizationData = async (
  data: OrganizationImportData[], 
  level: 2 | 3
): Promise<ValidationResult> => {
  return organizationValidator.validateOrganizationImportData(data, level);
};

export const frontendSubmitOrganizationImport = async (
  data: OrganizationImportData[],
  level: 2 | 3,
  organizationId?: string,
  onProgress?: (progress: ProgressInfo) => void
): Promise<ImportResult> => {
  return organizationSubmitter.submitOrganizationImport(data, level, organizationId, onProgress);
};
```

### 7. Performance Considerations cho Large Files

#### 7.1 Frontend Batch Processing (cho 10k+ records)
```typescript
// Batch size optimization cho organizations
const BATCH_SIZE = 200; // Smaller batch for org processing
const PARSE_CHUNK_SIZE = 1000; // Parse in larger chunks

// Web Workers cho heavy parsing
const parseInWorker = async (file: File, level: 2 | 3) => {
  const worker = new Worker('/workers/organizationExcelParser.worker.js');
  return new Promise<OrganizationImportData[]>((resolve, reject) => {
    worker.postMessage({ file, level });
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
// Session-based batch processing với database optimization
export class OrganizationBatchImportService {
  private sessionCache = new Map<string, SessionData>();
  
  async processBatch(members: OrganizationImportData[], batchInfo: BatchInfo, options: ImportOptions) {
    // Bulk database operations để tăng performance
    const users = await this.usersService.findByStudentCodes(
      members.map(m => m.studentCode)
    );
    
    // Batch insert memberships
    const memberships = members.map(memberData => {
      const user = users.find(u => u.studentCode === memberData.studentCode);
      return {
        userId: user.id,
        organizationId: this.getTargetOrganizationId(memberData, options),
        role: 'member',
        isActive: true
      };
    });
    
    await this.organizationsService.bulkAddMembers(memberships);
  }
}
```

### 8. Implementation Phases

#### Phase 1: Frontend Services Setup (Week 1)
- [ ] Install dependencies: `xlsx`, `yup`, `validator`, `@types/file-saver`
- [ ] Create `OrganizationExcelParserService` cho client-side parsing
- [ ] Create `OrganizationImportValidationService` cho client-side validation  
- [ ] Create `OrganizationImportSubmitService` cho batch submission
- [ ] Test parsing với organizationColumns configuration

#### Phase 2: useOrganizationImport Enhancement (Week 2)
- [ ] Add feature flag support để switch giữa server/client mode
- [ ] Update useOrganizationImport để support client-side processing
- [ ] Thêm batch processing configuration
- [ ] Test với existing ImportModal UI (không cần tạo mới)

#### Phase 3: Backend Batch API (Week 3)  
- [ ] Create new batch import endpoint `POST /organizations/members/import/batch`
- [ ] Implement `OrganizationBatchImportService` với session management
- [ ] Add bulk database operations cho performance
- [ ] Keep old endpoints for backward compatibility

#### Phase 4: Integration và Testing (Week 4)
- [ ] Update OrganizationsPage để sử dụng client-side mode (feature flag)
- [ ] Configure batch processing cho large files (1k+ records)
- [ ] Test real-time progress tracking trong existing ImportModal
- [ ] Performance testing với files 5k+ records
- [ ] Enhanced error reporting cho batch failures

#### Phase 5: Migration và Cleanup (Week 5)
- [ ] Performance comparison old vs new system
- [ ] User acceptance testing với different organization levels
- [ ] Enable feature flag for production
- [ ] Remove old import endpoints sau khi stable

### 9. Testing Strategy

#### 9.1 Unit Tests
```typescript
// Frontend Services
describe('OrganizationExcelParserService', () => {
  test('should parse level 2 organization file correctly')
  test('should parse level 3 organization file correctly')  
  test('should handle empty rows gracefully')
  test('should normalize student codes properly')
})

describe('OrganizationImportValidationService', () => {
  test('should validate required fields for level 2')
  test('should validate required fields for level 3')
  test('should detect duplicate entries')
  test('should validate student code format')
})

// Backend Service
describe('OrganizationBatchImportService', () => {
  test('should process level 2 batch correctly')
  test('should process level 3 batch correctly')
  test('should handle duplicate memberships')
  test('should rollback on batch errors')
})
```

#### 9.2 Integration Tests
- Level 2 organization import flow (có classOrUnitCode)
- Level 3 organization import flow (chỉ studentCode)
- Large file processing (2k+ rows) với batch
- Error scenarios và recovery
- Performance benchmarks cho different organization levels

### 10. Migration Strategy với Feature Flag

#### 10.1 Backward Compatibility
```typescript
// Sử dụng feature flag để smooth transition
const useNewOrganizationImport = useFeatureFlag('NEW_ORGANIZATION_IMPORT_SYSTEM');

const importConfig: ImportModalConfig = {
  entityName: 'organizations',
  columns: organizationColumns(level, t),
  
  // Switch processing mode dựa trên feature flag
  processingMode: useNewOrganizationImport ? 'client' : 'server',
  useClientSideProcessing: useNewOrganizationImport,
  enableBatchProcessing: useNewOrganizationImport,
  
  // Fallback to old system nếu feature flag = false
  entityService: !useNewOrganizationImport ? organizationService : undefined,
  
  // New client-side functions
  parseFile: useNewOrganizationImport ? 
    (file, onProgress) => frontendParseOrganizationFile(file, level, onProgress) : undefined,
  validateClientData: useNewOrganizationImport ? 
    (data) => frontendValidateOrganizationData(data, level) : undefined,
  submitClientData: useNewOrganizationImport ? 
    (data, onProgress) => frontendSubmitOrganizationImport(data, level, organizationId, onProgress) : undefined
};
```

#### 10.2 Rollback Plan
- Feature flag để instant rollback về server-side processing
- Giữ old endpoints trong 2-3 versions
- Database schema không đổi  
- ImportModal component không đổi (chỉ config khác)
- Monitoring để track performance và error rates

### 11. Success Metrics

#### 11.1 Performance Metrics
- File parsing time: < 3s cho 5k records (level 2), < 2s cho 5k records (level 3)
- Memory usage: < 100MB cho 5k records
- Batch processing: 200 records/batch
- Import throughput: ~1500 records/minute (faster than users vì ít validation)  
- Progress update: Real-time progress cho mỗi batch
- Error recovery time: < 3s per failed batch

#### 11.2 User Experience
- **Giữ nguyên existing UI**: Upload -> Preview -> Importing -> Result
- **Level-aware validation**: Khác nhau cho level 2 vs level 3
- **Real-time feedback**: immediate parsing và validation results
- **Consistent interface**: users không cần học lại

#### 11.3 Development Efficiency  
- **80% code reuse**: ImportModal và UI components giữ nguyên
- **Service-only development**: chỉ viết business logic services
- **Easy A/B testing**: feature flag switching
- **Minimal risk**: UI đã stable, chỉ change processing logic

## Lợi ích của Migration cho Organizations

### 1. Performance
- **Faster processing**: Client-side parsing cho immediate feedback
- **Reduced server load**: Server chỉ xử lý business logic
- **Batch optimization**: 200 records/batch cho optimal throughput

### 2. User Experience  
- **Level-aware import**: Khác biệt rõ ràng giữa level 2 (class import) và level 3 (individual import)
- **Real-time validation**: Immediate feedback về duplicate memberships
- **Better error messages**: Context-aware error messages cho organization hierarchy
- **Progress visibility**: Track progress qua từng batch

### 3. Development & Maintenance
- **Reuse existing components**: ImportModal, organizationColumns, useImportModal hooks
- **Single responsibility services**: Parsing, validation, submission tách biệt
- **Easy testing**: Unit test cho từng service riêng biệt
- **Feature flag rollback**: Safe deployment và rollback strategy

### 4. Business Logic
- **Organization hierarchy support**: Level 2 (find org by code) vs Level 3 (specific org)
- **Membership validation**: Check existing memberships before adding
- **Bulk operations**: Efficient database operations cho large imports
- **Session tracking**: Monitor import progress và error recovery

## Rủi ro và Mitigation

### 1. Organization Hierarchy Complexity
**Risk**: Level 2 import cần lookup organization by classOrUnitCode  
**Mitigation**: Pre-validate organization codes trước khi submit batch

### 2. Large File Processing  
**Risk**: 5k+ organization members có thể slow browser
**Mitigation**: Web Workers, chunking, và batch processing với 200 records/batch

### 3. Business Rule Validation
**Risk**: Complex membership rules có thể được bypass ở client
**Mitigation**: Server-side validation vẫn enforce all business rules

### 4. Level-specific Logic
**Risk**: Level 2 vs Level 3 có logic khác nhau có thể confuse
**Mitigation**: 
- Clear validation rules cho từng level
- Separate parsing logic cho level 2 vs 3  
- UI hints để giải thích difference giữa levels

Kế hoạch này tận dụng tối đa components có sẵn trong hệ thống, đảm bảo migration smooth và low-risk cho organization import functionality.