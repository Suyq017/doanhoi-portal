# Batch Processing API Documentation

## Overview
This documentation describes the enhanced batch processing capabilities for the Classes Import API. The system now supports processing large Excel files (up to 12,000+ rows) with advanced features like progress tracking, pause/resume functionality, and fallback mechanisms.

## Key Features

### 1. Batch Processing
- **Configurable batch sizes**: Default 200 rows per batch, optimized based on data size
- **Transaction per batch**: Each batch is processed in its own transaction
- **Fallback mechanism**: If a batch fails, it's retried with smaller batch sizes
- **Single-row fallback**: As a last resort, individual rows are processed

### 2. Progress Tracking
- **Real-time progress**: Track current batch, completed batches, and overall progress
- **Detailed statistics**: Processing time, success rates, error counts
- **Batch-level details**: Status, timing, and error information for each batch

### 3. Session Management
- **Extended timeout**: Sessions now last 2 hours (increased from 30 minutes)
- **Enhanced status**: New statuses include 'importing', 'paused'
- **Batch metadata**: Track batch processing state and results

### 4. Control Operations
- **Pause/Resume**: Pause long-running imports and resume them later
- **Cancel**: Cancel ongoing imports
- **Retry logic**: Automatic retry with exponential backoff

## API Endpoints

### 1. Upload File
```http
POST /classes/import/upload
```
**Body**: Form-data with Excel file
**Response**: Import session information

### 2. Validate Data
```http
GET /classes/import/:sessionId/validate
```
**Response**: Validation results with errors and warnings

### 3. Execute Import
```http
POST /classes/import/:sessionId/execute
```
**Body**: 
```json
{
  "skipConflicts": true,
  "batchSize": 200
}
```
**Response**: Import execution results

### 4. Get Progress (NEW)
```http
GET /classes/import/:sessionId/progress
```
**Response**: 
```json
{
  "sessionId": "class_import_123",
  "status": "importing",
  "progress": {
    "currentBatch": 3,
    "totalBatches": 10,
    "completedBatches": 2,
    "failedBatches": 0,
    "processingBatches": 1,
    "progressPercent": 25.5,
    "processedRows": 400,
    "totalRows": 1500,
    "batchSize": 200,
    "canPause": true,
    "canResume": false,
    "isPaused": false,
    "startTime": "2024-01-01T10:00:00Z",
    "endTime": null
  },
  "batchResults": [
    {
      "batchNumber": 1,
      "status": "success",
      "processedRows": 200,
      "successCount": 195,
      "failedCount": 0,
      "skippedCount": 5,
      "errors": [],
      "retryCount": 0,
      "startTime": "2024-01-01T10:00:00Z",
      "endTime": "2024-01-01T10:01:30Z"
    }
  ]
}
```

### 5. Pause Import (NEW)
```http
POST /classes/import/:sessionId/pause
```
**Response**: 
```json
{
  "sessionId": "class_import_123",
  "status": "paused",
  "message": "Import has been paused successfully"
}
```

### 6. Resume Import (NEW)
```http
POST /classes/import/:sessionId/resume
```
**Response**: 
```json
{
  "sessionId": "class_import_123",
  "status": "importing",
  "message": "Import has been resumed successfully"
}
```

### 7. Cancel Import (NEW)
```http
POST /classes/import/:sessionId/cancel
```
**Response**: 
```json
{
  "sessionId": "class_import_123",
  "status": "failed",
  "message": "Import has been cancelled successfully"
}
```

### 8. Get Session Status
```http
GET /classes/import/:sessionId/status
```
**Response**: Complete session information including batch processing details

## Configuration

### Environment Variables
```bash
# Batch Processing Configuration
BATCH_DEFAULT_SIZE=200
BATCH_MAX_SIZE=1000
BATCH_MIN_SIZE=10
BATCH_MAX_RETRIES=3
BATCH_RETRY_DELAY=1000
BATCH_SESSION_TIMEOUT=7200000  # 2 hours in milliseconds
BATCH_ENABLE_FALLBACK=true
BATCH_FALLBACK_SIZE=50
BATCH_TRANSACTION_TIMEOUT=60000  # 1 minute in milliseconds
BATCH_MEMORY_LIMIT_MB=512
BATCH_MAX_CONCURRENT=3
```

## Error Handling

### Batch-Level Errors
- **Transaction failures**: Automatic rollback and retry
- **Deadlock detection**: Automatic retry with delay
- **Timeout handling**: Configurable transaction timeouts
- **Memory management**: Monitoring and cleanup

### Fallback Mechanisms
1. **Batch retry**: Retry failed batch up to 3 times
2. **Smaller batch fallback**: Split large batches into smaller ones
3. **Single-row fallback**: Process individual rows as last resort
4. **Skip and continue**: Option to skip failed rows and continue

## Performance Optimizations

### 1. Bulk Insert Operations
- Use TypeORM bulk insert for better performance
- Fallback to individual inserts if bulk operation fails
- Optimized query patterns for validation

### 2. Transaction Management
- Batch-level transactions for data consistency
- Configurable isolation levels
- Connection pooling optimization

### 3. Memory Management
- Streaming data processing to avoid memory issues
- Garbage collection optimization
- Configurable memory limits

### 4. Database Optimizations
- Efficient validation queries using IN clauses
- Proper indexing for performance
- Connection pool configuration

## Monitoring and Logging

### 1. Progress Monitoring
- Real-time progress tracking
- Batch-level statistics
- Performance metrics

### 2. Error Logging
- Detailed error categorization
- Batch-level error tracking
- Performance metrics logging

### 3. Health Status
- Transaction health monitoring
- Success/failure rates
- Performance statistics

## Best Practices

### 1. File Size Recommendations
- **Small files (< 1,000 rows)**: Default batch size works well
- **Medium files (1,000 - 10,000 rows)**: Use default or slightly larger batches
- **Large files (> 10,000 rows)**: Consider larger batch sizes for better performance

### 2. Error Handling
- Always check validation results before import
- Use skipConflicts option for duplicate handling
- Monitor progress for long-running imports

### 3. Performance Tuning
- Adjust batch sizes based on data characteristics
- Monitor memory usage for large imports
- Use appropriate transaction timeouts

### 4. Monitoring
- Regularly check import progress
- Monitor error rates and patterns
- Use health status endpoints for system monitoring

## Migration Guide

### From Old API
1. **Upload**: No changes required
2. **Validate**: No changes required
3. **Execute**: New optional `batchSize` parameter
4. **Status**: Enhanced with batch processing information
5. **New endpoints**: Utilize progress tracking and control operations

### Frontend Integration
1. **Progress polling**: Use `/progress` endpoint for real-time updates
2. **Control buttons**: Implement pause/resume/cancel functionality
3. **Error handling**: Enhanced error information from batch processing
4. **User feedback**: Show detailed progress and statistics

This enhanced batch processing system provides a robust, scalable solution for handling large Excel imports with comprehensive monitoring and control capabilities.
