# Module Quản Lý Thành Viên - Mô Tả Use Cases

## Tổng Quan Module

Module Quản lý thành viên cho phép quản trị viên quản lý toàn bộ thông tin người dùng trong hệ thống Đoàn Hội Portal, bao gồm sinh viên, cán bộ Đoàn, và các thành viên khác. Module hỗ trợ quản lý thông tin cá nhân, phân quyền vai trò, và import hàng loạt từ file Excel.

---

## Use Case 1: Xem Danh Sách Thành Viên

### Use Case Name
Xem danh sách thành viên

### Actors
Quản trị viên

### Description
Quản trị viên xem danh sách tất cả thành viên trong hệ thống với khả năng phân trang, tìm kiếm và lọc theo các tiêu chí khác nhau.

### Trigger
Quản trị viên truy cập vào trang quản lý thành viên hoặc cần tra cứu thông tin thành viên.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền xem danh sách thành viên

### Post-Conditions
- Danh sách thành viên được hiển thị theo tiêu chí đã chọn
- Thông tin bao gồm: họ tên, email, mã số, loại thành viên, trạng thái, khoa/lớp

### Normal Flow
1. Quản trị viên truy cập vào trang "Quản lý thành viên"
2. Hệ thống hiển thị danh sách thành viên với phân trang mặc định (10 bản ghi/trang)
3. Hệ thống hiển thị các thông tin: họ tên, email, mã số, khoa quản lý, khoa đào tạo, lớp
4. Quản trị viên có thể chuyển trang để xem thêm thành viên
5. Quản trị viên có thể điều chỉnh số lượng bản ghi hiển thị trên mỗi trang

### Alternative Flow
**Flow 2.a: Danh sách rỗng**
- 2.a.1. Hệ thống hiển thị thông báo "Chưa có thành viên nào trong hệ thống"
- 2.a.2. Hệ thống hiển thị nút "Thêm thành viên mới"

### Exception
Không có exception đặc biệt.

---

## Use Case 2: Tìm Kiếm/Lọc Thành Viên

### Use Case Name
Tìm kiếm/lọc thành viên

### Actors
Quản trị viên

### Description
Quản trị viên tìm kiếm và lọc danh sách thành viên theo các tiêu chí như từ khóa, loại thành viên, trạng thái thành viên.

### Trigger
Quản trị viên muốn tìm kiếm thành viên cụ thể hoặc lọc danh sách theo tiêu chí.

### Pre-Conditions
- Quản trị viên đang ở trang danh sách thành viên
- Hệ thống đã có dữ liệu thành viên

### Post-Conditions
- Danh sách thành viên được lọc theo tiêu chí
- Kết quả tìm kiếm hiển thị với phân trang

### Normal Flow
1. Quản trị viên nhập từ khóa vào ô tìm kiếm (họ tên, email, hoặc mã số)
2. Hệ thống tự động tìm kiếm và hiển thị kết quả phù hợp
3. Quản trị viên có thể chọn thêm bộ lọc:
   - Loại thành viên (Sinh viên, Cán bộ, Giảng viên, etc.)
   - Trạng thái thành viên (Đang hoạt động, Đã nghỉ, Tốt nghiệp, etc.)
4. Hệ thống cập nhật danh sách theo bộ lọc đã chọn
5. Quản trị viên xem kết quả tìm kiếm/lọc

### Alternative Flow
**Flow 2.a: Không tìm thấy kết quả**
- 2.a.1. Hệ thống hiển thị thông báo "Không tìm thấy thành viên phù hợp"
- 2.a.2. Hệ thống hiển thị gợi ý: "Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc"

**Flow 3.a: Xóa bộ lọc**
- 3.a.1. Quản trị viên bấm nút "Xóa bộ lọc"
- 3.a.2. Hệ thống hiển thị lại toàn bộ danh sách thành viên

### Exception
Không có exception đặc biệt.

---

## Use Case 3: Thêm Thành Viên

### Use Case Name
Thêm thành viên

### Actors
Quản trị viên

### Description
Quản trị viên thêm một thành viên mới vào hệ thống thông qua form nhập liệu.

### Trigger
Quản trị viên muốn thêm một thành viên mới vào hệ thống.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền tạo thành viên mới

### Post-Conditions
- Thành viên mới được tạo và lưu vào cơ sở dữ liệu
- Mật khẩu mặc định được tạo tự động từ email hoặc mã số
- Thành viên được gán vào tổ chức (nếu có)
- Thành viên được gán vai trò (nếu có)
- Hệ thống gửi thông báo về mật khẩu mặc định cho thành viên

### Normal Flow
1. Quản trị viên bấm nút "Thêm thành viên mới"
2. Hệ thống hiển thị form nhập thông tin thành viên với các trường:
   - **Bắt buộc**: Họ và tên đệm, Tên, Email, Mã số sinh viên/cán bộ
   - **Tùy chọn**: Số điện thoại, Giới tính, Ngày sinh, CMND/CCCD, Địa chỉ, Khoa quản lý, Khoa đào tạo, Lớp, Năm nhập học, Loại thành viên, Trạng thái
3. Quản trị viên điền thông tin vào form
4. Quản trị viên chọn tổ chức (nếu có)
5. Quản trị viên chọn vai trò và tổ chức áp dụng vai trò (nếu có)
6. Quản trị viên bấm nút "Lưu"
7. Hệ thống kiểm tra tính hợp lệ của dữ liệu
8. Hệ thống tự động tạo mật khẩu mặc định từ email hoặc mã số
9. Hệ thống lưu thông tin thành viên
10. Hệ thống tự động thêm thành viên vào tổ chức và các tổ chức cha (nếu có)
11. Hệ thống gán vai trò cho thành viên (nếu có)
12. Hệ thống hiển thị thông báo "Tạo thành viên thành công"
13. Hệ thống chuyển hướng về trang chi tiết thành viên vừa tạo

### Alternative Flow
**Flow 5.a: Gán nhiều vai trò**
- 5.a.1. Quản trị viên bấm "Thêm vai trò"
- 5.a.2. Quản trị viên chọn vai trò và tổ chức áp dụng
- 5.a.3. Lặp lại cho mỗi vai trò cần gán
- 5.a.4. Hệ thống lưu tất cả các vai trò được gán

**Flow 8.a: Không cung cấp mật khẩu**
- 8.a.1. Hệ thống tự động tạo mật khẩu từ phần trước @ của email
- 8.a.2. Nếu không có email, sử dụng mã số sinh viên/cán bộ
- 8.a.3. Mật khẩu được mã hóa bằng bcrypt trước khi lưu

### Exception
**Exception 7.a: Email hoặc mã số đã tồn tại**
- 7.a.1. Hệ thống hiển thị lỗi "Email hoặc mã số đã tồn tại trong hệ thống"
- 7.a.2. Quay lại bước 3 để quản trị viên sửa thông tin

**Exception 7.b: Dữ liệu không hợp lệ**
- 7.b.1. Hệ thống hiển thị lỗi cụ thể cho từng trường không hợp lệ
- 7.b.2. Quay lại bước 3 để quản trị viên sửa thông tin

**Exception 7.c: Thiếu trường bắt buộc**
- 7.c.1. Hệ thống hiển thị lỗi "Vui lòng điền đầy đủ thông tin bắt buộc"
- 7.c.2. Quay lại bước 3

---

## Use Case 4: Thêm Một Thành Viên Bằng Form

### Use Case Name
Thêm một thành viên bằng form

### Actors
Quản trị viên

### Description
Use case chuyên biệt của "Thêm thành viên" - tập trung vào việc thêm từng thành viên một thông qua giao diện form.

### Trigger
Quản trị viên cần thêm một thành viên cụ thể với thông tin chi tiết.

### Pre-Conditions
- Giống Use Case 3

### Post-Conditions
- Giống Use Case 3

### Normal Flow
- Giống Use Case 3

### Alternative Flow
- Giống Use Case 3

### Exception
- Giống Use Case 3

---

## Use Case 5: Thêm Nhiều Thành Viên Từ File Excel

### Use Case Name
Thêm nhiều thành viên từ file Excel

### Actors
Quản trị viên

### Description
Quản trị viên import hàng loạt thành viên từ file Excel theo template chuẩn 18 cột. Hệ thống hỗ trợ hai phương thức: server-side processing (file nhỏ) và client-side batch processing (file lớn đến 27,000 bản ghi).

### Trigger
Quản trị viên cần thêm nhiều thành viên cùng lúc (ví dụ: đầu năm học, import danh sách sinh viên mới).

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền import thành viên
- File Excel đã được chuẩn bị theo template chuẩn

### Post-Conditions
- Danh sách thành viên được import thành công vào hệ thống
- Các tổ chức (khoa, lớp) được tự động tạo nếu chưa tồn tại
- Mật khẩu mặc định được tạo cho mỗi thành viên
- Hệ thống ghi log chi tiết quá trình import
- Báo cáo kết quả import được tạo (số lượng thành công, thất bại, cảnh báo)

### Normal Flow

#### Phương thức 1: Server-side Processing (File nhỏ - dưới 5,000 bản ghi)

1. Quản trị viên bấm nút "Import từ Excel"
2. Hệ thống hiển thị hướng dẫn và nút "Tải template"
3. Quản trị viên tải template Excel về (18 cột)
4. Quản trị viên điền dữ liệu vào template:
   - **Bắt buộc**: Mã số (code), Họ (familyName), Tên (givenName)
   - **Tùy chọn**: Email, Số điện thoại, Giới tính, Ngày sinh, CMND/CCCD, Mã khoa, Mã lớp, Năm nhập học, và các trường khác
5. Quản trị viên upload file Excel
6. Hệ thống nhận file và tạo session import
7. Hệ thống parse file Excel và trả về sessionId
8. Quản trị viên bấm nút "Validate dữ liệu"
9. Hệ thống thực hiện validation:
   - Kiểm tra trường bắt buộc
   - Kiểm tra định dạng email, số điện thoại
   - Kiểm tra mã khoa, mã lớp có tồn tại
   - Kiểm tra trùng lặp mã số, email
10. Hệ thống hiển thị kết quả validation:
    - Số lượng bản ghi hợp lệ
    - Số lượng lỗi (errors)
    - Số lượng cảnh báo (warnings)
    - Danh sách chi tiết từng lỗi/cảnh báo
11. Nếu có lỗi nghiêm trọng, quản trị viên sửa file và upload lại
12. Nếu validation pass hoặc chỉ có warnings, quản trị viên bấm "Thực hiện import"
13. Hệ thống thực hiện import theo batch (50 records/batch):
    - Tạo thành viên mới
    - Hash mật khẩu mặc định
    - Tự động tạo tổ chức nếu chưa tồn tại
    - Gán thành viên vào tổ chức và tổ chức cha
14. Hệ thống hiển thị tiến trình import real-time
15. Sau khi hoàn tất, hệ thống hiển thị báo cáo:
    - Tổng số bản ghi xử lý
    - Số lượng thành công
    - Số lượng thất bại
    - Danh sách chi tiết các bản ghi thất bại
16. Quản trị viên xem báo cáo và tải về (nếu cần)

#### Phương thức 2: Client-side Batch Processing (File lớn - đến 27,000 bản ghi)

1. Quản trị viên bấm nút "Import từ Excel"
2. Hệ thống hiển thị hướng dẫn và nút "Tải template"
3. Quản trị viên tải template Excel về (18 cột)
4. Quản trị viên điền dữ liệu vào template
5. Quản trị viên upload file Excel
6. Frontend parse file Excel trực tiếp trên client
7. Frontend thực hiện validation trên client:
   - Kiểm tra trường bắt buộc
   - Kiểm tra định dạng cơ bản
8. Frontend hiển thị kết quả validation với phân trang
9. Quản trị viên xem và xác nhận dữ liệu
10. Quản trị viên bấm "Bắt đầu import"
11. Frontend chia dữ liệu thành các batch (200 records/batch)
12. Frontend gửi từng batch lên backend tuần tự qua API `/users/import/batch`
13. Backend xử lý từng batch:
    - Validation server-side
    - Process trong sub-batches 50 records
    - Transaction management
    - Track session progress
14. Frontend hiển thị tiến trình import real-time:
    - Số batch đã xử lý / tổng batch
    - Số records thành công / tổng records
    - Thời gian ước tính còn lại
15. Nếu có batch thất bại, frontend retry tự động (tối đa 3 lần)
16. Sau khi hoàn tất tất cả batches:
17. Frontend gọi API lấy tổng kết session
18. Hệ thống hiển thị báo cáo chi tiết
19. Quản trị viên xem báo cáo và tải về (nếu cần)

### Alternative Flow

**Flow 11.a: Có lỗi nhưng muốn bỏ qua (Server-side)**
- 11.a.1. Quản trị viên chọn tùy chọn "Bỏ qua bản ghi lỗi"
- 11.a.2. Hệ thống chỉ import các bản ghi hợp lệ
- 11.a.3. Các bản ghi lỗi được ghi vào báo cáo

**Flow 11.b: Cập nhật thành viên đã tồn tại**
- 11.b.1. Quản trị viên chọn tùy chọn "Cập nhật nếu đã tồn tại"
- 11.b.2. Hệ thống kiểm tra mã số hoặc email
- 11.b.3. Nếu đã tồn tại, cập nhật thông tin thay vì tạo mới
- 11.b.4. Ghi log các bản ghi được cập nhật

**Flow 13.a: Tạo tổ chức tự động**
- 13.a.1. Hệ thống phát hiện mã khoa/lớp chưa tồn tại
- 13.a.2. Hệ thống tự động tạo tổ chức mới từ thông tin trong file
- 13.a.3. Gán thành viên vào tổ chức vừa tạo
- 13.a.4. Ghi log tổ chức được tạo tự động

**Flow 15.a: Retry batch thất bại (Client-side)**
- 15.a.1. Batch import thất bại do lỗi network hoặc server
- 15.a.2. Frontend tự động retry batch đó (tối đa 3 lần)
- 15.a.3. Nếu vẫn thất bại sau 3 lần, ghi log và tiếp tục batch tiếp theo
- 15.a.4. Hiển thị cảnh báo về batch thất bại

**Flow 16.a: Tạm dừng import**
- 16.a.1. Quản trị viên bấm nút "Tạm dừng"
- 16.a.2. Hệ thống dừng xử lý batch tiếp theo
- 16.a.3. Session được lưu lại để tiếp tục sau
- 16.a.4. Quản trị viên có thể tiếp tục import sau

### Exception

**Exception 6.a: File không đúng định dạng (Server-side)**
- 6.a.1. Hệ thống kiểm tra file không phải Excel (.xlsx)
- 6.a.2. Hiển thị lỗi "File không đúng định dạng. Vui lòng upload file .xlsx"
- 6.a.3. Quay lại bước 5

**Exception 6.b: File quá lớn (Server-side > 10MB)**
- 6.b.1. Hệ thống từ chối file quá 10MB
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

**Exception 13.a: Lỗi database khi import**
- 13.a.1. Hệ thống gặp lỗi khi lưu vào database
- 13.a.2. Transaction rollback cho batch đó
- 13.a.3. Ghi log lỗi chi tiết
- 13.a.4. Tiếp tục xử lý batch tiếp theo
- 13.a.5. Báo cáo batch lỗi trong kết quả cuối

**Exception 13.b: Timeout khi xử lý batch lớn**
- 13.b.1. Request timeout sau 30 giây
- 13.b.2. Frontend retry request (tối đa 3 lần)
- 13.b.3. Nếu vẫn timeout, đánh dấu batch thất bại
- 13.b.4. Gợi ý giảm batch size hoặc thử lại sau

**Exception 13.c: Session hết hạn**
- 13.c.1. Session import hết hạn (sau 30 phút không hoạt động)
- 13.c.2. Hệ thống tự động cleanup session data
- 13.c.3. Hiển thị lỗi "Session đã hết hạn. Vui lòng bắt đầu lại"
- 13.c.4. Quản trị viên phải upload file lại từ đầu

---

## Use Case 6: Gán Vai Trò Cho Thành Viên

### Use Case Name
Gán vai trò cho thành viên

### Actors
Quản trị viên

### Description
Quản trị viên gán một hoặc nhiều vai trò cho thành viên, mỗi vai trò có thể được gán trong phạm vi tổ chức cụ thể hoặc toàn hệ thống.

### Trigger
Quản trị viên cần phân quyền cho thành viên để họ thực hiện các chức năng trong hệ thống.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền gán vai trò
- Thành viên đã tồn tại trong hệ thống
- Hệ thống đã có các vai trò được định nghĩa

### Post-Conditions
- Thành viên được gán vai trò mới
- Quyền hạn của thành viên được cập nhật theo vai trò
- Lịch sử gán vai trò được ghi log
- Thành viên có thể thực hiện các chức năng theo quyền mới

### Normal Flow
1. Quản trị viên truy cập trang chi tiết thành viên
2. Hệ thống hiển thị thông tin thành viên và danh sách vai trò hiện tại
3. Quản trị viên bấm nút "Gán vai trò"
4. Hệ thống hiển thị form gán vai trò với:
   - Dropdown chọn vai trò (Admin, Quản lý khoa, Cán bộ Đoàn, etc.)
   - Dropdown chọn tổ chức áp dụng (tùy chọn)
5. Quản trị viên chọn vai trò từ danh sách
6. Quản trị viên chọn tổ chức áp dụng vai trò (nếu vai trò yêu cầu phạm vi)
7. Quản trị viên bấm nút "Lưu"
8. Hệ thống kiểm tra vai trò-tổ chức không bị trùng lặp
9. Hệ thống lưu thông tin vai trò mới cho thành viên
10. Hệ thống cập nhật quyền hạn của thành viên
11. Hệ thống hiển thị thông báo "Gán vai trò thành công"
12. Danh sách vai trò của thành viên được cập nhật

### Alternative Flow

**Flow 7.a: Gán nhiều vai trò cùng lúc**
- 7.a.1. Sau khi lưu vai trò đầu tiên, quản trị viên bấm "Thêm vai trò khác"
- 7.a.2. Lặp lại bước 5-7 cho mỗi vai trò
- 7.a.3. Hệ thống lưu tất cả các vai trò

**Flow 7.b: Xóa vai trò hiện tại**
- 7.b.1. Quản trị viên bấm nút "Xóa" ở vai trò cần xóa
- 7.b.2. Hệ thống hiển thị xác nhận "Bạn có chắc muốn xóa vai trò này?"
- 7.b.3. Quản trị viên xác nhận
- 7.b.4. Hệ thống xóa vai trò và cập nhật quyền hạn

**Flow 7.c: Cập nhật toàn bộ vai trò**
- 7.c.1. Quản trị viên vào chế độ "Chỉnh sửa vai trò"
- 7.c.2. Quản trị viên thêm/xóa các vai trò theo nhu cầu
- 7.c.3. Quản trị viên bấm "Lưu tất cả"
- 7.c.4. Hệ thống xóa toàn bộ vai trò cũ
- 7.c.5. Hệ thống gán lại các vai trò mới

**Flow 6.a: Không chọn tổ chức (vai trò toàn hệ thống)**
- 6.a.1. Quản trị viên bỏ trống trường tổ chức
- 6.a.2. Vai trò được gán ở phạm vi toàn hệ thống
- 6.a.3. Thành viên có quyền hạn trong tất cả tổ chức

### Exception

**Exception 8.a: Vai trò-tổ chức đã tồn tại**
- 8.a.1. Hệ thống kiểm tra phát hiện vai trò đã được gán cho thành viên trong tổ chức này
- 8.a.2. Hiển thị lỗi "Thành viên đã có vai trò này trong tổ chức đã chọn"
- 8.a.3. Quay lại bước 5

**Exception 8.b: Vai trò yêu cầu tổ chức nhưng không được chọn**
- 8.b.1. Vai trò như "Quản lý khoa" yêu cầu phải chọn tổ chức
- 8.b.2. Hệ thống hiển thị lỗi "Vai trò này yêu cầu chọn tổ chức áp dụng"
- 8.b.3. Quay lại bước 6

**Exception 8.c: Không đủ quyền gán vai trò**
- 8.c.1. Quản trị viên không có quyền gán vai trò cấp cao (ví dụ: Admin)
- 8.c.2. Hệ thống hiển thị lỗi "Bạn không có quyền gán vai trò này"
- 8.c.3. Quay lại bước 5

---

## Use Case 7: Chỉnh Sửa Thông Tin Thành Viên

### Use Case Name
Chỉnh sửa thông tin thành viên

### Actors
Quản trị viên

### Description
Quản trị viên cập nhật thông tin cá nhân, thông tin học tập, vai trò và tổ chức của thành viên.

### Trigger
Quản trị viên cần cập nhật thông tin thành viên khi có thay đổi (đổi lớp, đổi khoa, cập nhật thông tin cá nhân, etc.).

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền chỉnh sửa thông tin thành viên
- Thành viên đã tồn tại trong hệ thống

### Post-Conditions
- Thông tin thành viên được cập nhật trong cơ sở dữ liệu
- Nếu cập nhật vai trò, quyền hạn của thành viên được cập nhật
- Nếu cập nhật mật khẩu, mật khẩu mới được mã hóa
- Lịch sử thay đổi được ghi log

### Normal Flow
1. Quản trị viên tìm và chọn thành viên cần chỉnh sửa từ danh sách
2. Hệ thống hiển thị trang chi tiết thành viên với nút "Chỉnh sửa"
3. Quản trị viên bấm nút "Chỉnh sửa"
4. Hệ thống hiển thị form chỉnh sửa với thông tin hiện tại được điền sẵn:
   - Thông tin cá nhân: Họ tên, Email, Số điện thoại, Giới tính, Ngày sinh, CMND/CCCD, Địa chỉ
   - Thông tin học tập: Khoa quản lý, Khoa đào tạo, Lớp, Năm nhập học
   - Loại thành viên và trạng thái
   - Danh sách vai trò hiện tại
5. Quản trị viên chỉnh sửa các trường thông tin cần thiết
6. Quản trị viên có thể thêm/xóa/sửa vai trò
7. Quản trị viên bấm nút "Lưu"
8. Hệ thống kiểm tra tính hợp lệ của dữ liệu
9. Hệ thống cập nhật thông tin thành viên
10. Nếu có thay đổi vai trò, hệ thống cập nhật quyền hạn
11. Nếu có thay đổi tổ chức, hệ thống cập nhật membership
12. Hệ thống hiển thị thông báo "Cập nhật thành công"
13. Hệ thống hiển thị thông tin thành viên đã được cập nhật

### Alternative Flow

**Flow 5.a: Đổi mật khẩu thành viên**
- 5.a.1. Quản trị viên bấm nút "Đặt lại mật khẩu"
- 5.a.2. Hệ thống hiển thị form nhập mật khẩu mới
- 5.a.3. Quản trị viên nhập mật khẩu mới hoặc để trống để tạo mật khẩu mặc định
- 5.a.4. Quản trị viên bấm "Xác nhận"
- 5.a.5. Hệ thống mã hóa và lưu mật khẩu mới
- 5.a.6. Hệ thống gửi thông báo mật khẩu mới cho thành viên

**Flow 5.b: Thay đổi trạng thái thành viên**
- 5.b.1. Quản trị viên chọn trạng thái mới (Đang hoạt động, Đã nghỉ, Tốt nghiệp, Bảo lưu, etc.)
- 5.b.2. Hệ thống cập nhật trạng thái
- 5.b.3. Nếu chuyển sang "Đã nghỉ" hoặc "Tốt nghiệp", hệ thống có thể vô hiệu hóa tài khoản

**Flow 5.c: Cập nhật nhiều thành viên cùng lúc**
- 5.c.1. Từ trang danh sách, quản trị viên chọn nhiều thành viên (checkbox)
- 5.c.2. Quản trị viên bấm "Chỉnh sửa hàng loạt"
- 5.c.3. Hệ thống hiển thị form chỉnh sửa cho các trường chung (trạng thái, vai trò, etc.)
- 5.c.4. Quản trị viên cập nhật thông tin
- 5.c.5. Hệ thống áp dụng thay đổi cho tất cả thành viên đã chọn

**Flow 7.a: Hủy chỉnh sửa**
- 7.a.1. Quản trị viên bấm nút "Hủy"
- 7.a.2. Hệ thống hiển thị xác nhận "Các thay đổi sẽ không được lưu. Bạn có chắc?"
- 7.a.3. Quản trị viên xác nhận
- 7.a.4. Hệ thống quay về trang chi tiết thành viên (không lưu thay đổi)

### Exception

**Exception 8.a: Email mới đã tồn tại**
- 8.a.1. Quản trị viên thay đổi email thành email đã được dùng bởi thành viên khác
- 8.a.2. Hệ thống hiển thị lỗi "Email đã tồn tại trong hệ thống"
- 8.a.3. Quay lại bước 5

**Exception 8.b: Mã số mới đã tồn tại**
- 8.b.1. Quản trị viên thay đổi mã số thành mã đã được dùng bởi thành viên khác
- 8.b.2. Hệ thống hiển thị lỗi "Mã số đã tồn tại trong hệ thống"
- 8.b.3. Quay lại bước 5

**Exception 8.c: Dữ liệu không hợp lệ**
- 8.c.1. Hệ thống phát hiện dữ liệu không hợp lệ (email sai định dạng, số điện thoại sai, etc.)
- 8.c.2. Hiển thị lỗi chi tiết cho từng trường
- 8.c.3. Quay lại bước 5

**Exception 8.d: Thiếu trường bắt buộc**
- 8.d.1. Quản trị viên xóa nội dung của trường bắt buộc
- 8.d.2. Hệ thống hiển thị lỗi "Trường này là bắt buộc"
- 8.d.3. Quay lại bước 5

**Exception 10.a: Lỗi cập nhật vai trò**
- 10.a.1. Hệ thống gặp lỗi khi cập nhật vai trò
- 10.a.2. Transaction rollback, không lưu bất kỳ thay đổi nào
- 10.a.3. Hiển thị lỗi "Không thể cập nhật vai trò. Vui lòng thử lại"
- 10.a.4. Quay lại bước 5

---

## Use Case 8: Xóa Thành Viên

### Use Case Name
Xóa thành viên

### Actors
Quản trị viên

### Description
Quản trị viên xóa một hoặc nhiều thành viên khỏi hệ thống. Hỗ trợ xóa từng thành viên hoặc xóa hàng loạt.

### Trigger
Quản trị viên cần xóa thành viên không còn hoạt động hoặc xóa nhầm.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền xóa thành viên
- Thành viên đã tồn tại trong hệ thống

### Post-Conditions
- Thành viên bị xóa khỏi cơ sở dữ liệu
- Tất cả vai trò của thành viên bị xóa
- Tất cả membership trong tổ chức bị xóa
- Dữ liệu liên quan (submissions, payment) vẫn được giữ lại (soft delete hoặc orphan records)
- Lịch sử xóa được ghi log

### Normal Flow

#### Xóa một thành viên:

1. Quản trị viên tìm và chọn thành viên cần xóa
2. Hệ thống hiển thị trang chi tiết thành viên
3. Quản trị viên bấm nút "Xóa"
4. Hệ thống hiển thị hộp thoại xác nhận:
   - "Bạn có chắc muốn xóa thành viên [Tên]?"
   - "Hành động này không thể hoàn tác"
   - Cảnh báo về dữ liệu liên quan (nếu có)
5. Quản trị viên xác nhận xóa
6. Hệ thống kiểm tra ràng buộc dữ liệu
7. Hệ thống xóa tất cả vai trò của thành viên
8. Hệ thống xóa tất cả membership trong tổ chức
9. Hệ thống xóa thành viên khỏi cơ sở dữ liệu
10. Hệ thống hiển thị thông báo "Đã xóa thành viên thành công"
11. Hệ thống chuyển hướng về danh sách thành viên

#### Xóa nhiều thành viên:

1. Quản trị viên ở trang danh sách thành viên
2. Quản trị viên chọn nhiều thành viên bằng checkbox
3. Quản trị viên bấm nút "Xóa đã chọn"
4. Hệ thống hiển thị hộp thoại xác nhận:
   - "Bạn có chắc muốn xóa [n] thành viên?"
   - "Hành động này không thể hoàn tác"
   - Danh sách thành viên sẽ bị xóa
5. Quản trị viên xác nhận xóa
6. Hệ thống kiểm tra tất cả thành viên có tồn tại
7. Hệ thống xóa từng thành viên theo batch
8. Hệ thống hiển thị thông báo "Đã xóa thành công [n] thành viên"
9. Danh sách thành viên được làm mới

### Alternative Flow

**Flow 5.a: Hủy xóa**
- 5.a.1. Quản trị viên bấm nút "Hủy" trong hộp thoại xác nhận
- 5.a.2. Hệ thống đóng hộp thoại
- 5.a.3. Không có thành viên nào bị xóa
- 5.a.4. Quay lại trang hiện tại

**Flow 9.a: Soft delete thay vì hard delete**
- 9.a.1. Hệ thống không xóa vật lý khỏi database
- 9.a.2. Hệ thống đánh dấu trường `deletedAt` với timestamp
- 9.a.3. Hệ thống đánh dấu trường `isActive = false`
- 9.a.4. Thành viên không hiển thị trong danh sách nhưng dữ liệu vẫn tồn tại
- 9.a.5. Cho phép khôi phục sau nếu cần

**Flow 7.a: Xóa batch có lỗi một phần**
- 7.a.1. Một số thành viên xóa thành công, một số thất bại
- 7.a.2. Hệ thống tiếp tục xóa các thành viên còn lại
- 7.a.3. Hiển thị báo cáo: "Đã xóa [m]/[n] thành viên"
- 7.a.4. Hiển thị danh sách thành viên không thể xóa và lý do

### Exception

**Exception 6.a: Thành viên không tồn tại**
- 6.a.1. Hệ thống kiểm tra thành viên đã bị xóa hoặc không tồn tại
- 6.a.2. Hiển thị lỗi "Thành viên không tồn tại hoặc đã bị xóa"
- 6.a.3. Quay lại danh sách thành viên

**Exception 6.b: Không thể xóa do ràng buộc dữ liệu**
- 6.b.1. Thành viên có dữ liệu quan trọng liên quan không thể xóa (ví dụ: đang quản lý tổ chức)
- 6.b.2. Hiển thị lỗi "Không thể xóa thành viên này"
- 6.b.3. Hiển thị lý do cụ thể và hướng dẫn xử lý
- 6.b.4. Gợi ý: "Vui lòng chuyển quyền quản lý trước khi xóa"

**Exception 6.c: Không đủ quyền xóa**
- 6.c.1. Quản trị viên không có quyền xóa thành viên cấp cao (ví dụ: Admin)
- 6.c.2. Hiển thị lỗi "Bạn không có quyền xóa thành viên này"
- 6.c.3. Quay lại trang trước

**Exception 7.a: Một số thành viên trong batch không tồn tại**
- 7.a.1. Hệ thống kiểm tra và phát hiện một số ID không hợp lệ
- 7.a.2. Hiển thị lỗi "Một số thành viên không tồn tại: [danh sách IDs]"
- 7.a.3. Transaction rollback, không xóa thành viên nào
- 7.a.4. Quay lại bước 2

**Exception 9.a: Lỗi database khi xóa**
- 9.a.1. Hệ thống gặp lỗi database khi xóa
- 9.a.2. Transaction rollback
- 9.a.3. Hiển thị lỗi "Không thể xóa thành viên. Vui lòng thử lại"
- 9.a.4. Ghi log lỗi để admin kiểm tra

---

## Phụ Lục

### Danh Sách API Endpoints

#### Quản lý thành viên cơ bản:
- `GET /users` - Lấy danh sách thành viên (có phân trang, tìm kiếm, lọc)
- `GET /users/:id` - Lấy thông tin chi tiết thành viên
- `GET /users/find-by-code/:code` - Tìm thành viên theo mã số chính xác
- `POST /users` - Tạo thành viên mới
- `PATCH /users/:id` - Cập nhật thông tin thành viên
- `DELETE /users/:id` - Xóa một thành viên
- `DELETE /users/bulk-delete` - Xóa nhiều thành viên

#### Import thành viên:
- `GET /users/template` - Tải template Excel (18 cột)
- `POST /users/import/upload` - Upload file Excel (Server-side)
- `GET /users/import/:sessionId/validate` - Validate dữ liệu import
- `POST /users/import/:sessionId/execute` - Thực hiện import
- `GET /users/import/:sessionId/status` - Kiểm tra trạng thái session
- `POST /users/validate-batch` - Validate dữ liệu đã parse từ frontend
- `POST /users/import/batch` - Import batch từ frontend (Client-side)
- `GET /users/import/batch/:sessionId/summary` - Lấy tổng kết batch import
- `DELETE /users/import/batch/:sessionId` - Xóa session batch import

#### Vai trò và quyền hạn:
- `GET /users/available-roles` - Lấy danh sách vai trò có thể gán
- `GET /users/password-status` - Kiểm tra users có mật khẩu mặc định

### Template Excel 18 Cột

1. **code** (Bắt buộc) - Mã số sinh viên/cán bộ
2. **familyName** (Bắt buộc) - Họ và tên đệm
3. **givenName** (Bắt buộc) - Tên
4. **email** - Email
5. **phone** - Số điện thoại
6. **gender** - Giới tính (NAM/NU)
7. **dateOfBirth** - Ngày sinh (YYYY-MM-DD)
8. **nationalId** - CMND/CCCD
9. **address** - Địa chỉ
10. **departmentCode** - Mã khoa
11. **classCode** - Mã lớp
12. **admissionYear** - Năm nhập học
13. **userType** - Loại thành viên (STUDENT/STAFF/TEACHER)
14. **membershipStatus** - Trạng thái (ACTIVE/INACTIVE/GRADUATED/ON_LEAVE)
15. **unionJoinDate** - Ngày vào Đoàn
16. **unionLocation** - Nơi vào Đoàn
17. **roleCode** - Mã vai trò (optional)
18. **organizationCode** - Mã tổ chức áp dụng vai trò (optional)

### Các Tính Năng Đặc Biệt

#### 1. Auto Organization Creation
Khi import thành viên, nếu mã khoa/lớp chưa tồn tại, hệ thống tự động tạo tổ chức mới.

#### 2. Parent Organization Assignment
Khi gán thành viên vào tổ chức, hệ thống tự động gán vào các tổ chức cha (hierarchy).

#### 3. Multi-Role Assignment
Một thành viên có thể có nhiều vai trò trong nhiều tổ chức khác nhau.

#### 4. Password Generation
Mật khẩu mặc định tự động tạo từ email (phần trước @) hoặc mã số sinh viên.

#### 5. Session Management
Import session được quản lý với timeout 30 phút và auto cleanup.

#### 6. Transaction Safety
Tất cả thao tác import/update đều sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu.

#### 7. Batch Processing
Hỗ trợ xử lý file lớn với batch size linh hoạt (50-200 records/batch).

### Các Loại Thành Viên (UserType)

- **STUDENT** - Sinh viên
- **STAFF** - Cán bộ Đoàn
- **TEACHER** - Giảng viên
- **ALUMNI** - Cựu sinh viên
- **EXTERNAL** - Người ngoài

### Trạng Thái Thành Viên (MembershipStatus)

- **ACTIVE** - Đang hoạt động
- **INACTIVE** - Không hoạt động
- **GRADUATED** - Đã tốt nghiệp
- **ON_LEAVE** - Đang bảo lưu
- **EXPELLED** - Đã thôi học

### Quy Trình Validation

#### Client-side Validation:
- Kiểm tra trường bắt buộc
- Kiểm tra định dạng email, phone
- Kiểm tra định dạng ngày tháng
- Kiểm tra độ dài chuỗi

#### Server-side Validation:
- Kiểm tra trùng lặp email/mã số
- Kiểm tra tồn tại của tham chiếu (department, class, role)
- Kiểm tra business rules
- Kiểm tra quyền hạn

### Performance Considerations

#### Small Files (< 5,000 records):
- Server-side processing
- Upload trực tiếp file Excel
- Response time: 2-5 giây/1000 records

#### Large Files (5,000 - 27,000 records):
- Client-side batch processing
- Parse trên frontend
- Batch size: 200 records/request
- Sub-batch processing: 50 records/transaction
- Response time: ~20-30 giây/10,000 records

### Error Handling Strategy

1. **Validation Errors**: Hiển thị chi tiết lỗi từng trường, cho phép sửa và thử lại
2. **Conflict Errors**: Cung cấp tùy chọn skip hoặc update existing
3. **System Errors**: Transaction rollback, ghi log, retry logic
4. **Network Errors**: Auto retry (max 3 times), session recovery
5. **Timeout Errors**: Batch size adjustment, session continuation

### Security Considerations

1. **Authentication**: Yêu cầu JWT token cho tất cả endpoints
2. **Authorization**: Kiểm tra quyền hạn theo vai trò
3. **Password Security**: Bcrypt hashing với salt rounds = 10
4. **Input Validation**: Sanitize input để tránh injection attacks
5. **File Upload Security**: Kiểm tra file type, size limit, scan virus
6. **Rate Limiting**: Giới hạn số request import đồng thời
7. **Audit Logging**: Ghi log tất cả thao tác quan trọng

---

## Sơ Đồ Use Case

```
                    ┌─────────────────────┐
                    │  Quản lý thành viên │
                    └─────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        │                    │                    │
┌───────▼───────┐    ┌───────▼───────┐    ┌──────▼──────┐
│ Xem danh sách │    │ Thêm thành    │    │ Gán vai trò │
│ thành viên    │    │ viên          │    │ cho thành   │
└───────┬───────┘    └───────┬───────┘    │ viên        │
        │                    │             └─────────────┘
        │ <<extends>>        │ <<generalization>>
        │                    │
┌───────▼───────┐    ┌───────┴───────────────────┐
│ Tìm kiếm/lọc  │    │                           │
│ thành viên    │    │                           │
└───────────────┘    │                           │
                     │                           │
              ┌──────▼──────┐           ┌────────▼────────┐
              │ Thêm một    │           │ Thêm nhiều      │
              │ thành viên  │           │ thành viên từ   │
              │ bằng form   │           │ file Excel      │
              └─────────────┘           └─────────────────┘

        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐    ┌───────▼───────┐    ┌──────▼──────┐
│ Chỉnh sửa     │    │ Xóa thành     │    │             │
│ thông tin     │    │ viên          │    │             │
│ thành viên    │    │               │    │             │
└───────────────┘    └───────────────┘    └─────────────┘

Actor: Quản trị viên
```

---

**Tài liệu này mô tả đầy đủ các use case của module Quản lý Thành viên trong hệ thống Đoàn Hội Portal.**

*Phiên bản: 1.0*  
*Ngày cập nhật: 18/12/2025*  
*Người tạo: GitHub Copilot*
