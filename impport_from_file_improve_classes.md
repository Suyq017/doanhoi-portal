Tôi sẽ lập kế hoạch chi tiết để nâng cấp API import dữ liệu từ file Excel cho trang classes với khả năng xử lý file lớn. Hãy để tôi phân tích cấu trúc hiện tại trước. Dựa trên việc phân tích cấu trúc code hiện tại, tôi sẽ lập kế hoạch chi tiết để nâng cấp API import dữ liệu từ file Excel với khả năng xử lý file lớn:

# Kế hoạch nâng cấp API Import Classes cho file Excel lớn

## 1. Phân tích hiện trạng

- Hệ thống hiện tại có architecture tốt với các service riêng biệt: ImportService, ExcelParserService, ImportValidationService, ImportSessionService
- Import hiện tại xử lý từng dòng một cách tuần tự (for loop)
- Chưa có batch processing và transaction management
- Chưa có fallback mechanism khi batch insert thất bại

## 2. Kế hoạch chi tiết các bước thực hiện

### Bước 1: Cải tiến ImportSessionService

**Mục tiêu:** Thêm khả năng tracking batch processing và progress

**Thay đổi:**

- Thêm batch processing status vào ImportSession interface
- Thêm progress tracking (currentBatch, totalBatches, processedRows)
- Thêm batch results history để theo dõi từng batch
- Thêm configuration cho batch size (mặc định 200)
- Thêm timeout cho session dài hạn (tăng từ 30 phút lên 2 giờ)

### Bước 2: Tạo BatchProcessingService mới

**Mục tiêu:** Xử lý logic chia batch và quản lý batch processing

**Chức năng:**

- Chia dữ liệu thành các batch với size configurable (200 dòng/batch)
- Quản lý thứ tự batch processing
- Theo dõi trạng thái từng batch (pending, processing, success, failed)
- Tính toán progress và thống kê
- Retry logic cho batch thất bại

### Bước 3: Tạo TransactionService

**Mục tiêu:** Quản lý transaction cho batch processing

**Chức năng:**

- Tạo transaction scope cho từng batch
- Commit transaction khi batch thành công
- Rollback transaction khi batch thất bại
- Isolation level configuration
- Connection pool management
- Deadlock detection và retry

### Bước 4: Nâng cấp ImportService

**Mục tiêu:** Tích hợp batch processing và transaction

**Thay đổi performImport method:**

- Thay đổi từ single-row processing sang batch processing
- Tích hợp BatchProcessingService
- Tích hợp TransactionService
- Thêm fallback mechanism: batch insert → single row insert
- Thêm progress reporting real-time
- Thêm pause/resume capability

### Bước 5: Cải tiến Database Operations

**Mục tiêu:** Tối ưu performance cho bulk operations

**Thay đổi:**

- Sử dụng TypeORM bulk insert operations
- Optimize query cho validation (IN clauses thay vì multiple queries)
- Implement upsert operations cho conflict resolution
- Add database indexes cho performance
- Connection pooling configuration

### Bước 6: Thêm Background Processing

**Mục tiêu:** Xử lý file lớn trong background

**Thay đổi:**

- Tạo job queue system (sử dụng Bull Queue hoặc tương tự)
- Async processing cho file lớn
- Real-time progress updates qua WebSocket/SSE
- Job scheduling và retry mechanism
- Resource management (memory, CPU)

### Bước 7: Nâng cấp API Endpoints

**Mục tiêu:** Hỗ trợ async processing và progress tracking

**Thay đổi Controller:**

- Thêm endpoint GET /import/:sessionId/progress
- Thêm endpoint POST /import/:sessionId/pause
- Thêm endpoint POST /import/:sessionId/resume
- Thêm endpoint POST /import/:sessionId/cancel
- Modify executeImport để return immediate response cho async processing

### Bước 8: Memory Management

**Mục tiêu:** Xử lý file lớn không gây memory leak

**Thay đổi:**

- Streaming Excel parser thay vì load toàn bộ vào memory
- Chunk processing cho validation
- Garbage collection optimization
- Memory usage monitoring
- Temporary file cleanup

### Bước 9: Error Handling và Logging

**Mục tiêu:** Comprehensive error handling cho batch processing

**Thay đổi:**

- Detailed error logging cho từng batch
- Error categorization (validation, database, system)
- Retry strategies cho different error types
- Error aggregation và reporting
- Performance metrics logging

### Bước 10: Configuration Management

**Mục tiêu:** Flexible configuration cho different scenarios

**Thay đổi:**

- Environment-based configuration
- Batch size configuration
- Timeout configurations
- Memory limits
- Concurrent processing limits
- Database connection pool settings

## 3. Thứ tự ưu tiên thực hiện

### Phase 1 (Core Infrastructure):

1. Cải tiến ImportSessionService
2. Tạo BatchProcessingService
3. Tạo TransactionService

### Phase 2 (Database Operations):

4. Nâng cấp ImportService
5. Cải tiến Database Operations

### Phase 3 (Advanced Features):

6. Thêm Background Processing
7. Nâng cấp API Endpoints

### Phase 4 (Optimization):

8. Memory Management
9. Error Handling và Logging
10. Configuration Management

## 4. Lưu ý kỹ thuật

### Performance Considerations:

- Batch size 200 có thể điều chỉnh tùy theo performance testing
- Connection pooling phải được cấu hình phù hợp
- Memory monitoring để avoid OOM errors

### Transaction Strategy:

- Mỗi batch sẽ có transaction riêng
- Rollback chỉ ảnh hưởng đến batch hiện tại
- Checkpoint mechanism để resume từ batch thất bại

### Fallback Strategy:

- Batch insert thất bại → retry với batch size nhỏ hơn
- Nếu vẫn thất bại → fallback sang single row insert
- Single row thất bại → log error và continue

### Monitoring:

- Real-time progress tracking
- Performance metrics
- Error statistics
- Resource usage monitoring

Kế hoạch này đảm bảo khả năng xử lý file Excel lớn với 12,000 dòng một cách hiệu quả, an toàn và có thể scale được.
