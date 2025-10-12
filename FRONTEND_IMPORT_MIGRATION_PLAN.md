# Kế hoạch Migration: Chuyển xử lý Import từ Backend sang Frontend

## Tổng quan

Hiện tại: Backend nhận file, parse Excel, validate và import
Mục tiêu: Frontend parse Excel, tạo JSON array, gửi qua API cho Backend xử lý

## Module Users - Phase 1

### 1. Phân tích hiện tại

#### Backend hiện tại:
```
POST /users/import/upload -> ExcelParserService.parseExcelFile()
POST /users/import/validate -> ImportValidationService.validateImportData()  
POST /users/import/execute -> ImportService.executeImport()
```

#### Dữ liệu flow:
```
File Excel -> Backend Parse -> UserImportData[] -> Validation -> Database
```

#### Mục tiêu mới:
```
File Excel -> Frontend Parse -> JSON Array -> API -> Database
```

### 2. Tận dụng Frontend Components có sẵn

#### 2.1 ImportModal Component (Đã có sẵn)
```typescript
// src/shared/components/ImportModal.tsx - SỬ DỤNG LẠI
// Component này đã có đầy đủ chức năng:
// - File upload với drag & drop
// - Preview data table
// - Validation error display
// - Progress tracking
// - Result summary

// Chỉ cần cấu hình ImportModalConfig mới:
const userImportConfig: ImportModalConfig = {
  entityName: 'users',
  columns: userColumns(t), // Từ importColumns.ts
  acceptedFileTypes: ['.xlsx', '.xls'],
  maxFileSize: 10 * 1024 * 1024,
  // Thay đổi: Sử dụng frontend parsing thay vì server-side
  parseFile: frontendParseUserFile,        // NEW
  validateClientData: frontendValidateData, // NEW
  submitClientData: frontendSubmitImport,  // NEW
}
```

#### 2.2 Excel Parser Service (Tạo mới - Service only)
```typescript
// src/shared/services/excelParserService.ts
export class ExcelParserService {
  private readonly BATCH_SIZE = 200; // Batch size cho large files
  
  async parseUserImportFile(file: File): Promise<UserImportData[]>
  async parseInChunks(file: File, onProgress?: (progress: number) => void): Promise<UserImportData[]>
  private validateFileType(file: File): void
  private validateFileSize(file: File): void  
  private parseExcelToJson(workbook: WorkBook): UserImportData[]
  private mapRowToUserData(row: any[]): UserImportData
  private normalizeEmail(email: string): string | null
  private processBatch(data: any[], startIndex: number, batchSize: number): UserImportData[]
}
```

#### 2.3 Import Validation Service (Tạo mới - Service only) 
```typescript
// src/shared/services/importValidationService.ts
export class ImportValidationService {
  async validateUserImportData(data: UserImportData[]): Promise<ValidationResult>
  private validateRequiredFields(user: UserImportData): ValidationError[]
  private validateEmailFormat(email: string): boolean
  private validatePhoneFormat(phone: string): boolean
  private checkDuplicates(data: UserImportData[]): ValidationError[]
}
```

#### 2.4 ImportColumns Configuration (Đã có sẵn)
```typescript
// src/shared/utils/importColumns.ts - SỬ DỤNG LẠI
// Đã có userColumns() function với 18 cột đầy đủ
// Không cần chỉnh sửa gì thêm
```

### 3. Backend API Changes - Batch Processing Support

#### 3.1 Batch Import APIs
```typescript
// Xóa các endpoint cũ:
// POST /users/import/upload
// POST /users/import/validate  
// POST /users/import/execute

// Tạo API mới với batch support:
POST /users/import/batch
Body: {
  users: UserImportData[],        // Max 200 items per batch
  batchInfo: {
    batchNumber: number,          // 1, 2, 3, ...
    totalBatches: number,         // Total số batches
    sessionId: string             // Unique session ID để track
  },
  options: {
    skipDuplicates: boolean,
    updateExisting: boolean,
    dryRun: boolean
  }
}

Response: {
  success: boolean,
  batchResult: {
    processed: number,
    successful: number,
    failed: number,
    errors: string[]
  },
  sessionSummary: {             // Summary của toàn bộ session
    totalProcessed: number,
    totalSuccessful: number, 
    totalFailed: number,
    isComplete: boolean         // true khi xử lý xong all batches
  }
}
```

#### 3.2 Batch Import Service với Session Management
```typescript
// backend/src/users/services/batch-import.service.ts
export class BatchImportService {
  private readonly BATCH_SIZE = 200;
  
  async processBatch(
    users: UserImportData[],
    batchInfo: BatchInfo,
    options: ImportOptions
  ): Promise<BatchImportResult>
  
  async getSessionSummary(sessionId: string): Promise<SessionSummary>
  async clearSession(sessionId: string): Promise<void>
  
  private async processUser(userData: UserImportData): Promise<User>
  private async handleDuplicates(code: string): Promise<User | null>
  private async validateBusinessRules(userData: UserImportData): Promise<void>
  private async updateSessionProgress(sessionId: string, batchResult: BatchResult): Promise<void>
}

interface BatchInfo {
  batchNumber: number;
  totalBatches: number;
  sessionId: string;
}

interface SessionSummary {
  sessionId: string;
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  isComplete: boolean;
  errors: string[];
}
```

### 4. Frontend Libraries cần thêm

#### 4.1 Excel Processing
```json
{
  "xlsx": "^0.18.5",           // Để parse Excel files
  "file-saver": "^2.0.5",     // Để download template/errors
  "@types/file-saver": "^2.0.7"
}
```

#### 4.2 Validation
```json
{
  "yup": "^1.3.3",            // Schema validation
  "validator": "^13.11.0"     // Email, phone validation
}
```

### 5. UI/UX Flow - Tận dụng ImportModal có sẵn

#### 5.1 Existing Import Modal Steps (GIỮ NGUYÊN)
```
Step 1: Upload (renderUploadStep)
  - Drag & drop UI đã có
  - File validation đã có
  - Instructions panel đã có
  
Step 2: Preview (renderPreviewStep)  
  - Data preview table đã có
  - Summary cards đã có
  - Filter controls đã có
  - Pagination đã có
  
Step 3: Importing (renderImportingStep)
  - Progress spinner đã có
  - Loading states đã có
  
Step 4: Result (renderResultStep)
  - Success/error summary đã có
  - Error details display đã có
```

#### 5.2 Changes needed trong ImportModal - Batch Processing Support
```typescript
// Thêm mode để support client-side processing với batch
interface ImportModalConfig {
  // Existing properties...
  
  // NEW: Client-side processing functions
  parseFile?: (file: File, onProgress?: (progress: number) => void) => Promise<UserImportData[]>;
  validateClientData?: (data: UserImportData[]) => Promise<ValidationResult>;
  submitClientData?: (data: UserImportData[], onProgress?: (progress: ProgressInfo) => void) => Promise<ImportResult>;
  
  // NEW: Batch processing config
  batchSize?: number;           // Default 200
  useClientSideProcessing?: boolean;
  enableBatchProcessing?: boolean; // For large files like 27k records
}

// Enhanced progress tracking cho batch processing
interface ProgressInfo {
  currentBatch: number;
  totalBatches: number;
  processedRecords: number;
  totalRecords: number;
  percentage: number;
  currentOperation: 'parsing' | 'validating' | 'importing';
}

// Update ImportModal state để handle batch progress
interface ImportState {
  // Existing properties...
  
  // NEW: Batch processing state
  batchProgress?: ProgressInfo;
  sessionId?: string;
  totalRecords?: number;
  isBatchProcessing?: boolean;
}
```

#### 5.2 Error Handling
```typescript
interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
  type: 'validation' | 'business' | 'system';
}

interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  warnings: number;
  errors: ImportError[];
}
```

### 6. Performance Considerations - Batch Processing cho 27k records

#### 6.1 Frontend Batch Processing
```typescript
// Batch processing cho 27k records với batch size = 200
const BATCH_SIZE = 200;
const PARSE_CHUNK_SIZE = 1000; // Parse nhiều hơn, submit ít hơn

class BatchImportManager {
  private sessionId: string = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  async processLargeFile(data: UserImportData[], onProgress?: (progress: ProgressInfo) => void) {
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);
    const results: BatchResult[] = [];
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = data.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      
      try {
        const result = await this.submitBatch(batch, {
          batchNumber: i + 1,
          totalBatches,
          sessionId: this.sessionId
        });
        
        results.push(result);
        
        // Update progress
        const progress: ProgressInfo = {
          currentBatch: i + 1,
          totalBatches,
          processedRecords: (i + 1) * BATCH_SIZE,
          totalRecords: data.length,
          percentage: Math.round(((i + 1) / totalBatches) * 100)
        };
        
        onProgress?.(progress);
        
        // Optional: Small delay to prevent server overload
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error);
        // Continue với batch tiếp theo hoặc stop tùy strategy
      }
    }
    
    return results;
  }
  
  private async submitBatch(batch: UserImportData[], batchInfo: BatchInfo) {
    const response = await apiClient.post('/users/import/batch', {
      users: batch,
      batchInfo,
      options: { skipDuplicates: true }
    });
    return response;
  }
}

interface ProgressInfo {
  currentBatch: number;
  totalBatches: number;
  processedRecords: number;
  totalRecords: number;
  percentage: number;
}

// Web Workers cho heavy parsing (27k records)
const parseInWorker = async (file: File) => {
  const worker = new Worker('/workers/excelParser.worker.js');
  return new Promise((resolve) => {
    worker.postMessage({ file, batchSize: PARSE_CHUNK_SIZE });
    worker.onmessage = (e) => resolve(e.data);
  });
}
```

#### 6.2 Backend Optimizations cho Batch Processing
```typescript
// Session-based batch processing với persistent state
export class BatchImportService {
  private sessionCache = new Map<string, SessionData>(); // In-memory hoặc Redis
  
  async processBatch(users: UserImportData[], batchInfo: BatchInfo, options: ImportOptions) {
    const { sessionId, batchNumber, totalBatches } = batchInfo;
    
    // Initialize session if first batch
    if (batchNumber === 1) {
      this.sessionCache.set(sessionId, {
        totalRecords: users.length * totalBatches,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [],
        startTime: new Date()
      });
    }
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const batchResults = {
        processed: 0,
        successful: 0, 
        failed: 0,
        errors: [] as string[]
      };
      
      // Process batch với smaller sub-batches để avoid timeout
      const SUB_BATCH_SIZE = 50;
      for (let i = 0; i < users.length; i += SUB_BATCH_SIZE) {
        const subBatch = users.slice(i, i + SUB_BATCH_SIZE);
        const subResult = await this.processSubBatch(subBatch, queryRunner);
        
        batchResults.processed += subResult.processed;
        batchResults.successful += subResult.successful;
        batchResults.failed += subResult.failed;
        batchResults.errors.push(...subResult.errors);
      }
      
      await queryRunner.commitTransaction();
      
      // Update session progress
      this.updateSessionProgress(sessionId, batchResults);
      
      // Get final session summary
      const sessionSummary = this.getSessionSummary(sessionId);
      
      // Clean up if complete
      if (batchNumber === totalBatches) {
        setTimeout(() => this.sessionCache.delete(sessionId), 300000); // Clean up after 5 minutes
      }
      
      return {
        success: true,
        batchResult: batchResults,
        sessionSummary
      };
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  
  private async processSubBatch(users: UserImportData[], queryRunner: QueryRunner) {
    // Process 50 users at a time within transaction
    const results = { processed: 0, successful: 0, failed: 0, errors: [] };
    
    for (const user of users) {
      try {
        await this.processUser(user, queryRunner);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${results.processed + 1}: ${error.message}`);
      }
      results.processed++;
    }
    
    return results;
  }
}
```

### 7. Implementation Phases - Tận dụng components có sẵn

#### Phase 1: Services & Libraries (Week 1)
- [ ] Setup frontend Excel parsing libraries (xlsx, yup, validator)
- [ ] Create ExcelParserService for client-side parsing
- [ ] Create ImportValidationService for client-side validation
- [ ] Test parsing với existing userColumns configuration

#### Phase 2: ImportModal Enhancement (Week 2)  
- [ ] Thêm client-side processing mode vào ImportModal
- [ ] Update handleFileSelect để support frontend parsing
- [ ] Modify validation flow để sử dụng client-side validation
- [ ] Keep existing UI components (không tạo mới)

#### Phase 3: Backend API Simplification (Week 3)
- [ ] Create new bulk import endpoint POST /users/import/bulk
- [ ] Implement BulkImportService (đơn giản hóa)
- [ ] Keep old endpoints for backward compatibility
- [ ] Add comprehensive error handling

#### Phase 4: Integration với existing components + Batch Processing (Week 4)
- [ ] Update users page để sử dụng ImportModal với client-side batch mode
- [ ] Configure ImportModalConfig cho batch processing (batchSize: 200)
- [ ] Implement batch progress tracking trong existing ImportModal
- [ ] Test với file 27k records để ensure performance
- [ ] Enhanced error reporting cho batch failures
- [ ] Add session management cho batch tracking

#### Phase 5: Testing & Migration (Week 5)
- [ ] Performance testing với existing ImportModal UI
- [ ] Compare old vs new import flow
- [ ] User acceptance testing
- [ ] Remove old endpoints sau khi stable

### 8. Migration Strategy - Sử dụng lại ImportModal

#### 8.1 Backward Compatibility với cùng 1 component
```typescript
// Sử dụng cùng ImportModal với config khác nhau
const useNewImportSystem = useFeatureFlag('NEW_IMPORT_SYSTEM');

const importConfig: ImportModalConfig = {
  entityName: 'users',
  columns: userColumns(t),
  acceptedFileTypes: ['.xlsx', '.xls'], 
  maxFileSize: 10 * 1024 * 1024,
  
  // Conditional config based on feature flag
  ...(useNewImportSystem ? {
    // Client-side processing
    useClientSideProcessing: true,
    parseFile: frontendParseUserFile,
    validateClientData: frontendValidateData,
    submitClientData: frontendSubmitImport
  } : {
    // Server-side processing (existing)
    uploadFile: serverUploadFile,
    validateServerData: serverValidateData, 
    executeServerImport: serverExecuteImport
  })
};

// Cùng 1 component ImportModal
return <ImportModal isOpen={isOpen} onClose={onClose} config={importConfig} />
```

#### 8.2 Rollback Plan - Không cần change components
- Feature flag để switch back configuration
- Giữ old endpoints trong 1-2 versions  
- Database schema không đổi
- ImportModal component không đổi (chỉ config khác)
- Chỉ cần đổi useClientSideProcessing: false

### 9. Testing Strategy

#### 9.1 Unit Tests
```typescript
// Frontend
describe('ExcelParserService', () => {
  test('should parse valid Excel file')
  test('should handle invalid file format')
  test('should validate file size limits')
  test('should normalize email fields')
})

// Backend  
describe('BulkImportService', () => {
  test('should create users in batches')
  test('should handle duplicate codes')
  test('should rollback on errors')
})
```

#### 9.2 Integration Tests
- File upload flow end-to-end
- Large file processing (10k+ rows)
- Error scenarios and recovery
- Performance benchmarks

### 10. Success Metrics

#### 10.1 Performance Metrics - Large File Support (27k records)
- File parsing time: < 5s cho 27k rows với Web Workers
- Memory usage: < 150MB cho 27k rows với streaming
- Batch processing: 200 records/batch, ~135 batches cho 27k records
- Import throughput: ~1000 records/minute với concurrent batches
- Progress update: Real-time progress cho mỗi batch
- Error recovery time: < 5s per failed batch
- Session cleanup: Auto cleanup after completion

#### 10.2 User Experience - Giữ nguyên UI familiarity
- **Giữ nguyên 4 steps hiện tại**: Upload -> Preview -> Importing -> Result
- Real-time feedback: immediate parsing results
- **Consistent UI**: users không cần học lại interface
- **Existing error display**: tận dụng error components có sẵn

#### 10.3 Development Efficiency
- **Code reuse**: 80% component code giữ nguyên
- **Faster implementation**: chỉ cần viết services, không viết UI
- **Lower risk**: UI đã tested và stable
- **Easy rollback**: chỉ cần đổi config flag

## Lợi ích của Migration - Tận dụng components có sẵn

### 1. Performance
- Giảm tải server processing
- Instant feedback cho users
- Parallel processing trên client

### 2. User Experience  
- Real-time validation
- Better error messages
- Progress visibility (sử dụng existing UI)
- Offline capability (parsing)

### 3. Development Efficiency
- **Không cần viết lại UI components**
- **Tận dụng existing ImportModal với 4 steps có sẵn**
- **Sử dụng lại userColumns configuration**
- **Giữ nguyên user experience đã quen thuộc**

### 4. Scalability & Maintainability
- Server chỉ xử lý business logic
- Client-side caching
- Reduced server load
- **Ít code changes hơn = ít bugs hơn**
- **Consistent UI across all import flows**

## Rủi ro và Mitigation

### 1. Browser Compatibility
**Risk**: Older browsers không support modern APIs
**Mitigation**: Polyfills và fallback cho IE11+

### 2. Memory Issues
**Risk**: Large files crash browser  
**Mitigation**: Streaming, chunking, Web Workers

### 3. Security
**Risk**: Client-side validation có thể bypass
**Mitigation**: Server-side validation vẫn cần thiết

### 4. Network Issues với Large Files (27k records)
**Risk**: Large payload có thể fail, network timeout
**Mitigation**: 
- Batch processing với 200 records/batch
- Retry logic cho failed batches  
- Session-based recovery (có thể resume từ batch bị failed)
- Progress persistence để avoid complete restart
- Concurrent batch processing với rate limiting