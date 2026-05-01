# Danh sách tính năng hệ thống CTXH

## 📋 Tổng quan

Hệ thống quản lý Công tác xã hội (CTXH) cho sinh viên ĐHBK với các module chính:
- Quản lý danh mục hoạt động
- Quản lý hoạt động CTXH
- Quản lý đăng ký và chấm điểm
- Import dữ liệu từ hệ thống cũ
- Báo cáo cá nhân sinh viên

---

## 1️⃣ Quản lý Danh mục CTXH (Category Management)

### 1.1 Xem danh sách danh mục
- ✅ Hiển thị tất cả danh mục CTXH
- ✅ Thông tin: Tên, Mô tả, Số hoạt động, Ngày tạo
- ✅ Sắp xếp theo display_order
- ✅ Dark mode support

### 1.2 Tạo danh mục mới
- ✅ Form nhập: Tên danh mục, Mô tả, Thứ tự hiển thị
- ✅ Validation: Tên bắt buộc, độ dài tối đa
- ✅ Thông báo thành công/lỗi

### 1.3 Chỉnh sửa danh mục
- ✅ Mở modal với dữ liệu hiện tại
- ✅ Cập nhật thông tin
- ✅ Auto-refresh sau khi lưu

### 1.4 Xóa danh mục
- ✅ Soft delete (không xóa vĩnh viễn)
- ✅ Confirm dialog trước khi xóa
- ✅ Kiểm tra danh mục có hoạt động hay không

### 1.5 Phân quyền
- ✅ Chỉ Admin/Staff được phép thao tác
- ✅ Sinh viên chỉ xem

---

## 2️⃣ Quản lý Hoạt động CTXH (Activity Management)

### 2.1 Xem danh sách hoạt động
- ✅ Hiển thị grid/list view
- ✅ Thông tin: Tên, Danh mục, Ngày bắt đầu/kết thúc, Số ngày, Số lượng đăng ký
- ✅ Badge trạng thái: Công khai/Không công khai
- ✅ Badge hạn đăng ký: Còn hạn/Hết hạn
- ✅ Progress bar số lượng đăng ký

### 2.2 Bộ lọc nâng cao
- ✅ Lọc theo danh mục
- ✅ Lọc theo trạng thái (Công khai/Không công khai)
- ✅ Lọc theo thời gian (Sắp diễn ra, Đang diễn ra, Đã kết thúc)
- ✅ Tìm kiếm theo tên hoạt động
- ✅ Sắp xếp theo: Ngày tạo, Ngày bắt đầu, Tên

### 2.3 Phân trang
- ✅ Pagination với page size tùy chỉnh (10, 20, 50, 100)
- ✅ Hiển thị tổng số hoạt động
- ✅ Quick jump to page

### 2.4 Tạo hoạt động mới
**Thông tin cơ bản:**
- ✅ Tên hoạt động (bắt buộc)
- ✅ Chọn danh mục (dropdown)
- ✅ Mô tả chi tiết (textarea)
- ✅ Địa điểm tổ chức

**Thông tin thời gian:**
- ✅ Ngày bắt đầu (date picker)
- ✅ Ngày kết thúc (date picker)
- ✅ Hạn đăng ký (date picker)
- ✅ Validation: Hạn đăng ký < Ngày bắt đầu < Ngày kết thúc

**Thông tin tham gia:**
- ✅ Tổng số ngày CTXH được tính
- ✅ Số lượng tối đa (0 = không giới hạn)
- ✅ Trạng thái công khai (toggle)

### 2.5 Chỉnh sửa hoạt động
- ✅ Load dữ liệu hiện tại
- ✅ Cập nhật thông tin
- ✅ Validate trước khi lưu

### 2.6 Xóa hoạt động
- ✅ Soft delete
- ✅ Confirm dialog
- ✅ Kiểm tra có sinh viên đăng ký không

### 2.7 Công khai/Ẩn hoạt động
- ✅ Toggle nhanh trên card/list
- ✅ Update status ngay lập tức
- ✅ Chỉ hoạt động công khai mới hiển thị cho sinh viên

### 2.8 Quản lý hạn mức CTXH
- ✅ Cấu hình giới hạn số ngày theo danh mục
- ✅ Validation khi chấm điểm vượt giới hạn
- ✅ Warning cho admin khi cấu hình

---

## 3️⃣ Quản lý Tham gia & Chấm điểm (Participation & Grading)

### 3.1 Xem chi tiết hoạt động
**Thông tin hoạt động:**
- ✅ Hiển thị đầy đủ thông tin: Tên, Danh mục, Thời gian, Địa điểm, Mô tả
- ✅ Thống kê: Tổng đăng ký, Đã hoàn thành, Đã hủy
- ✅ Progress completion rate

**Danh sách sinh viên:**
- ✅ Table view với columns: MSSV, Họ tên, Email, Ngày đăng ký, Số ngày thực tế, Trạng thái, Ghi chú
- ✅ Filter theo trạng thái (Đã đăng ký, Đã hoàn thành, Đã hủy)
- ✅ Search theo MSSV/Tên
- ✅ Sort theo columns

### 3.2 Đăng ký tham gia (Sinh viên)
- ✅ Button "Đăng ký" trên card hoạt động
- ✅ Kiểm tra đủ điều kiện:
  - Hoạt động còn slot
  - Chưa hết hạn đăng ký
  - Chưa đăng ký trước đó
- ✅ Thông báo thành công/lỗi
- ✅ Gửi email xác nhận (optional)

### 3.3 Chấm điểm thủ công
**Chấm điểm từng sinh viên:**
- ✅ Click "Chấm điểm" trên row
- ✅ Modal nhập:
  - Số ngày thực tế (decimal, 0.5 increments)
  - Ghi chú (textarea)
- ✅ Validation:
  - Số ngày > 0
  - Số ngày <= Tổng ngày hoạt động
  - Không vượt giới hạn danh mục
- ✅ Auto-update:
  - Status → COMPLETED
  - Graded by, Graded at
  - User.ctxh_days += actual_days

**Hiển thị lịch sử:**
- ✅ Người chấm điểm
- ✅ Thời gian chấm
- ✅ Số ngày đã chấm
- ✅ Ghi chú

### 3.4 Chấm điểm hàng loạt (Bulk Grading)
**Download template:**
- ✅ Button "Tải file mẫu"
- ✅ Excel template với columns: MSSV, Số ngày, Ghi chú
- ✅ Dữ liệu mẫu (2-3 rows)

**Upload & Validate:**
- ✅ Upload file Excel (.xlsx, .xls)
- ✅ Parse client-side với XLSX.js
- ✅ Validation rules:
  - MSSV tồn tại trong danh sách tham gia
  - Số ngày hợp lệ (> 0, <= total_days)
  - Không duplicate MSSV
- ✅ Hiển thị preview table với validation status
- ✅ Filter: Tất cả / Hợp lệ / Lỗi

**Submit:**
- ✅ Button "Nhập dữ liệu"
- ✅ Batch processing (50 records/batch)
- ✅ Progress bar real-time
- ✅ Kết quả: Thành công / Thất bại
- ✅ Export errors to Excel

**Auto-update:**
- ✅ Update tất cả participations → COMPLETED
- ✅ Update users.ctxh_days
- ✅ Transaction-safe (rollback nếu lỗi)

### 3.5 Hủy tham gia
**Hủy thủ công:**
- ✅ Button "Hủy" trên row
- ✅ Confirm dialog
- ✅ Update status → CANCELLED
- ✅ Soft delete (deleted_at)
- ✅ Revert ctxh_days nếu đã chấm điểm

**Hủy hàng loạt:**
- ✅ Checkbox chọn nhiều sinh viên
- ✅ Button "Hủy đã chọn"
- ✅ Confirm với số lượng
- ✅ Batch processing

### 3.6 Export danh sách
- ✅ Export to Excel
- ✅ Columns: MSSV, Họ tên, Email, Trạng thái, Số ngày, Ghi chú
- ✅ Filter trước khi export
- ✅ Custom filename với tên hoạt động + timestamp

---

## 4️⃣ Import dữ liệu từ hệ thống cũ (Old System Import)

### 4.1 Giao diện Import
**Landing Page:**
- ✅ Card giới thiệu về tính năng
- ✅ Button "Import CTXH từ hệ thống cũ"
- ✅ Icon và mô tả ngắn

**Import Modal:**
- ✅ Full-screen modal
- ✅ Hướng dẫn chi tiết (3 bước)
- ✅ Download template link ("tại đây")
- ✅ Upload zone (drag & drop)
- ✅ Dark mode support

### 4.2 Template Excel
**Tạo template:**
- ✅ Auto-generate khi mở modal
- ✅ Blob URL (in-memory)
- ✅ Columns: MSSV (text), Số ngày (number)
- ✅ Dữ liệu mẫu (4 rows)
- ✅ Cleanup blob khi đóng modal

**Download:**
- ✅ Click link "tại đây" để download
- ✅ Filename: `ctxh_old_system_template.xlsx`

### 4.3 Upload & Parse
**File upload:**
- ✅ Accept: .xlsx, .xls
- ✅ Max size: 10MB (configurable)
- ✅ Drag & drop support
- ✅ Click to browse

**Client-side parsing:**
- ✅ XLSX.js để đọc Excel
- ✅ Đọc sheet đầu tiên
- ✅ Skip header row
- ✅ Extract columns: MSSV, Số ngày
- ✅ Progress callback real-time

### 4.4 Validation
**Rules:**
- ✅ MSSV: Regex `/^\d{7,10}$/` (7-10 chữ số)
- ✅ Số ngày: Số dương, bội số của 0.5
- ✅ Số ngày < 365 → Warning (vẫn cho qua)
- ✅ Check duplicate MSSV trong file

**Kết quả validation:**
- ✅ Table preview với status icons (✓, ✗, ⚠)
- ✅ Error messages rõ ràng
- ✅ Tabs: Tất cả / Hợp lệ / Lỗi
- ✅ Statistics: X hợp lệ / Y lỗi / Z warnings

### 4.5 Batch Import
**Configuration:**
- ✅ Batch size: 200 records/batch
- ✅ Enable/disable batch processing
- ✅ Auto-calculate total batches

**Processing:**
- ✅ Split data thành batches
- ✅ Sequential processing (không parallel)
- ✅ API call: `POST /ctxh/import/old-system`
- ✅ Progress tracking:
  - Current batch / Total batches
  - Processed records / Total records
  - Percentage (0-100%)
- ✅ Real-time UI update

**Retry logic:**
- ✅ Max 3 attempts per batch
- ✅ Exponential backoff: 1s → 2s → 4s
- ✅ Skip batch nếu fail 3 lần
- ✅ Continue với batches còn lại

**Kết quả:**
- ✅ Tổng số thành công / thất bại
- ✅ Chi tiết errors (nếu có)
- ✅ Duration (thời gian xử lý)
- ✅ Button "Xem chi tiết lỗi" → Export errors

### 4.6 Backend Processing
**API Endpoint:**
- ✅ `POST /ctxh/import/old-system`
- ✅ DTO validation với class-validator
- ✅ @ValidateNested, @IsArray, @Type decorators

**Database operations:**
- ✅ Transaction-safe (BEGIN/COMMIT/ROLLBACK)
- ✅ Loop qua records:
  - Find user by student_code
  - Update `ctxh_days_old_system`
  - Handle not found → Add to errors
- ✅ Batch commit (không commit từng record)

**Response:**
- ✅ `{ successful: number, failed: number, errors: [] }`
- ✅ HTTP 200 (partial success)
- ✅ HTTP 400 (validation error)
- ✅ HTTP 500 (server error)

### 4.7 Modal State Management
**Reset on close:**
- ✅ Modal key prop để force remount
- ✅ Clear file input
- ✅ Clear parsed data
- ✅ Clear validation results
- ✅ Reset progress

**Reopen modal:**
- ✅ Fresh state
- ✅ New template blob URL
- ✅ Clean form

---

## 5️⃣ Báo cáo cá nhân sinh viên (Student Report)

### 5.1 Thông tin sinh viên
**Student Info Card:**
- ✅ Họ tên (từ API hoặc fallback search)
- ✅ MSSV
- ✅ Email
- ✅ Tổng số ngày CTXH (highlighted, large font)

**Auto-fetch missing info:**
- ✅ Nếu API không trả về name/email
- ✅ Gọi UserService.getUsers() để search
- ✅ Update state với thông tin tìm được

### 5.2 Thống kê tổng hợp (Summary Stats)
**4 ô thống kê màu sắc:**

1. **Ngày hoạt động đã hoàn thành** (Xanh lá)
   - ✅ Giá trị: `ctxh_days_new_system`
   - ✅ Nguồn: Tổng actual_days từ participations COMPLETED
   - ✅ Format: Remove trailing zeros (15.0 → 15, 10.5 → 10.5)

2. **Các hoạt động trên hệ thống cũ** (Cam)
   - ✅ Giá trị: `ctxh_days_old_system`
   - ✅ Nguồn: Import từ hệ thống cũ
   - ✅ Readonly (không tự động cập nhật)

3. **Tổng số ngày hoạt động CTXH** (Xanh dương)
   - ✅ Giá trị: `total_days_completed`
   - ✅ Công thức: `ctxh_days_new_system + ctxh_days_old_system`
   - ✅ **FIX**: parseFloat() để tránh string concatenation
   - ✅ So với yêu cầu (15 ngày)

4. **Trạng thái** (Tím)
   - ✅ "Đạt" (xanh) nếu tổng >= 15
   - ✅ "Chưa đạt" (đỏ) nếu tổng < 15
   - ✅ Icon check/cross

### 5.3 Bảng chi tiết hoạt động
**Columns:**
- ✅ Tên hoạt động
- ✅ Danh mục
- ✅ Số ngày thực tế
- ✅ Trạng thái (badge màu sắc)
- ✅ Ngày chấm điểm
- ✅ **Ghi chú** (mới thêm)

**Features:**
- ✅ Sort theo columns
- ✅ Hover effect
- ✅ Responsive table
- ✅ Empty state nếu chưa có hoạt động

### 5.4 API Backend
**Endpoint:**
- ✅ `GET /ctxh/reports/student/:code`
- ✅ Query by student_code (không cần auth)

**Data aggregation:**
- ✅ Join users + participations + activities + categories
- ✅ Calculate totals:
  ```typescript
  ctxhDaysNew = parseFloat(student.ctxhDays || 0)
  ctxhDaysOld = parseFloat(student.ctxhDaysOldSystem || 0)
  totalDays = ctxhDaysNew + ctxhDaysOld
  isQualified = totalDays >= 15
  ```
- ✅ Map activities với thông tin đầy đủ
- ✅ Include note field

**Response DTO:**
- ✅ StudentReportDto với @Expose decorators
- ✅ ActivityReportItemDto với note field
- ✅ Type-safe với class-transformer

### 5.5 Decimal/Float handling
**Problem:**
- ❌ PostgreSQL decimal type → TypeORM trả về string
- ❌ "10.0" + "4.0" = "10.04.0" (string concatenation)

**Solution:**
- ✅ parseFloat(String(value)) trong backend
- ✅ Ensure number addition: 10.0 + 4.0 = 14.0
- ✅ Type conversion an toàn

### 5.6 Responsive Design
- ✅ Mobile-friendly table (horizontal scroll)
- ✅ Grid layout responsive (4 cols → 2 cols → 1 col)
- ✅ Card stacking trên mobile
- ✅ Touch-friendly buttons

### 5.7 Loading States
- ✅ Skeleton loader khi fetch data
- ✅ Spinner animation
- ✅ "Đang tải..." message
- ✅ Error state nếu không tìm thấy sinh viên

### 5.8 No Console Logs
- ✅ Đã xóa tất cả console.log
- ✅ Production-ready code
- ✅ Silent error handling

---

## 6️⃣ Tính năng chung (Common Features)

### 6.1 Authentication & Authorization
- ✅ JWT-based auth
- ✅ Refresh token mechanism
- ✅ Role-based access control (RBAC)
- ✅ Permission guards:
  - Admin: Full access
  - Staff: Quản lý activities & grading
  - Student: View & register only

### 6.2 Dark Mode
- ✅ System-wide dark mode toggle
- ✅ TailwindCSS dark: variants
- ✅ Persist preference in localStorage
- ✅ Smooth transition
- ✅ All components support dark mode:
  - Cards, Tables, Modals
  - Forms, Inputs, Buttons
  - Charts, Progress bars

### 6.3 Internationalization (i18n)
- ✅ Multi-language support (vi/en)
- ✅ i18next integration
- ✅ Translation files:
  - `vi/ctxh.json`, `vi/ctxh-import.json`
  - `en/ctxh.json`, `en/ctxh-import.json`
- ✅ Dynamic language switch
- ✅ Date/time localization

### 6.4 Notifications
- ✅ Toast notifications (success/error/warning)
- ✅ In-app notifications
- ✅ Email notifications (optional)
- ✅ Custom styling với position/duration

### 6.5 Error Handling
**Frontend:**
- ✅ Try-catch blocks
- ✅ User-friendly error messages
- ✅ Fallback UI cho errors
- ✅ Retry buttons

**Backend:**
- ✅ Global exception filter
- ✅ Validation pipe
- ✅ Custom error responses
- ✅ Logging với Winston

### 6.6 Performance Optimization
**Frontend:**
- ✅ React.memo cho components
- ✅ useMemo/useCallback hooks
- ✅ Lazy loading routes
- ✅ Code splitting
- ✅ Virtual scrolling cho large lists

**Backend:**
- ✅ Database indexing
- ✅ Query optimization (select specific fields)
- ✅ Caching strategies
- ✅ Batch operations
- ✅ Connection pooling

### 6.7 Monitoring & Logging
- ✅ Prometheus metrics
- ✅ Grafana dashboards
- ✅ API response time tracking
- ✅ Error rate monitoring
- ✅ Database query performance

### 6.8 Data Validation
**Frontend:**
- ✅ Form validation với Zod/Yup
- ✅ Real-time validation
- ✅ Custom error messages
- ✅ Conditional validation

**Backend:**
- ✅ class-validator decorators
- ✅ Custom validators
- ✅ DTO validation pipe
- ✅ Database constraints

### 6.9 Accessibility (a11y)
- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader support
- ✅ Color contrast (WCAG AA)

### 6.10 Database Features
- ✅ Soft delete (deleted_at)
- ✅ Timestamps (created_at, updated_at)
- ✅ UUID primary keys
- ✅ Foreign key constraints
- ✅ Migrations system
- ✅ Seeding scripts

---

## 📊 Thống kê tổng quan

### Số lượng tính năng
- **Category Management**: 5 tính năng chính
- **Activity Management**: 8 tính năng chính
- **Participation & Grading**: 6 tính năng chính
- **Old System Import**: 7 tính năng chính
- **Student Report**: 8 tính năng chính
- **Common Features**: 10 tính năng chung

**Tổng cộng: 44+ tính năng**

### Tech Stack
**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- i18next (i18n)
- XLSX.js (Excel parsing)
- Lucide React (icons)

**Backend:**
- NestJS + TypeScript
- TypeORM (ORM)
- PostgreSQL (database)
- class-validator (validation)
- JWT (authentication)

**DevOps:**
- Docker + Docker Compose
- Nginx (reverse proxy)
- Prometheus + Grafana (monitoring)

---

## 🚀 Roadmap (Tính năng tương lai)

### Phase 1 - Hoàn thiện hiện tại
- [ ] Email notifications cho đăng ký/chấm điểm
- [ ] Export PDF cho báo cáo cá nhân
- [ ] Calendar view cho hoạt động
- [ ] Dashboard analytics cho admin

### Phase 2 - Mở rộng
- [ ] Mobile app (React Native)
- [ ] QR code check-in
- [ ] Real-time chat support
- [ ] Gamification (badges, leaderboard)

### Phase 3 - Tích hợp
- [ ] SSO với hệ thống ĐHBK
- [ ] API public cho third-party
- [ ] Webhook events
- [ ] Blockchain certificate

---

## 📝 Ghi chú kỹ thuật

### Known Issues
1. ~~Decimal concatenation bug~~ ✅ Fixed (parseFloat)
2. ~~Missing note field in report~~ ✅ Fixed
3. ~~Dark mode inconsistency~~ ✅ Fixed

### Performance Considerations
- Batch import: 200 records optimal cho stability
- Retry logic: 3 attempts với exponential backoff
- Pagination: Default 20 items, max 100
- Cache TTL: 5 minutes cho categories

### Security Best Practices
- Input sanitization
- SQL injection prevention (TypeORM parameterized queries)
- XSS protection
- CSRF tokens
- Rate limiting
- Password hashing (bcrypt)

---

## 📚 Tài liệu liên quan

- [Database Migration Guide](./DATABASE_MIGRATION_GUIDE.md)
- [UML Diagrams](./CTXH_SYSTEM_UML.md)
- [API Documentation](../../../backend/README.md)
- [Deployment Guide](../../../deploy.sh)
