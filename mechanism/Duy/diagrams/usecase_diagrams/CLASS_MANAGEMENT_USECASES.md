# Module Quản Lý Lớp Học - Mô Tả Use Cases

## Tổng Quan Module

Module Quản lý lớp học cho phép quản trị viên quản lý các lớp học trong hệ thống Đoàn Hội Portal. Module hỗ trợ quản lý thông tin lớp học, liên kết với khoa/đơn vị, và import hàng loạt từ file Excel với client-side batch processing.

---

## Use Case 1: Xem Danh Sách Lớp Học

### Use Case Name
Xem danh sách lớp học

### Actors
Quản trị viên

### Description
Quản trị viên xem danh sách tất cả lớp học trong hệ thống với khả năng phân trang, tìm kiếm và lọc theo năm học, khoa, trạng thái hoạt động.

### Trigger
Quản trị viên truy cập vào trang quản lý lớp học hoặc cần tra cứu thông tin lớp học.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền xem danh sách lớp học

### Post-Conditions
- Danh sách lớp học được hiển thị theo tiêu chí đã chọn
- Thông tin bao gồm: tên lớp, năm học, khoa quản lý, số lượng sinh viên, trạng thái

### Normal Flow
1. Quản trị viên truy cập vào trang "Quản lý lớp học"
2. Hệ thống hiển thị danh sách lớp học với phân trang mặc định (10 bản ghi/trang)
3. Hệ thống hiển thị các thông tin: tên lớp, năm học, khoa quản lý, số lượng sinh viên, trạng thái hoạt động
4. Lớp học được sắp xếp theo ngày tạo giảm dần (mới nhất trước)
5. Quản trị viên có thể chuyển trang để xem thêm lớp học
6. Quản trị viên có thể điều chỉnh số lượng bản ghi hiển thị trên mỗi trang

### Alternative Flow
**Flow 2.a: Danh sách rỗng**
- 2.a.1. Hệ thống hiển thị thông báo "Chưa có lớp học nào trong hệ thống"
- 2.a.2. Hệ thống hiển thị nút "Thêm lớp học mới"

### Exception
Không có exception đặc biệt.

---

## Use Case 2: Tìm Kiếm/Lọc Lớp Học

### Use Case Name
Tìm kiếm/lọc lớp học

### Actors
Quản trị viên

### Description
Quản trị viên tìm kiếm và lọc danh sách lớp học theo tên, năm học, khoa hoặc trạng thái hoạt động.

### Trigger
Quản trị viên muốn tìm kiếm lớp học cụ thể hoặc lọc danh sách theo tiêu chí.

### Pre-Conditions
- Quản trị viên đang ở trang danh sách lớp học
- Hệ thống đã có dữ liệu lớp học

### Post-Conditions
- Danh sách lớp học được lọc theo tiêu chí
- Kết quả tìm kiếm hiển thị với phân trang

### Normal Flow
1. Quản trị viên nhập từ khóa vào ô tìm kiếm (tên lớp)
2. Hệ thống tự động tìm kiếm và hiển thị kết quả phù hợp
3. Quản trị viên có thể chọn thêm bộ lọc:
   - Năm học (2020, 2021, 2022, 2023, 2024, ...)
   - Khoa/Đơn vị quản lý
   - Trạng thái hoạt động (Đang hoạt động / Không hoạt động)
4. Hệ thống cập nhật danh sách theo bộ lọc đã chọn
5. Quản trị viên xem kết quả tìm kiếm/lọc

### Alternative Flow
**Flow 2.a: Không tìm thấy kết quả**
- 2.a.1. Hệ thống hiển thị thông báo "Không tìm thấy lớp học phù hợp"
- 2.a.2. Hệ thống hiển thị gợi ý: "Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc"

**Flow 3.a: Xóa bộ lọc**
- 3.a.1. Quản trị viên bấm nút "Xóa bộ lọc"
- 3.a.2. Hệ thống hiển thị lại toàn bộ danh sách lớp học

**Flow 3.b: Lọc theo nhiều tiêu chí**
- 3.b.1. Quản trị viên chọn nhiều bộ lọc cùng lúc (ví dụ: năm 2024 + khoa CNTT + đang hoạt động)
- 3.b.2. Hệ thống áp dụng tất cả bộ lọc với logic AND
- 3.b.3. Hiển thị kết quả thỏa mãn tất cả điều kiện

### Exception
Không có exception đặc biệt.

---

## Use Case 3: Thêm Lớp Học

### Use Case Name
Thêm lớp học

### Actors
Quản trị viên

### Description
Quản trị viên thêm một lớp học mới vào hệ thống thông qua form nhập liệu hoặc import từ file Excel.

### Trigger
Quản trị viên muốn thêm một hoặc nhiều lớp học mới vào hệ thống.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền tạo lớp học mới

### Post-Conditions
- Lớp học mới được tạo và lưu vào cơ sở dữ liệu
- Thông tin lớp học hiển thị trong danh sách

### Normal Flow
Xem chi tiết ở Use Case 4 (Thêm một lớp học bằng form) và Use Case 5 (Thêm nhiều lớp học từ file Excel)

### Alternative Flow
Không áp dụng (use case tổng quát)

### Exception
Không áp dụng (use case tổng quát)

---

## Use Case 4: Thêm Một Lớp Học Bằng Form

### Use Case Name
Thêm một lớp học bằng form

### Actors
Quản trị viên

### Description
Quản trị viên thêm một lớp học mới vào hệ thống thông qua form nhập liệu với thông tin chi tiết.

### Trigger
Quản trị viên cần thêm một lớp học cụ thể với thông tin chi tiết.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền tạo lớp học mới
- Hệ thống đã có danh sách khoa/đơn vị

### Post-Conditions
- Lớp học mới được tạo và lưu vào cơ sở dữ liệu
- Lớp học có trạng thái hoạt động mặc định là "Đang hoạt động"
- Lớp học được liên kết với khoa/đơn vị (nếu có)
- Thông tin lớp học hiển thị trong danh sách

### Normal Flow
1. Quản trị viên bấm nút "Thêm lớp học mới"
2. Hệ thống hiển thị form nhập thông tin lớp học với các trường:
   - **Bắt buộc**: Tên lớp học
   - **Tùy chọn**: Năm học (2000-2100), Khoa/Đơn vị quản lý, Trạng thái hoạt động (mặc định: true)
3. Quản trị viên điền thông tin vào form
4. Nếu chọn khoa/đơn vị, hệ thống hiển thị dropdown danh sách khoa
5. Quản trị viên bấm nút "Lưu"
6. Hệ thống kiểm tra tính hợp lệ của dữ liệu
7. Hệ thống kiểm tra tên lớp học không bị trùng lặp
8. Nếu có chọn khoa, hệ thống kiểm tra khoa có tồn tại
9. Hệ thống lưu thông tin lớp học
10. Hệ thống hiển thị thông báo "Tạo lớp học thành công"
11. Hệ thống chuyển hướng về trang chi tiết lớp học vừa tạo

### Alternative Flow
**Flow 5.a: Hủy tạo lớp học**
- 5.a.1. Quản trị viên bấm nút "Hủy"
- 5.a.2. Hệ thống hiển thị xác nhận "Các thay đổi sẽ không được lưu. Bạn có chắc?"
- 5.a.3. Quản trị viên xác nhận
- 5.a.4. Hệ thống quay về trang danh sách lớp học (không lưu thay đổi)

**Flow 4.a: Không chọn khoa/đơn vị**
- 4.a.1. Quản trị viên không chọn khoa/đơn vị quản lý
- 4.a.2. Lớp học được tạo mà không liên kết với khoa cụ thể
- 4.a.3. Có thể gán khoa sau thông qua chức năng chỉnh sửa

### Exception
**Exception 7.a: Tên lớp học đã tồn tại**
- 7.a.1. Hệ thống kiểm tra phát hiện tên lớp học đã tồn tại
- 7.a.2. Hiển thị lỗi "Lớp học với tên này đã tồn tại trong hệ thống"
- 7.a.3. Quay lại bước 3 để quản trị viên sửa thông tin

**Exception 8.a: Khoa/đơn vị không tồn tại**
- 8.a.1. Hệ thống kiểm tra phát hiện khoa được chọn không tồn tại
- 8.a.2. Hiển thị lỗi "Khoa/đơn vị không tồn tại trong hệ thống"
- 8.a.3. Quay lại bước 4 để chọn khoa khác

**Exception 6.a: Thiếu trường bắt buộc**
- 6.a.1. Hệ thống kiểm tra phát hiện thiếu trường bắt buộc (tên lớp học)
- 6.a.2. Hiển thị lỗi "Vui lòng điền đầy đủ thông tin bắt buộc"
- 6.a.3. Quay lại bước 3

**Exception 6.b: Năm học không hợp lệ**
- 6.b.1. Quản trị viên nhập năm học ngoài khoảng 2000-2100
- 6.b.2. Hiển thị lỗi "Năm học phải trong khoảng 2000-2100"
- 6.b.3. Quay lại bước 3

---

## Use Case 5: Thêm Nhiều Lớp Học Từ File Excel

### Use Case Name
Thêm nhiều lớp học từ file Excel

### Actors
Quản trị viên

### Description
Quản trị viên import hàng loạt lớp học từ file Excel theo template chuẩn. Hệ thống hỗ trợ hai phương thức: server-side processing (file nhỏ) và client-side batch processing (file lớn).

### Trigger
Quản trị viên cần thêm nhiều lớp học cùng lúc (ví dụ: đầu năm học, khởi tạo cơ cấu lớp mới).

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền import lớp học
- File Excel đã được chuẩn bị theo template chuẩn
- Hệ thống đã có danh sách khoa/đơn vị (nếu cần liên kết)

### Post-Conditions
- Danh sách lớp học được import thành công vào hệ thống
- Các lớp học được liên kết với khoa tương ứng (nếu có)
- Các lớp học trùng tên có thể được bỏ qua (tùy cấu hình)
- Hệ thống ghi log chi tiết quá trình import
- Báo cáo kết quả import được tạo (số lượng thành công, thất bại, bỏ qua)

### Normal Flow

#### Phương thức 1: Server-side Processing (File nhỏ - dưới 2,000 bản ghi)

1. Quản trị viên bấm nút "Import từ Excel"
2. Hệ thống hiển thị hướng dẫn và nút "Tải template"
3. Quản trị viên tải template Excel về
4. Quản trị viên điền dữ liệu vào template:
   - **Bắt buộc**: Tên lớp học (name)
   - **Tùy chọn**: Năm học (year), Mã khoa (departmentCode)
5. Quản trị viên upload file Excel
6. Hệ thống nhận file và tạo session import
7. Hệ thống parse file Excel và trả về sessionId
8. Quản trị viên bấm nút "Validate dữ liệu"
9. Hệ thống thực hiện validation:
   - Kiểm tra trường bắt buộc (tên lớp học)
   - Kiểm tra năm học trong khoảng 2000-2100
   - Kiểm tra trùng lặp tên lớp học trong file
   - Kiểm tra trùng lặp với dữ liệu đã có trong database
   - Kiểm tra mã khoa có tồn tại (nếu có)
10. Hệ thống hiển thị kết quả validation:
    - Số lượng bản ghi hợp lệ
    - Số lượng lỗi (errors)
    - Số lượng cảnh báo (warnings)
    - Danh sách chi tiết từng lỗi/cảnh báo
11. Nếu có lỗi nghiêm trọng, quản trị viên sửa file và upload lại
12. Nếu validation pass hoặc chỉ có warnings, quản trị viên bấm "Thực hiện import"
13. Hệ thống thực hiện import:
    - Tạo lớp học mới
    - Liên kết với khoa (nếu có mã khoa)
    - Xử lý conflict theo cấu hình (skip duplicates)
14. Hệ thống hiển thị tiến trình import real-time
15. Sau khi hoàn tất, hệ thống hiển thị báo cáo:
    - Tổng số bản ghi xử lý
    - Số lượng thành công
    - Số lượng thất bại
    - Số lượng bỏ qua (skipped)
    - Danh sách chi tiết các bản ghi thất bại
16. Quản trị viên xem báo cáo và tải về (nếu cần)

#### Phương thức 2: Client-side Batch Processing (File lớn)

1. Quản trị viên bấm nút "Import từ Excel"
2. Hệ thống hiển thị hướng dẫn và nút "Tải template"
3. Quản trị viên tải template Excel về
4. Quản trị viên điền dữ liệu vào template
5. Quản trị viên upload file Excel
6. Frontend parse file Excel trực tiếp trên client
7. Frontend thực hiện validation cơ bản trên client
8. Frontend hiển thị kết quả validation
9. Quản trị viên xem và xác nhận dữ liệu
10. Quản trị viên cấu hình tùy chọn import:
    - Skip duplicates (bỏ qua trùng lặp tên)
    - Validate departments (kiểm tra mã khoa)
11. Quản trị viên bấm "Bắt đầu import"
12. Frontend chia dữ liệu thành các batch (200 records/batch)
13. Frontend gửi từng batch lên backend tuần tự qua API `/classes/import/batch`
14. Backend xử lý từng batch:
    - Validation server-side
    - Resolve department từ departmentCode
    - Tạo lớp học hoặc skip nếu duplicate
    - Track session progress
15. Frontend hiển thị tiến trình import real-time:
    - Số batch đã xử lý / tổng batch
    - Số records thành công / tổng records
    - Tỷ lệ thành công (%)
    - Số lỗi hiện tại
16. Nếu có batch thất bại, frontend retry tự động (tối đa 3 lần)
17. Sau khi hoàn tất tất cả batches:
18. Frontend gọi API lấy tổng kết session
19. Hệ thống hiển thị báo cáo chi tiết
20. Quản trị viên xem báo cáo và tải về (nếu cần)

### Alternative Flow

**Flow 11.a: Có lỗi nhưng muốn bỏ qua**
- 11.a.1. Quản trị viên chọn tùy chọn "Bỏ qua bản ghi lỗi"
- 11.a.2. Hệ thống chỉ import các bản ghi hợp lệ
- 11.a.3. Các bản ghi lỗi được ghi vào báo cáo

**Flow 13.a: Bỏ qua lớp học trùng tên**
- 13.a.1. Quản trị viên bật tùy chọn "Skip duplicates"
- 13.a.2. Khi gặp lớp học có tên đã tồn tại, hệ thống bỏ qua
- 13.a.3. Ghi log các lớp học bị bỏ qua
- 13.a.4. Tiếp tục xử lý các lớp học khác

**Flow 13.b: Tự động tạo khoa nếu chưa tồn tại**
- 13.b.1. Phát hiện mã khoa chưa tồn tại trong hệ thống
- 13.b.2. Nếu có tùy chọn "Auto-create departments", tạo khoa mới
- 13.b.3. Liên kết lớp học với khoa vừa tạo
- 13.b.4. Ghi log khoa được tạo tự động

**Flow 16.a: Retry batch thất bại (Client-side)**
- 16.a.1. Batch import thất bại do lỗi network hoặc server
- 16.a.2. Frontend tự động retry batch đó (tối đa 3 lần)
- 16.a.3. Nếu vẫn thất bại sau 3 lần, ghi log và tiếp tục batch tiếp theo
- 16.a.4. Hiển thị cảnh báo về batch thất bại

### Exception

**Exception 6.a: File không đúng định dạng (Server-side)**
- 6.a.1. Hệ thống kiểm tra file không phải Excel (.xlsx)
- 6.a.2. Hiển thị lỗi "File không đúng định dạng. Vui lòng upload file .xlsx"
- 6.a.3. Quay lại bước 5

**Exception 6.b: File quá lớn (Server-side > 5MB)**
- 6.b.1. Hệ thống từ chối file quá 5MB
- 6.b.2. Hiển thị lỗi "File quá lớn. Vui lòng sử dụng chức năng Batch Import cho file lớn"
- 6.b.3. Gợi ý chuyển sang phương thức Client-side Batch Processing

**Exception 6.c: File không đúng template**
- 6.c.1. Hệ thống phát hiện thiếu cột bắt buộc hoặc sai tên cột
- 6.c.2. Hiển thị lỗi "File không đúng template. Vui lòng tải template mới nhất"
- 6.c.3. Quay lại bước 3

**Exception 9.a: Tất cả bản ghi đều lỗi**
- 9.a.1. Hệ thống kiểm tra 100% bản ghi có lỗi nghiêm trọng
- 9.a.2. Hiển thị lỗi "Tất cả bản ghi đều có lỗi. Vui lòng kiểm tra lại file"
- 9.a.3. Không cho phép thực hiện import
- 9.a.4. Quay lại bước 4

**Exception 14.a: Lỗi database khi import**
- 14.a.1. Hệ thống gặp lỗi khi lưu vào database
- 14.a.2. Ghi log lỗi chi tiết
- 14.a.3. Tiếp tục xử lý batch tiếp theo
- 14.a.4. Báo cáo batch lỗi trong kết quả cuối

**Exception 14.b: Timeout khi xử lý batch**
- 14.b.1. Request timeout sau 30 giây
- 14.b.2. Frontend retry request (tối đa 3 lần)
- 14.b.3. Nếu vẫn timeout, đánh dấu batch thất bại
- 14.b.4. Tiếp tục batch tiếp theo

**Exception 14.c: Session hết hạn**
- 14.c.1. Session import hết hạn (sau 30 phút không hoạt động)
- 14.c.2. Hệ thống tự động cleanup session data
- 14.c.3. Hiển thị lỗi "Session đã hết hạn. Vui lòng bắt đầu lại"
- 14.c.4. Quản trị viên phải upload file lại từ đầu

**Exception 9.b: Mã khoa không tồn tại**
- 9.b.1. Validation phát hiện mã khoa trong file không tồn tại
- 9.b.2. Nếu có tùy chọn "Validate departments = true", đánh dấu lỗi
- 9.b.3. Hiển thị danh sách mã khoa không hợp lệ
- 9.b.4. Quản trị viên có thể chọn:
   - Sửa file và upload lại
   - Tắt validation và import mà không liên kết khoa
   - Tạo khoa mới trước khi import

---

## Use Case 6: Chỉnh Sửa Thông Tin Lớp Học

### Use Case Name
Chỉnh sửa thông tin lớp học

### Actors
Quản trị viên

### Description
Quản trị viên cập nhật thông tin của một lớp học đã có trong hệ thống.

### Trigger
Quản trị viên cần cập nhật thông tin lớp học khi có thay đổi (đổi tên, cập nhật năm học, thay đổi khoa quản lý, thay đổi trạng thái).

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền chỉnh sửa thông tin lớp học
- Lớp học đã tồn tại trong hệ thống

### Post-Conditions
- Thông tin lớp học được cập nhật trong cơ sở dữ liệu
- Lịch sử thay đổi được ghi log
- Danh sách lớp học hiển thị thông tin mới

### Normal Flow
1. Quản trị viên tìm và chọn lớp học cần chỉnh sửa từ danh sách
2. Hệ thống hiển thị trang chi tiết lớp học với nút "Chỉnh sửa"
3. Hệ thống hiển thị thêm thông tin:
   - Danh sách sinh viên trong lớp
   - Số lượng sinh viên
4. Quản trị viên bấm nút "Chỉnh sửa"
5. Hệ thống hiển thị form chỉnh sửa với thông tin hiện tại được điền sẵn:
   - Tên lớp học
   - Năm học
   - Khoa/Đơn vị quản lý
   - Trạng thái hoạt động
6. Quản trị viên chỉnh sửa các trường thông tin cần thiết
7. Quản trị viên bấm nút "Lưu"
8. Hệ thống kiểm tra tính hợp lệ của dữ liệu
9. Hệ thống kiểm tra tên lớp học không bị trùng với lớp học khác
10. Nếu có thay đổi khoa, hệ thống kiểm tra khoa có tồn tại
11. Hệ thống cập nhật thông tin lớp học
12. Hệ thống hiển thị thông báo "Cập nhật thành công"
13. Hệ thống hiển thị thông tin lớp học đã được cập nhật

### Alternative Flow

**Flow 6.a: Thay đổi trạng thái hoạt động**
- 6.a.1. Quản trị viên thay đổi trạng thái từ "Đang hoạt động" sang "Không hoạt động" hoặc ngược lại
- 6.a.2. Hệ thống cập nhật trạng thái
- 6.a.3. Nếu chuyển sang "Không hoạt động", hệ thống cảnh báo về sinh viên trong lớp

**Flow 6.b: Thay đổi khoa quản lý**
- 6.b.1. Quản trị viên chọn khoa mới từ dropdown
- 6.b.2. Hệ thống cập nhật liên kết với khoa mới
- 6.b.3. Thông tin khoa mới hiển thị trong chi tiết lớp học

**Flow 6.c: Xóa liên kết với khoa**
- 6.c.1. Quản trị viên xóa khoa đã chọn (để trống)
- 6.c.2. Lớp học không còn liên kết với khoa cụ thể
- 6.c.3. Có thể gán lại khoa sau

**Flow 7.a: Hủy chỉnh sửa**
- 7.a.1. Quản trị viên bấm nút "Hủy"
- 7.a.2. Hệ thống hiển thị xác nhận "Các thay đổi sẽ không được lưu. Bạn có chắc?"
- 7.a.3. Quản trị viên xác nhận
- 7.a.4. Hệ thống quay về trang chi tiết lớp học (không lưu thay đổi)

### Exception

**Exception 9.a: Tên lớp học mới đã tồn tại**
- 9.a.1. Quản trị viên thay đổi tên thành tên đã được dùng bởi lớp học khác
- 9.a.2. Hệ thống hiển thị lỗi "Lớp học với tên này đã tồn tại trong hệ thống"
- 9.a.3. Quay lại bước 6

**Exception 10.a: Khoa/đơn vị không tồn tại**
- 10.a.1. Hệ thống kiểm tra phát hiện khoa được chọn không tồn tại
- 10.a.2. Hiển thị lỗi "Khoa/đơn vị không tồn tại trong hệ thống"
- 10.a.3. Quay lại bước 6

**Exception 8.a: Dữ liệu không hợp lệ**
- 8.a.1. Hệ thống phát hiện dữ liệu không hợp lệ (năm học ngoài khoảng 2000-2100)
- 8.a.2. Hiển thị lỗi chi tiết cho từng trường
- 8.a.3. Quay lại bước 6

**Exception 8.b: Thiếu trường bắt buộc**
- 8.b.1. Quản trị viên xóa nội dung của trường bắt buộc (tên lớp học)
- 8.b.2. Hệ thống hiển thị lỗi "Trường này là bắt buộc"
- 8.b.3. Quay lại bước 6

**Exception 2.a: Lớp học không tồn tại**
- 2.a.1. Lớp học đã bị xóa bởi người khác
- 2.a.2. Hệ thống hiển thị lỗi "Không tìm thấy lớp học"
- 2.a.3. Quay về danh sách lớp học

---

## Use Case 7: Xóa Lớp Học

### Use Case Name
Xóa lớp học

### Actors
Quản trị viên

### Description
Quản trị viên xóa một hoặc nhiều lớp học khỏi hệ thống. Hỗ trợ xóa từng lớp học hoặc xóa hàng loạt. Lớp học có sinh viên không thể xóa.

### Trigger
Quản trị viên cần xóa lớp học không còn sử dụng hoặc xóa nhầm.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền xóa lớp học
- Lớp học đã tồn tại trong hệ thống

### Post-Conditions
- Lớp học bị xóa khỏi cơ sở dữ liệu
- Lịch sử xóa được ghi log
- Lớp học không còn hiển thị trong danh sách

### Normal Flow

#### Xóa một lớp học:

1. Quản trị viên tìm và chọn lớp học cần xóa
2. Hệ thống hiển thị trang chi tiết lớp học
3. Hệ thống hiển thị số lượng sinh viên trong lớp
4. Quản trị viên bấm nút "Xóa"
5. Hệ thống kiểm tra lớp học có sinh viên không
6. Nếu không có sinh viên, hệ thống hiển thị hộp thoại xác nhận:
   - "Bạn có chắc muốn xóa lớp học [Tên]?"
   - "Hành động này không thể hoàn tác"
7. Quản trị viên xác nhận xóa
8. Hệ thống xóa lớp học khỏi cơ sở dữ liệu
9. Hệ thống hiển thị thông báo "Đã xóa lớp học thành công"
10. Hệ thống chuyển hướng về danh sách lớp học

#### Xóa nhiều lớp học:

1. Quản trị viên ở trang danh sách lớp học
2. Quản trị viên chọn nhiều lớp học bằng checkbox
3. Quản trị viên bấm nút "Xóa đã chọn"
4. Hệ thống hiển thị hộp thoại xác nhận:
   - "Bạn có chắc muốn xóa [n] lớp học?"
   - "Hành động này không thể hoàn tác"
   - Cảnh báo nếu có lớp học có sinh viên
5. Quản trị viên xác nhận xóa
6. Hệ thống kiểm tra từng lớp học có sinh viên không
7. Hệ thống xóa các lớp học không có sinh viên
8. Hệ thống hiển thị báo cáo:
   - Số lớp học đã xóa thành công
   - Danh sách lớp học không thể xóa (do có sinh viên) với lý do
9. Danh sách lớp học được làm mới

### Alternative Flow

**Flow 7.a: Hủy xóa**
- 7.a.1. Quản trị viên bấm nút "Hủy" trong hộp thoại xác nhận
- 7.a.2. Hệ thống đóng hộp thoại
- 7.a.3. Không có lớp học nào bị xóa
- 7.a.4. Quay lại trang hiện tại

**Flow 7.a: Xóa batch một phần thành công**
- 7.a.1. Một số lớp học xóa thành công, một số không thể xóa
- 7.a.2. Hệ thống xóa các lớp học không có sinh viên
- 7.a.3. Hiển thị báo cáo chi tiết:
   - "Đã xóa [m]/[n] lớp học"
   - Danh sách [n-m] lớp học không thể xóa với lý do (ví dụ: "Lớp 12A1 có 30 sinh viên")
- 7.a.4. Quản trị viên có thể xem chi tiết và xử lý các lớp học còn lại

### Exception

**Exception 5.a: Lớp học có sinh viên**
- 5.a.1. Hệ thống kiểm tra phát hiện lớp học có sinh viên
- 5.a.2. Hiển thị lỗi "Không thể xóa lớp học có sinh viên"
- 5.a.3. Hiển thị chi tiết:
   - Số lượng sinh viên: [số lượng]
   - Danh sách sinh viên (nếu ít)
- 5.a.4. Gợi ý: "Vui lòng chuyển sinh viên sang lớp khác hoặc xóa sinh viên trước khi xóa lớp"
- 5.a.5. Không cho phép xóa

**Exception 2.a: Lớp học không tồn tại**
- 2.a.1. Hệ thống kiểm tra lớp học đã bị xóa hoặc không tồn tại
- 2.a.2. Hiển thị lỗi "Lớp học không tồn tại hoặc đã bị xóa"
- 2.a.3. Quay lại danh sách lớp học

**Exception 6.a: Một số lớp học trong batch không tồn tại**
- 6.a.1. Hệ thống kiểm tra và phát hiện một số ID không hợp lệ
- 6.a.2. Hiển thị lỗi "Một số lớp học không tồn tại: [danh sách tên]"
- 6.a.3. Hỏi có muốn tiếp tục xóa các lớp học còn lại không
- 6.a.4. Nếu đồng ý, xóa các lớp học hợp lệ
- 6.a.5. Nếu từ chối, hủy toàn bộ thao tác

**Exception 8.a: Lỗi database khi xóa**
- 8.a.1. Hệ thống gặp lỗi database khi xóa
- 8.a.2. Hiển thị lỗi "Không thể xóa lớp học. Vui lòng thử lại"
- 8.a.3. Ghi log lỗi để admin kiểm tra
- 8.a.4. Không xóa lớp học

**Exception 6.b: Không đủ quyền xóa**
- 6.b.1. Quản trị viên không có quyền xóa lớp học cụ thể
- 6.b.2. Hiển thị lỗi "Bạn không có quyền xóa lớp học này"
- 6.b.3. Quay lại trang trước

---

## Phụ Lục

### Danh Sách API Endpoints

#### Quản lý lớp học cơ bản:
- `GET /classes` - Lấy danh sách lớp học (có phân trang, tìm kiếm, lọc)
- `GET /classes/:id` - Lấy thông tin chi tiết lớp học (bao gồm danh sách sinh viên)
- `POST /classes` - Tạo lớp học mới
- `PATCH /classes/:id` - Cập nhật thông tin lớp học
- `DELETE /classes/:id` - Xóa một lớp học
- `DELETE /classes/bulk` - Xóa nhiều lớp học

#### Import lớp học:
- `GET /classes/template` - Tải template Excel
- `POST /classes/import/upload` - Upload file Excel (Server-side)
- `GET /classes/import/:sessionId/validate` - Validate dữ liệu import
- `POST /classes/import/:sessionId/execute` - Thực hiện import
- `GET /classes/import/:sessionId/status` - Kiểm tra trạng thái session
- `POST /classes/import/batch` - Import batch từ frontend (Client-side)
- `GET /classes/import/batch/:sessionId/status` - Lấy trạng thái batch import

### Template Excel

Các cột trong template:

1. **name** (Bắt buộc) - Tên lớp học
2. **year** - Năm học (2000-2100)
3. **departmentCode** - Mã khoa/đơn vị quản lý

### Các Tính Năng Đặc Biệt

#### 1. Client-side Batch Processing
Frontend parse và chia file thành batches nhỏ, gửi tuần tự lên server để xử lý file lớn.

#### 2. Department Resolution
Tự động resolve khoa từ mã khoa (departmentCode) và liên kết với lớp học.

#### 3. Duplicate Detection
Kiểm tra trùng lặp tên lớp học trong file và trong database.

#### 4. Skip Duplicates
Có thể bỏ qua các lớp học có tên trùng lặp (configurable).

#### 5. Department Validation
Có thể bật/tắt kiểm tra mã khoa có tồn tại hay không.

#### 6. Student Protection
Không cho phép xóa lớp học có sinh viên, bảo vệ dữ liệu quan trọng.

#### 7. Session Management
Import session được quản lý với timeout 30 phút và auto cleanup.

### Cấu Hình Import

#### Batch Processing Options:
```typescript
{
  skipDuplicates: true/false,     // Bỏ qua trùng lặp (mặc định: false)
  validateDepartments: true/false // Kiểm tra mã khoa (mặc định: true)
}
```

#### Batch Info:
```typescript
{
  batchNumber: number,     // Số thứ tự batch (1, 2, 3, ...)
  totalBatches: number,    // Tổng số batch
  sessionId: string        // ID session import
}
```

### Quy Trình Validation

#### Client-side Validation:
- Kiểm tra trường bắt buộc (name)
- Kiểm tra năm học trong khoảng hợp lệ
- Kiểm tra định dạng cơ bản

#### Server-side Validation:
- Kiểm tra trường bắt buộc
- Kiểm tra năm học (2000-2100)
- Kiểm tra trùng lặp tên trong file
- Kiểm tra trùng lặp với database
- Kiểm tra mã khoa có tồn tại (nếu validateDepartments = true)
- Validate departmentId là UUID hợp lệ

### Performance Considerations

#### Small Files (< 500 records):
- Server-side processing
- Response time: < 1 giây

#### Medium Files (500 - 2,000 records):
- Server-side hoặc client-side
- Response time: 1-5 giây

#### Large Files (> 2,000 records):
- Client-side batch processing
- Batch size: 200 records/request
- Response time: 5-20 giây
- Progress tracking

### Error Handling Strategy

1. **Validation Errors**: Hiển thị chi tiết lỗi từng trường, cho phép sửa và thử lại
2. **Conflict Errors**: Cung cấp tùy chọn skip duplicates
3. **Reference Errors**: Cảnh báo mã khoa không tồn tại, cho phép tắt validation hoặc tạo khoa mới
4. **System Errors**: Ghi log, retry logic cho batch processing
5. **Database Errors**: Auto retry (max 3 times)

### Security Considerations

1. **Authentication**: Yêu cầu JWT token cho tất cả endpoints
2. **Authorization**: Kiểm tra quyền hạn theo vai trò
3. **Input Validation**: Sanitize input để tránh injection attacks
4. **File Upload Security**: Kiểm tra file type, size limit
5. **Rate Limiting**: Giới hạn số request import đồng thời
6. **Audit Logging**: Ghi log tất cả thao tác quan trọng
7. **Student Protection**: Không cho xóa lớp học có sinh viên

### Giới Hạn Hệ Thống

- **Max file size**: 5MB
- **Max records per file**: 10,000 (khuyến nghị)
- **Max concurrent imports**: 3 sessions
- **Session timeout**: 30 phút không hoạt động
- **Max batch size**: 200 records
- **Max retries per batch**: 3 lần

### Relationships

#### Lớp học liên kết với:
- **Department (Khoa)**: Many-to-One relationship
  - Một lớp học thuộc một khoa
  - Một khoa có nhiều lớp học
  - Optional relationship (có thể không thuộc khoa nào)

- **Students (Sinh viên)**: One-to-Many relationship
  - Một lớp học có nhiều sinh viên
  - Một sinh viên thuộc một lớp học
  - Không cho xóa lớp học khi còn sinh viên

---

## Sơ Đồ Use Case

```
                    ┌─────────────────────┐
                    │  Quản lý lớp học    │
                    └─────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        │                    │                    │
┌───────▼───────┐    ┌───────▼───────┐    ┌──────▼──────┐
│ Xem danh sách │    │ Thêm lớp học  │    │ Chỉnh sửa   │
│ lớp học       │    │               │    │ thông tin   │
└───────┬───────┘    └───────┬───────┘    │ lớp học     │
        │                    │             └─────────────┘
        │ <<extends>>        │ <<generalization>>
        │                    │
┌───────▼───────┐    ┌───────┴───────────────────┐
│ Tìm kiếm/lọc  │    │                           │
│ lớp học       │    │                           │
└───────────────┘    │                           │
                     │                           │
              ┌──────▼──────┐           ┌────────▼────────┐
              │ Thêm một    │           │ Thêm nhiều      │
              │ lớp học     │           │ lớp học từ      │
              │ bằng form   │           │ file Excel      │
              └─────────────┘           └─────────────────┘

                     │
                     │
              ┌──────▼──────┐
              │ Xóa lớp học │
              │             │
              └─────────────┘

Actor: Quản trị viên
```

---

**Tài liệu này mô tả đầy đủ các use case của module Quản lý Lớp Học trong hệ thống Đoàn Hội Portal.**

*Phiên bản: 1.0*  
*Ngày cập nhật: 18/12/2025*  
*Người tạo: GitHub Copilot*
