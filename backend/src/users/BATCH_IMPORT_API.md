# Batch Import API Documentation

## Overview

Hệ thống batch import mới cho phép frontend xử lý file Excel, sau đó gửi JSON array về backend qua API batch processing. Điều này cải thiện hiệu suất và user experience cho files lớn (tới 27k records).

## New Endpoints

### 1. POST /users/import/batch

**Mô tả**: Import batch users từ frontend với client-side processing

**Request Body**:
```typescript
{
  users: UserImportDto[],        // Max 200 users per batch
  batchInfo: {
    batchNumber: number,         // 1, 2, 3, ...
    totalBatches: number,        // Total batches in session
    sessionId: string            // Unique session ID
  },
  options?: {
    skipDuplicates: boolean,     // Default: true
    updateExisting: boolean,     // Default: false
    dryRun: boolean             // Default: false
  }
}
```

**Response**:
```typescript
{
  success: boolean,
  batchResult: {
    processed: number,
    successful: number,
    failed: number,
    errors: string[]
  },
  sessionSummary: {
    totalProcessed: number,
    totalSuccessful: number,
    totalFailed: number,
    isComplete: boolean,
    startTime: Date,
    endTime?: Date,
    duration?: number
  },
  message: string
}
```

### 2. GET /users/import/batch/:sessionId/summary

**Mô tả**: Lấy tổng kết session batch import

### 3. DELETE /users/import/batch/:sessionId

**Mô tả**: Xóa session data sau khi hoàn tất

## Batch Processing Workflow

### Frontend Flow:
1. **Parse Excel**: Client-side parsing với ExcelParserService
2. **Validate**: Client-side validation với ImportValidationService  
3. **Batch Submit**: Chia data thành batches 200 records, submit tuần tự
4. **Progress Tracking**: Real-time progress với session management
5. **Error Recovery**: Retry logic cho failed batches

### Backend Flow:
1. **Receive Batch**: Nhận JSON array từ frontend (max 200 records)
2. **Session Management**: Track progress across multiple batches
3. **Transaction Processing**: Process trong sub-batches 50 records
4. **Error Handling**: Comprehensive error logging và recovery
5. **Response**: Trả về batch result + session summary

## Performance Features

### Large File Support (27k records):
- **Batch Size**: 200 records per API call
- **Sub-batch Processing**: 50 records per transaction
- **Session Tracking**: Progress persistence across batches
- **Memory Management**: Efficient processing without memory issues
- **Concurrent Processing**: Multiple batches có thể chạy song song

### Error Recovery:
- **Transaction Rollback**: Failed batch không ảnh hưởng các batch khác
- **Selective Skip**: Skip duplicate records nếu configured
- **Detailed Logging**: Row-level error reporting
- **Session Cleanup**: Auto cleanup expired sessions

## Backward Compatibility

### Existing Endpoints (MAINTAINED):
- `POST /users/import/upload` - Server-side Excel processing
- `GET /users/import/:sessionId/validate` - Server-side validation
- `POST /users/import/:sessionId/execute` - Server-side import execution

### Migration Strategy:
- **Phase 1**: Deploy new endpoints alongside existing ones
- **Phase 2**: Frontend sử dụng feature flag để switch
- **Phase 3**: Gradually migrate users to new system
- **Phase 4**: Deprecate old endpoints sau 2-3 versions

## Data Mapping

### UserImportDto Fields:
```typescript
{
  code: string,              // Required: Student ID
  familyName: string,        // Required: Family name
  givenName: string,         // Required: Given name
  email?: string,            // Optional
  phone?: string,            // Optional
  gender?: string,           // Maps to Gender enum (NAM/NU)
  dateOfBirth?: string,      // Maps to birthDate
  nationalId?: string,       // Maps to identityCard
  departmentCode?: string,   // Resolves to Department entity
  classCode?: string,        // Resolves to Class entity
  admissionYear?: number,    // Maps to string field
  // ... other optional fields
}
```

### Entity Relationships:
- **Department**: Resolved by code -> sets managementDepartment & trainingDepartment
- **Class**: Resolved by code -> sets class relationship
- **User Type**: Defaults to STUDENT
- **Password**: Auto-generated from email prefix or code

## Error Handling

### Validation Errors:
- **Required Fields**: code, familyName, givenName
- **Format Validation**: Email, phone patterns
- **Reference Validation**: Department/Class code existence
- **Business Rules**: Duplicate code handling

### System Errors:
- **Database Connection**: Transaction rollback
- **Memory Issues**: Sub-batch processing
- **Network Timeouts**: Batch retry logic
- **Session Expiry**: 30-minute auto cleanup

## Monitoring & Logging

### Performance Metrics:
- Batch processing time per 200 records
- Total session duration for large files
- Error rates by batch and session
- Memory usage during processing

### Audit Logging:
- Session start/end with record counts
- Batch-level success/failure tracking
- Row-level error details with line numbers
- User action tracking (who initiated import)

## Testing

### Unit Tests:
- BatchImportService logic
- DTO validation
- Error handling scenarios
- Session management

### Integration Tests:
- Full batch import workflow
- Large file processing (1k, 10k, 27k records)
- Concurrent batch processing
- Error recovery scenarios

### Load Tests:
- Multiple concurrent sessions
- Memory usage with large datasets
- Database performance under load
- API response times

## Examples

### Client-side Implementation:
```typescript
// Frontend batch processing
const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const batchSize = 200;
const batches = chunkArray(userData, batchSize);

for (let i = 0; i < batches.length; i++) {
  const batchResult = await fetch('/api/users/import/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      users: batches[i],
      batchInfo: {
        batchNumber: i + 1,
        totalBatches: batches.length,
        sessionId
      },
      options: { skipDuplicates: true }
    })
  });
  
  // Update progress UI
  updateProgress(i + 1, batches.length);
}

// Get final summary
const summary = await fetch(`/api/users/import/batch/${sessionId}/summary`);
```

## Future Enhancements

1. **Redis Session Storage**: Scale across multiple server instances
2. **Background Processing**: Queue-based processing for very large files
3. **Real-time WebSocket**: Live progress updates
4. **Export Templates**: Dynamic template generation
5. **Batch Analytics**: Detailed import statistics và insights