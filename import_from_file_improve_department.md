# Kế hoạch nâng cấp API Import Departments cho file Excel lớn

## 1. Phân tích hiện trạng
- Hệ thống departments hiện tại có architecture tương tự classes với các service riêng biệt: ImportService, ExcelParserService, ImportValidationService, ImportSessionService
- Import hiện tại xử lý từng dòng một cách tuần tự (for loop)
- Chưa có batch processing và transaction management
- Chưa có fallback mechanism khi batch insert thất bại
- Session timeout hiện tại chỉ 30 phút, không đủ cho file lớn

## 2. Kế hoạch chi tiết các bước thực hiện

### Bước 1: Cải tiến DepartmentImportSessionService
**Mục tiêu:** Thêm khả năng tracking batch processing và progress

**Thay đổi:**
- Thêm BatchProcessingStatus interface với tracking currentBatch, totalBatches, processedRows
- Thêm BatchResult interface để theo dõi kết quả từng batch
- Mở rộng ImportSession interface để bao gồm batchProcessing field
- Thêm các status mới: 'importing', 'paused' ngoài các status hiện tại
- Thêm configuration cho batch size (mặc định 200 dòng/batch)
- Tăng session timeout từ 30 phút lên 2 giờ cho file lớn
- Thêm methods để quản lý batch progress: initializeBatchProcessing, updateBatchProgress, pauseImport, resumeImport

### Bước 2: Tạo DepartmentBatchProcessingService
**Mục tiêu:** Xử lý logic chia batch và quản lý batch processing cho departments

**Chức năng:**
- Chia dữ liệu department thành các batch với size configurable (200 dòng/batch)
- Quản lý thứ tự batch processing với BatchData interface
- Theo dõi trạng thái từng batch (pending, processing, success, failed)
- Tính toán progress và thống kê với BatchProcessingStats
- Retry logic cho batch thất bại với configurable maxRetries và retryDelay
- Optimized batch size dựa trên data size (nhỏ hơn 1000 dòng dùng batch 100, lớn hơn 10000 dùng batch 400)
- Fallback mechanism tạo các batch nhỏ hơn khi batch lớn thất bại
- Validation batch data integrity trước khi xử lý

### Bước 3: Tạo DepartmentTransactionService
**Mục tiêu:** Quản lý transaction cho batch processing departments

**Chức năng:**
- Transaction scope cho từng batch với configurable isolation level
- Auto-commit khi batch thành công, auto-rollback khi thất bại
- Deadlock detection và automatic retry với exponential backoff
- Connection pool management tối ưu cho concurrent batch processing
- Transaction timeout configuration (mặc định 60 giây/batch)
- Transaction statistics tracking: success rate, average execution time, deadlock count
- Health monitoring cho transaction performance
- Retry logic cho các lỗi có thể retry: deadlock, connection timeout, temporary server errors

### Bước 4: Nâng cấp DepartmentImportService
**Mục tiêu:** Tích hợp batch processing và transaction cho departments

**Thay đổi executeImport method:**
- Thay đổi từ single-row processing sang batch processing architecture
- Tích hợp DepartmentBatchProcessingService cho việc chia batch
- Tích hợp DepartmentTransactionService cho transaction management
- Implement performBatchImport method thay thế performImport cũ
- Thêm fallback mechanism 3 cấp độ:
  1. Batch insert với transaction
  2. Fallback sang batch nhỏ hơn nếu thất bại
  3. Single row insert nếu vẫn thất bại
- Progress reporting real-time qua session service
- Thêm pause/resume capability trong quá trình import
- Error aggregation và detailed logging cho từng batch

### Bước 5: Cải tiến Database Operations cho Departments
**Mục tiêu:** Tối ưu performance cho bulk operations departments

**Thay đổi:**
- Sử dụng TypeORM bulk insert operations thay vì insert từng dòng
- Optimize validation queries sử dụng IN clauses cho check duplicate departments
- Implement conflict resolution strategy cho department name/code conflicts
- Database indexing optimization cho department queries
- Connection pooling configuration phù hợp với batch processing
- Bulk validation operations để giảm database round trips
- Efficient upsert operations cho update existing departments

### Bước 6: Thêm Background Processing cho Departments
**Mục tiêu:** Xử lý file department lớn trong background

**Thay đổi:**
- Implement job queue system sử dụng Bull Queue cho async processing
- Background job cho import departments với progress tracking
- Real-time progress updates qua WebSocket/Server-Sent Events
- Job scheduling với priority queue (small files trước, large files sau)
- Resource management: memory monitoring, CPU usage control
- Job retry mechanism với exponential backoff
- Cleanup expired import sessions và temporary data
- Progress notification system cho user

### Bước 7: Nâng cấp Department API Endpoints
**Mục tiêu:** Hỗ trợ async processing và progress tracking cho departments

**Thay đổi Controller:**
- Thêm endpoint GET /departments/import/:sessionId/progress cho real-time progress
- Thêm endpoint POST /departments/import/:sessionId/pause để tạm dừng import
- Thêm endpoint POST /departments/import/:sessionId/resume để tiếp tục import
- Thêm endpoint POST /departments/import/:sessionId/cancel để hủy import
- Modify executeImport để support batchSize parameter
- Return immediate response cho async processing với job ID
- Enhanced error responses với batch-level error details
- API versioning để backward compatibility

### Bước 8: Memory Management cho Department Import
**Mục tiêu:** Xử lý file department lớn không gây memory leak

**Thay đổi:**
- Streaming Excel parser thay vì load toàn bộ department data vào memory
- Chunk processing cho validation departments để giảm memory footprint
- Garbage collection optimization sau mỗi batch
- Memory usage monitoring với alerts khi vượt threshold
- Temporary file cleanup sau khi import xong
- Data pagination trong memory cho large datasets
- Memory-efficient data structures cho department processing
- Configurable memory limits per import session

### Bước 9: Error Handling và Logging cho Departments
**Mục tiêu:** Comprehensive error handling cho department batch processing

**Thay đổi:**
- Detailed error logging cho từng batch với batch number và timestamp
- Error categorization: validation errors, database errors, system errors
- Retry strategies khác nhau cho different error types
- Error aggregation và summary reporting
- Performance metrics logging: batch processing time, memory usage, database performance
- Structured logging với correlation IDs để track batches
- Error notification system cho critical failures
- Error recovery strategies và rollback procedures

### Bước 10: Configuration Management cho Department Import
**Mục tiêu:** Flexible configuration cho different department import scenarios

**Thay đổi:**
- Environment-based configuration với .env variables
- Batch size configuration based on environment (dev/staging/prod)
- Timeout configurations: session timeout, transaction timeout, batch timeout
- Memory limits configuration: max memory per session, memory warning threshold
- Concurrent processing limits: max concurrent batches, max concurrent sessions
- Database connection pool settings: pool size, connection timeout, idle timeout
- Retry configuration: max retries, retry delay, backoff factor
- Feature flags cho enable/disable batch processing, background jobs

## 3. Thứ tự ưu tiên thực hiện

### Phase 1 (Core Infrastructure - 2-3 ngày):
1. Cải tiến DepartmentImportSessionService với batch tracking
2. Tạo DepartmentBatchProcessingService với logic chia batch
3. Tạo DepartmentTransactionService với transaction management

### Phase 2 (Database Operations - 2-3 ngày):
4. Nâng cấp DepartmentImportService với batch processing
5. Cải tiến Database Operations với bulk operations

### Phase 3 (Advanced Features - 3-4 ngày):
6. Thêm Background Processing với job queue
7. Nâng cấp API Endpoints với progress tracking

### Phase 4 (Optimization - 2-3 ngày):
8. Memory Management optimization
9. Error Handling và Logging enhancement
10. Configuration Management setup

## 4. Lưu ý kỹ thuật cho Department Import

### Performance Considerations:
- Batch size 200 phù hợp cho departments, có thể điều chỉnh based on testing
- Department validation phức tạp hơn classes do có nested relationships
- Connection pooling cần cấu hình cao hơn do department queries phức tạp
- Memory monitoring quan trọng do department data có thể lớn

### Transaction Strategy:
- Mỗi batch department sẽ có transaction riêng để đảm bảo data consistency
- Rollback chỉ ảnh hưởng đến batch hiện tại, không ảnh hưởng batches đã import
- Checkpoint mechanism để resume từ batch thất bại
- Special handling cho department hierarchy conflicts

### Fallback Strategy cho Departments:
- Batch insert thất bại → retry với batch size nhỏ hơn (100 dòng)
- Nếu vẫn thất bại → fallback sang single row insert
- Single row thất bại → log error, skip và continue với rows khác
- Department conflict resolution strategy: skip, update, hoặc fail based on option

### Monitoring cho Department Import:
- Real-time progress tracking với percentage và ETA
- Performance metrics: throughput (departments/second), memory usage
- Error statistics: error rate, error categories, failed departments
- Resource usage monitoring: CPU, memory, database connections
- Business metrics: success rate, processing time, user satisfaction

### Department-Specific Challenges:
- Department hierarchy validation phức tạp
- Department code uniqueness across organizations
- Parent-child relationship consistency
- Bulk validation cho department dependencies
- Conflict resolution cho existing departments
## 6. Success Criteria

### Performance Targets:
- Xử lý 12,000 departments trong vòng 10-15 phút
- Memory usage không vượt quá 512MB per session
- Success rate >= 95% cho valid data
- Support đồng thời 5-10 import sessions

### Functional Requirements:
- Batch processing với configurable batch size
- Pause/resume functionality
- Real-time progress tracking
- Comprehensive error handling và recovery
- Backward compatibility với existing import flow

### Technical Requirements:
- Transaction safety với proper rollback
- Memory efficiency với large files
- Horizontal scalability
- Monitoring và alerting
- Configuration flexibility

Kế hoạch này đảm bảo khả năng xử lý file Excel department lớn với 12,000+ dòng một cách hiệu quả, an toàn và có thể scale được, đồng thời maintain compatibility với existing department import functionality.