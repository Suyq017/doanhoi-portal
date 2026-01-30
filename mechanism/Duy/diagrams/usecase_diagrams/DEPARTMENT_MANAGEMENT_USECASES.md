# Module Quản Lý Đơn Vị - Mô Tả Use Cases

## Tổng Quan Module

Module Quản lý đơn vị cho phép quản trị viên quản lý các đơn vị tổ chức trong hệ thống Đoàn Hội Portal, bao gồm khoa, phòng ban, và các đơn vị khác. Module hỗ trợ quản lý thông tin đơn vị, import hàng loạt từ file Excel với khả năng xử lý file lớn (hơn 12,000 bản ghi).

---

## Use Case 1: Xem Danh Sách Đơn Vị

### Use Case Name
Xem danh sách đơn vị

### Actors
Quản trị viên

### Description
Quản trị viên xem danh sách tất cả đơn vị trong hệ thống với khả năng phân trang, tìm kiếm và lọc theo trạng thái hoạt động.

### Trigger
Quản trị viên truy cập vào trang quản lý đơn vị hoặc cần tra cứu thông tin đơn vị.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền xem danh sách đơn vị

### Post-Conditions
- Danh sách đơn vị được hiển thị theo tiêu chí đã chọn
- Thông tin bao gồm: tên đơn vị, mã đơn vị, trạng thái hoạt động, ngày tạo

### Normal Flow
1. Quản trị viên truy cập vào trang "Quản lý đơn vị"
2. Hệ thống hiển thị danh sách đơn vị với phân trang mặc định (10 bản ghi/trang)
3. Hệ thống hiển thị các thông tin: tên đơn vị, mã đơn vị, mô tả, trạng thái hoạt động, ngày tạo
4. Đơn vị được sắp xếp theo ngày tạo giảm dần (mới nhất trước)
5. Quản trị viên có thể chuyển trang để xem thêm đơn vị
6. Quản trị viên có thể điều chỉnh số lượng bản ghi hiển thị trên mỗi trang

### Alternative Flow
**Flow 2.a: Danh sách rỗng**
- 2.a.1. Hệ thống hiển thị thông báo "Chưa có đơn vị nào trong hệ thống"
- 2.a.2. Hệ thống hiển thị nút "Thêm đơn vị mới"

### Exception
Không có exception đặc biệt.

---

## Use Case 2: Tìm Kiếm/Lọc Đơn Vị

### Use Case Name
Tìm kiếm/lọc đơn vị

### Actors
Quản trị viên

### Description
Quản trị viên tìm kiếm và lọc danh sách đơn vị theo tên, mã đơn vị hoặc trạng thái hoạt động.

### Trigger
Quản trị viên muốn tìm kiếm đơn vị cụ thể hoặc lọc danh sách theo tiêu chí.

### Pre-Conditions
- Quản trị viên đang ở trang danh sách đơn vị
- Hệ thống đã có dữ liệu đơn vị

### Post-Conditions
- Danh sách đơn vị được lọc theo tiêu chí
- Kết quả tìm kiếm hiển thị với phân trang

### Normal Flow
1. Quản trị viên nhập từ khóa vào ô tìm kiếm (tên hoặc mã đơn vị)
2. Hệ thống tự động tìm kiếm và hiển thị kết quả phù hợp
3. Quản trị viên có thể chọn thêm bộ lọc:
   - Trạng thái hoạt động (Đang hoạt động / Không hoạt động)
4. Hệ thống cập nhật danh sách theo bộ lọc đã chọn
5. Quản trị viên xem kết quả tìm kiếm/lọc

### Alternative Flow
**Flow 2.a: Không tìm thấy kết quả**
- 2.a.1. Hệ thống hiển thị thông báo "Không tìm thấy đơn vị phù hợp"
- 2.a.2. Hệ thống hiển thị gợi ý: "Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc"

**Flow 3.a: Xóa bộ lọc**
- 3.a.1. Quản trị viên bấm nút "Xóa bộ lọc"
- 3.a.2. Hệ thống hiển thị lại toàn bộ danh sách đơn vị

### Exception
Không có exception đặc biệt.

---

## Use Case 3: Thêm Đơn Vị

### Use Case Name
Thêm đơn vị

### Actors
Quản trị viên

### Description
Quản trị viên thêm một đơn vị mới vào hệ thống thông qua form nhập liệu hoặc import từ file Excel.

### Trigger
Quản trị viên muốn thêm một hoặc nhiều đơn vị mới vào hệ thống.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền tạo đơn vị mới

### Post-Conditions
- Đơn vị mới được tạo và lưu vào cơ sở dữ liệu
- Thông tin đơn vị hiển thị trong danh sách

### Normal Flow
Xem chi tiết ở Use Case 4 (Thêm một đơn vị bằng form) và Use Case 5 (Thêm nhiều đơn vị từ file Excel)

### Alternative Flow
Không áp dụng (use case tổng quát)

### Exception
Không áp dụng (use case tổng quát)

---

## Use Case 4: Thêm Một Đơn Vị Bằng Form

### Use Case Name
Thêm một đơn vị bằng form

### Actors
Quản trị viên

### Description
Quản trị viên thêm một đơn vị mới vào hệ thống thông qua form nhập liệu với thông tin chi tiết.

### Trigger
Quản trị viên cần thêm một đơn vị cụ thể với thông tin chi tiết.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền tạo đơn vị mới

### Post-Conditions
- Đơn vị mới được tạo và lưu vào cơ sở dữ liệu
- Đơn vị có trạng thái hoạt động mặc định là "Đang hoạt động"
- Thông tin đơn vị hiển thị trong danh sách

### Normal Flow
1. Quản trị viên bấm nút "Thêm đơn vị mới"
2. Hệ thống hiển thị form nhập thông tin đơn vị với các trường:
   - **Bắt buộc**: Tên đơn vị
   - **Tùy chọn**: Mã đơn vị, Mô tả, Trạng thái hoạt động (mặc định: true)
3. Quản trị viên điền thông tin vào form
4. Quản trị viên bấm nút "Lưu"
5. Hệ thống kiểm tra tính hợp lệ của dữ liệu
6. Hệ thống kiểm tra tên và mã đơn vị không bị trùng lặp
7. Hệ thống lưu thông tin đơn vị
8. Hệ thống hiển thị thông báo "Tạo đơn vị thành công"
9. Hệ thống chuyển hướng về trang chi tiết đơn vị vừa tạo

### Alternative Flow
**Flow 4.a: Hủy tạo đơn vị**
- 4.a.1. Quản trị viên bấm nút "Hủy"
- 4.a.2. Hệ thống hiển thị xác nhận "Các thay đổi sẽ không được lưu. Bạn có chắc?"
- 4.a.3. Quản trị viên xác nhận
- 4.a.4. Hệ thống quay về trang danh sách đơn vị (không lưu thay đổi)

### Exception
**Exception 6.a: Tên đơn vị đã tồn tại**
- 6.a.1. Hệ thống kiểm tra phát hiện tên đơn vị đã tồn tại
- 6.a.2. Hiển thị lỗi "Đơn vị với tên này đã tồn tại trong hệ thống"
- 6.a.3. Quay lại bước 3 để quản trị viên sửa thông tin

**Exception 6.b: Mã đơn vị đã tồn tại**
- 6.b.1. Hệ thống kiểm tra phát hiện mã đơn vị đã tồn tại
- 6.b.2. Hiển thị lỗi "Đơn vị với mã này đã tồn tại trong hệ thống"
- 6.b.3. Quay lại bước 3 để quản trị viên sửa thông tin

**Exception 5.a: Thiếu trường bắt buộc**
- 5.a.1. Hệ thống kiểm tra phát hiện thiếu trường bắt buộc (tên đơn vị)
- 5.a.2. Hiển thị lỗi "Vui lòng điền đầy đủ thông tin bắt buộc"
- 5.a.3. Quay lại bước 3

---

## Use Case 5: Thêm Nhiều Đơn Vị Từ File Excel

### Use Case Name
Thêm nhiều đơn vị từ file Excel

### Actors
Quản trị viên

### Description
Quản trị viên import hàng loạt đơn vị từ file Excel theo template chuẩn. Hệ thống hỗ trợ xử lý file lớn với batch processing (hơn 12,000 bản ghi).

### Trigger
Quản trị viên cần thêm nhiều đơn vị cùng lúc (ví dụ: khởi tạo hệ thống, cập nhật cơ cấu tổ chức mới).

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền import đơn vị
- File Excel đã được chuẩn bị theo template chuẩn

### Post-Conditions
- Danh sách đơn vị được import thành công vào hệ thống
- Các đơn vị trùng lặp có thể được bỏ qua hoặc cập nhật (tùy cấu hình)
- Hệ thống ghi log chi tiết quá trình import
- Báo cáo kết quả import được tạo (số lượng thành công, thất bại, bỏ qua)

### Normal Flow

#### Server-side Processing (File nhỏ - dưới 5,000 bản ghi)

1. Quản trị viên bấm nút "Import từ Excel"
2. Hệ thống hiển thị hướng dẫn và nút "Tải template"
3. Quản trị viên tải template Excel về
4. Quản trị viên điền dữ liệu vào template:
   - **Bắt buộc**: Tên đơn vị (name)
   - **Tùy chọn**: Mã đơn vị (code), Mô tả (description), Trạng thái hoạt động (isActive)
5. Quản trị viên upload file Excel
6. Hệ thống nhận file và tạo session import
7. Hệ thống parse file Excel và trả về sessionId
8. Quản trị viên bấm nút "Validate dữ liệu"
9. Hệ thống thực hiện validation:
   - Kiểm tra trường bắt buộc (tên đơn vị)
   - Kiểm tra trùng lặp tên và mã đơn vị trong file
   - Kiểm tra trùng lặp với dữ liệu đã có trong database
10. Hệ thống hiển thị kết quả validation:
    - Số lượng bản ghi hợp lệ
    - Số lượng lỗi (errors)
    - Số lượng cảnh báo (warnings)
    - Danh sách chi tiết từng lỗi/cảnh báo
11. Nếu có lỗi nghiêm trọng, quản trị viên sửa file và upload lại
12. Nếu validation pass hoặc chỉ có warnings, quản trị viên bấm "Thực hiện import"
13. Hệ thống thực hiện import theo batch (mặc định 100 records/batch):
    - Tạo đơn vị mới
    - Xử lý conflict theo cấu hình (skip hoặc update)
    - Transaction management cho mỗi batch
14. Hệ thống hiển thị tiến trình import real-time
15. Sau khi hoàn tất, hệ thống hiển thị báo cáo:
    - Tổng số bản ghi xử lý
    - Số lượng thành công
    - Số lượng thất bại
    - Số lượng bỏ qua (skipped)
    - Danh sách chi tiết các bản ghi thất bại
16. Quản trị viên xem báo cáo và tải về (nếu cần)

#### Batch Processing (File lớn - hơn 12,000 bản ghi)

1. Quản trị viên bấm nút "Import từ Excel"
2. Hệ thống hiển thị hướng dẫn và nút "Tải template"
3. Quản trị viên tải template Excel về
4. Quản trị viên điền dữ liệu vào template
5. Quản trị viên upload file Excel
6. Hệ thống nhận file và tạo session import
7. Hệ thống parse file Excel với streaming (xử lý từng chunk để tiết kiệm memory)
8. Quản trị viên bấm nút "Validate dữ liệu"
9. Hệ thống thực hiện validation theo batch
10. Hệ thống hiển thị kết quả validation với phân trang
11. Quản trị viên xem và xác nhận dữ liệu
12. Quản trị viên cấu hình tùy chọn import:
    - Batch size (100-500 records, mặc định: 100)
    - Skip conflicts (bỏ qua trùng lặp)
    - Enable transaction (đảm bảo tính toàn vẹn)
    - Max retries (số lần retry khi lỗi)
13. Quản trị viên bấm "Bắt đầu import"
14. Hệ thống chia dữ liệu thành các batch theo cấu hình
15. Hệ thống xử lý từng batch:
    - Validate batch data
    - Transaction begin
    - Bulk insert hoặc update
    - Transaction commit
    - Update progress
16. Hệ thống hiển thị tiến trình import real-time:
    - Số batch đã xử lý / tổng batch
    - Số records thành công / tổng records
    - Tỷ lệ thành công (%)
    - Thời gian ước tính còn lại
    - Số lỗi hiện tại
17. Nếu có batch thất bại, hệ thống retry tự động (theo cấu hình maxRetries)
18. Quản trị viên có thể tạm dừng import bất kỳ lúc nào
19. Sau khi hoàn tất tất cả batches:
20. Hệ thống hiển thị báo cáo chi tiết
21. Quản trị viên xem báo cáo và tải về (nếu cần)

### Alternative Flow

**Flow 11.a: Có lỗi nhưng muốn bỏ qua**
- 11.a.1. Quản trị viên chọn tùy chọn "Bỏ qua bản ghi lỗi"
- 11.a.2. Hệ thống chỉ import các bản ghi hợp lệ
- 11.a.3. Các bản ghi lỗi được ghi vào báo cáo

**Flow 11.b: Cập nhật đơn vị đã tồn tại**
- 11.b.1. Quản trị viên chọn tùy chọn "Cập nhật nếu đã tồn tại"
- 11.b.2. Hệ thống kiểm tra tên hoặc mã đơn vị
- 11.b.3. Nếu đã tồn tại, cập nhật thông tin thay vì tạo mới
- 11.b.4. Ghi log các bản ghi được cập nhật

**Flow 18.a: Tạm dừng import**
- 18.a.1. Quản trị viên bấm nút "Tạm dừng"
- 18.a.2. Hệ thống dừng xử lý batch tiếp theo
- 18.a.3. Session được lưu lại với trạng thái "Paused"
- 18.a.4. Quản trị viên có thể tiếp tục import sau

**Flow 18.b: Tiếp tục import đã tạm dừng**
- 18.b.1. Quản trị viên truy cập session đã tạm dừng
- 18.b.2. Quản trị viên bấm nút "Tiếp tục"
- 18.b.3. Hệ thống lấy batch tiếp theo chưa xử lý
- 18.b.4. Tiếp tục xử lý từ vị trí đã dừng

**Flow 17.a: Retry batch thất bại**
- 17.a.1. Batch import thất bại do lỗi database hoặc network
- 17.a.2. Hệ thống tự động retry batch đó (theo cấu hình maxRetries)
- 17.a.3. Nếu vẫn thất bại sau maxRetries lần, đánh dấu batch failed
- 17.a.4. Tiếp tục xử lý batch tiếp theo
- 17.a.5. Ghi log chi tiết lỗi

**Flow 13.a: Xử lý với transaction**
- 13.a.1. Quản trị viên bật tùy chọn "Enable transaction"
- 13.a.2. Mỗi batch được xử lý trong một transaction
- 13.a.3. Nếu batch thất bại, rollback toàn bộ batch
- 13.a.4. Đảm bảo tính toàn vẹn dữ liệu

**Flow 13.b: Xử lý không dùng transaction (nhanh hơn)**
- 13.b.1. Quản trị viên tắt tùy chọn "Enable transaction"
- 13.b.2. Các records được insert/update độc lập
- 13.b.3. Nếu một record thất bại, các records khác vẫn thành công
- 13.b.4. Tốc độ nhanh hơn nhưng có thể có dữ liệu không nhất quán

### Exception

**Exception 6.a: File không đúng định dạng**
- 6.a.1. Hệ thống kiểm tra file không phải Excel (.xlsx)
- 6.a.2. Hiển thị lỗi "File không đúng định dạng. Vui lòng upload file .xlsx"
- 6.a.3. Quay lại bước 5

**Exception 6.b: File quá lớn (> 20MB)**
- 6.b.1. Hệ thống từ chối file quá 20MB
- 6.b.2. Hiển thị lỗi "File quá lớn (giới hạn 20MB)"
- 6.b.3. Gợi ý chia nhỏ file hoặc liên hệ admin

**Exception 6.c: File không đúng template**
- 6.c.1. Hệ thống phát hiện thiếu cột bắt buộc hoặc sai tên cột
- 6.c.2. Hiển thị lỗi "File không đúng template. Vui lòng tải template mới nhất"
- 6.c.3. Quay lại bước 3

**Exception 7.a: Lỗi parse file**
- 7.a.1. Hệ thống gặp lỗi khi đọc file Excel
- 7.a.2. Hiển thị lỗi "Không thể đọc file. Vui lòng kiểm tra file có bị lỗi không"
- 7.a.3. Quay lại bước 5

**Exception 9.a: Tất cả bản ghi đều lỗi**
- 9.a.1. Hệ thống kiểm tra 100% bản ghi có lỗi nghiêm trọng
- 9.a.2. Hiển thị lỗi "Tất cả bản ghi đều có lỗi. Vui lòng kiểm tra lại file"
- 9.a.3. Không cho phép thực hiện import
- 9.a.4. Quay lại bước 4

**Exception 15.a: Lỗi database khi import**
- 15.a.1. Hệ thống gặp lỗi database khi lưu batch
- 15.a.2. Nếu có transaction, rollback batch đó
- 15.a.3. Ghi log lỗi chi tiết
- 15.a.4. Retry theo cấu hình maxRetries
- 15.a.5. Nếu vẫn lỗi, báo cáo batch thất bại và tiếp tục

**Exception 15.b: Memory overflow**
- 15.b.1. Hệ thống phát hiện memory sử dụng vượt ngưỡng
- 15.b.2. Tạm dừng import tự động
- 15.b.3. Hiển thị lỗi "Hệ thống đang quá tải. Vui lòng thử lại sau"
- 15.b.4. Dọn dẹp memory và session data

**Exception 15.c: Session hết hạn**
- 15.c.1. Session import hết hạn (mặc định 30 phút không hoạt động)
- 15.c.2. Hệ thống tự động cleanup session data
- 15.c.3. Hiển thị lỗi "Session đã hết hạn. Vui lòng bắt đầu lại"
- 15.c.4. Quản trị viên phải upload file lại từ đầu

**Exception 17.a: Retry vượt quá maxRetries**
- 17.a.1. Batch thất bại liên tiếp vượt quá số lần retry cho phép
- 17.a.2. Hệ thống đánh dấu batch failed
- 17.a.3. Ghi log chi tiết lỗi và số lần retry
- 17.a.4. Tiếp tục xử lý batch tiếp theo
- 17.a.5. Báo cáo batch thất bại trong kết quả cuối

---

## Use Case 6: Chỉnh Sửa Thông Tin Đơn Vị

### Use Case Name
Chỉnh sửa thông tin đơn vị

### Actors
Quản trị viên

### Description
Quản trị viên cập nhật thông tin của một đơn vị đã có trong hệ thống.

### Trigger
Quản trị viên cần cập nhật thông tin đơn vị khi có thay đổi (đổi tên, cập nhật mô tả, thay đổi trạng thái hoạt động).

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền chỉnh sửa thông tin đơn vị
- Đơn vị đã tồn tại trong hệ thống

### Post-Conditions
- Thông tin đơn vị được cập nhật trong cơ sở dữ liệu
- Lịch sử thay đổi được ghi log
- Danh sách đơn vị hiển thị thông tin mới

### Normal Flow
1. Quản trị viên tìm và chọn đơn vị cần chỉnh sửa từ danh sách
2. Hệ thống hiển thị trang chi tiết đơn vị với nút "Chỉnh sửa"
3. Hệ thống hiển thị thêm thông tin:
   - Số lượng người dùng quản lý (managementUserCount)
   - Số lượng người dùng đào tạo (trainingUserCount)
4. Quản trị viên bấm nút "Chỉnh sửa"
5. Hệ thống hiển thị form chỉnh sửa với thông tin hiện tại được điền sẵn:
   - Tên đơn vị
   - Mã đơn vị
   - Mô tả
   - Trạng thái hoạt động
6. Quản trị viên chỉnh sửa các trường thông tin cần thiết
7. Quản trị viên bấm nút "Lưu"
8. Hệ thống kiểm tra tính hợp lệ của dữ liệu
9. Hệ thống kiểm tra tên và mã đơn vị không bị trùng với đơn vị khác
10. Hệ thống cập nhật thông tin đơn vị
11. Hệ thống hiển thị thông báo "Cập nhật thành công"
12. Hệ thống hiển thị thông tin đơn vị đã được cập nhật

### Alternative Flow

**Flow 6.a: Thay đổi trạng thái hoạt động**
- 6.a.1. Quản trị viên thay đổi trạng thái từ "Đang hoạt động" sang "Không hoạt động" hoặc ngược lại
- 6.a.2. Hệ thống cập nhật trạng thái
- 6.a.3. Nếu chuyển sang "Không hoạt động", hệ thống có thể cảnh báo về người dùng liên quan

**Flow 7.a: Hủy chỉnh sửa**
- 7.a.1. Quản trị viên bấm nút "Hủy"
- 7.a.2. Hệ thống hiển thị xác nhận "Các thay đổi sẽ không được lưu. Bạn có chắc?"
- 7.a.3. Quản trị viên xác nhận
- 7.a.4. Hệ thống quay về trang chi tiết đơn vị (không lưu thay đổi)

### Exception

**Exception 9.a: Tên đơn vị mới đã tồn tại**
- 9.a.1. Quản trị viên thay đổi tên thành tên đã được dùng bởi đơn vị khác
- 9.a.2. Hệ thống hiển thị lỗi "Đơn vị với tên này đã tồn tại trong hệ thống"
- 9.a.3. Quay lại bước 6

**Exception 9.b: Mã đơn vị mới đã tồn tại**
- 9.b.1. Quản trị viên thay đổi mã thành mã đã được dùng bởi đơn vị khác
- 9.b.2. Hệ thống hiển thị lỗi "Đơn vị với mã này đã tồn tại trong hệ thống"
- 9.b.3. Quay lại bước 6

**Exception 8.a: Dữ liệu không hợp lệ**
- 8.a.1. Hệ thống phát hiện dữ liệu không hợp lệ
- 8.a.2. Hiển thị lỗi chi tiết cho từng trường
- 8.a.3. Quay lại bước 6

**Exception 8.b: Thiếu trường bắt buộc**
- 8.b.1. Quản trị viên xóa nội dung của trường bắt buộc (tên đơn vị)
- 8.b.2. Hệ thống hiển thị lỗi "Trường này là bắt buộc"
- 8.b.3. Quay lại bước 6

**Exception 2.a: Đơn vị không tồn tại**
- 2.a.1. Đơn vị đã bị xóa bởi người khác
- 2.a.2. Hệ thống hiển thị lỗi "Không tìm thấy đơn vị"
- 2.a.3. Quay về danh sách đơn vị

---

## Use Case 7: Xóa Đơn Vị

### Use Case Name
Xóa đơn vị

### Actors
Quản trị viên

### Description
Quản trị viên xóa một hoặc nhiều đơn vị khỏi hệ thống. Hỗ trợ xóa từng đơn vị hoặc xóa hàng loạt. Đơn vị có người dùng liên quan không thể xóa.

### Trigger
Quản trị viên cần xóa đơn vị không còn sử dụng hoặc xóa nhầm.

### Pre-Conditions
- Quản trị viên đã đăng nhập vào hệ thống
- Quản trị viên có quyền xóa đơn vị
- Đơn vị đã tồn tại trong hệ thống

### Post-Conditions
- Đơn vị bị xóa khỏi cơ sở dữ liệu
- Lịch sử xóa được ghi log
- Đơn vị không còn hiển thị trong danh sách

### Normal Flow

#### Xóa một đơn vị:

1. Quản trị viên tìm và chọn đơn vị cần xóa
2. Hệ thống hiển thị trang chi tiết đơn vị
3. Hệ thống hiển thị số lượng người dùng liên quan:
   - Số người dùng quản lý (managementUserCount)
   - Số người dùng đào tạo (trainingUserCount)
4. Quản trị viên bấm nút "Xóa"
5. Hệ thống kiểm tra đơn vị có người dùng liên quan không
6. Nếu không có người dùng, hệ thống hiển thị hộp thoại xác nhận:
   - "Bạn có chắc muốn xóa đơn vị [Tên]?"
   - "Hành động này không thể hoàn tác"
7. Quản trị viên xác nhận xóa
8. Hệ thống xóa đơn vị khỏi cơ sở dữ liệu
9. Hệ thống hiển thị thông báo "Đã xóa đơn vị thành công"
10. Hệ thống chuyển hướng về danh sách đơn vị

#### Xóa nhiều đơn vị:

1. Quản trị viên ở trang danh sách đơn vị
2. Quản trị viên chọn nhiều đơn vị bằng checkbox
3. Quản trị viên bấm nút "Xóa đã chọn"
4. Hệ thống hiển thị hộp thoại xác nhận:
   - "Bạn có chắc muốn xóa [n] đơn vị?"
   - "Hành động này không thể hoàn tác"
   - Cảnh báo nếu có đơn vị có người dùng liên quan
5. Quản trị viên xác nhận xóa
6. Hệ thống kiểm tra từng đơn vị có người dùng liên quan không
7. Hệ thống xóa các đơn vị không có người dùng
8. Hệ thống hiển thị báo cáo:
   - Số đơn vị đã xóa thành công
   - Danh sách đơn vị không thể xóa (do có người dùng) với lý do
9. Danh sách đơn vị được làm mới

### Alternative Flow

**Flow 7.a: Hủy xóa**
- 7.a.1. Quản trị viên bấm nút "Hủy" trong hộp thoại xác nhận
- 7.a.2. Hệ thống đóng hộp thoại
- 7.a.3. Không có đơn vị nào bị xóa
- 7.a.4. Quay lại trang hiện tại

**Flow 7.a: Xóa batch một phần thành công**
- 7.a.1. Một số đơn vị xóa thành công, một số không thể xóa
- 7.a.2. Hệ thống xóa các đơn vị không có người dùng
- 7.a.3. Hiển thị báo cáo chi tiết:
   - "Đã xóa [m]/[n] đơn vị"
   - Danh sách [n-m] đơn vị không thể xóa với lý do
- 7.a.4. Quản trị viên có thể xem chi tiết và xử lý các đơn vị còn lại

### Exception

**Exception 5.a: Đơn vị có người dùng liên quan**
- 5.a.1. Hệ thống kiểm tra phát hiện đơn vị có người dùng quản lý hoặc đào tạo
- 5.a.2. Hiển thị lỗi "Không thể xóa đơn vị có người dùng liên quan"
- 5.a.3. Hiển thị chi tiết:
   - Số người dùng quản lý: [số lượng]
   - Số người dùng đào tạo: [số lượng]
- 5.a.4. Gợi ý: "Vui lòng chuyển người dùng sang đơn vị khác trước khi xóa"
- 5.a.5. Không cho phép xóa

**Exception 2.a: Đơn vị không tồn tại**
- 2.a.1. Hệ thống kiểm tra đơn vị đã bị xóa hoặc không tồn tại
- 2.a.2. Hiển thị lỗi "Đơn vị không tồn tại hoặc đã bị xóa"
- 2.a.3. Quay lại danh sách đơn vị

**Exception 6.a: Một số đơn vị trong batch không tồn tại**
- 6.a.1. Hệ thống kiểm tra và phát hiện một số ID không hợp lệ
- 6.a.2. Hiển thị cảnh báo "Một số đơn vị không tồn tại: [danh sách tên]"
- 6.a.3. Hỏi có muốn tiếp tục xóa các đơn vị còn lại không
- 6.a.4. Nếu đồng ý, xóa các đơn vị hợp lệ
- 6.a.5. Nếu từ chối, hủy toàn bộ thao tác

**Exception 8.a: Lỗi database khi xóa**
- 8.a.1. Hệ thống gặp lỗi database khi xóa
- 8.a.2. Hiển thị lỗi "Không thể xóa đơn vị. Vui lòng thử lại"
- 8.a.3. Ghi log lỗi để admin kiểm tra
- 8.a.4. Không xóa đơn vị

**Exception 6.b: Không đủ quyền xóa**
- 6.b.1. Quản trị viên không có quyền xóa đơn vị cụ thể
- 6.b.2. Hiển thị lỗi "Bạn không có quyền xóa đơn vị này"
- 6.b.3. Quay lại trang trước

---

## Phụ Lục

### Danh Sách API Endpoints

#### Quản lý đơn vị cơ bản:
- `GET /departments` - Lấy danh sách đơn vị (có phân trang, tìm kiếm, lọc)
- `GET /departments/:id` - Lấy thông tin chi tiết đơn vị (bao gồm số lượng người dùng)
- `POST /departments` - Tạo đơn vị mới
- `PATCH /departments/:id` - Cập nhật thông tin đơn vị
- `DELETE /departments/:id` - Xóa một đơn vị
- `DELETE /departments/bulk` - Xóa nhiều đơn vị

#### Import đơn vị:
- `GET /departments/template` - Tải template Excel
- `POST /departments/import/upload` - Upload file Excel (Server-side)
- `GET /departments/import/:sessionId/validate` - Validate dữ liệu import
- `POST /departments/import/:sessionId/execute` - Thực hiện import
- `GET /departments/import/:sessionId/status` - Kiểm tra trạng thái session

#### Validation và utility:
- `POST /departments/validate-codes` - Validate danh sách mã đơn vị

### Template Excel

Các cột trong template:

1. **name** (Bắt buộc) - Tên đơn vị
2. **code** - Mã đơn vị
3. **description** - Mô tả đơn vị
4. **isActive** - Trạng thái hoạt động (true/false, mặc định: true)

### Các Tính Năng Đặc Biệt

#### 1. Batch Processing cho File Lớn
Hệ thống tự động chia file lớn thành các batch nhỏ để xử lý, tránh timeout và memory overflow.

#### 2. Transaction Management
Mỗi batch có thể được xử lý trong transaction để đảm bảo tính toàn vẹn dữ liệu (có thể bật/tắt).

#### 3. Retry Logic
Tự động retry các batch thất bại với số lần retry có thể cấu hình.

#### 4. Session Management
Import session được quản lý với timeout 30 phút và auto cleanup.

#### 5. Memory Optimization
Sử dụng streaming để parse file lớn, tránh load toàn bộ file vào memory.

#### 6. Progress Tracking
Theo dõi tiến trình import real-time với thông tin chi tiết về từng batch.

#### 7. Conflict Handling
Hỗ trợ skip hoặc update khi gặp trùng lặp (configurable).

#### 8. Pause/Resume
Có thể tạm dừng và tiếp tục import bất kỳ lúc nào.

### Cấu Hình Import

#### Batch Processing Options:
```typescript
{
  batchSize: 100-500,           // Số records mỗi batch (mặc định: 100)
  skipConflicts: true/false,    // Bỏ qua trùng lặp (mặc định: false)
  enableTransaction: true/false, // Dùng transaction (mặc định: true)
  maxRetries: 0-5,              // Số lần retry (mặc định: 3)
  enableFallback: true/false    // Fallback khi batch lớn thất bại (mặc định: true)
}
```

### Quy Trình Validation

#### Client-side Validation:
Không áp dụng (file được upload trực tiếp lên server)

#### Server-side Validation:
- Kiểm tra trường bắt buộc (name)
- Kiểm tra độ dài chuỗi
- Kiểm tra trùng lặp name/code trong file
- Kiểm tra trùng lặp với database
- Kiểm tra định dạng isActive (boolean)

### Performance Considerations

#### Small Files (< 1,000 records):
- Single batch processing
- Response time: < 1 giây

#### Medium Files (1,000 - 5,000 records):
- Multi-batch processing (batch size: 100)
- Response time: 2-5 giây
- Transaction enabled

#### Large Files (5,000 - 12,000+ records):
- Optimized batch processing (batch size: 500)
- Response time: 10-30 giây
- Streaming parse
- Memory monitoring
- Progress tracking
- Pause/Resume support

### Error Handling Strategy

1. **Validation Errors**: Hiển thị chi tiết lỗi từng trường, cho phép sửa và thử lại
2. **Conflict Errors**: Cung cấp tùy chọn skip hoặc update existing
3. **System Errors**: Transaction rollback (nếu enabled), ghi log, retry logic
4. **Database Errors**: Auto retry (max 3 times), fallback mechanism
5. **Memory Errors**: Streaming parse, batch size optimization, auto cleanup

### Security Considerations

1. **Authentication**: Yêu cầu JWT token cho tất cả endpoints
2. **Authorization**: Kiểm tra quyền hạn theo vai trò
3. **Input Validation**: Sanitize input để tránh injection attacks
4. **File Upload Security**: Kiểm tra file type, size limit
5. **Rate Limiting**: Giới hạn số request import đồng thời
6. **Audit Logging**: Ghi log tất cả thao tác quan trọng

### Giới Hạn Hệ Thống

- **Max file size**: 20MB
- **Max records per file**: 15,000 (khuyến nghị)
- **Max concurrent imports**: 3 sessions
- **Session timeout**: 30 phút không hoạt động
- **Max batch size**: 500 records
- **Max retries per batch**: 5 lần

---

## Sơ Đồ Use Case

```
                    ┌─────────────────────┐
                    │  Quản lý đơn vị     │
                    └─────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        │                    │                    │
┌───────▼───────┐    ┌───────▼───────┐    ┌──────▼──────┐
│ Xem danh sách │    │ Thêm đơn vị   │    │ Chỉnh sửa   │
│ đơn vị        │    │               │    │ thông tin   │
└───────┬───────┘    └───────┬───────┘    │ đơn vị      │
        │                    │             └─────────────┘
        │ <<extends>>        │ <<generalization>>
        │                    │
┌───────▼───────┐    ┌───────┴───────────────────┐
│ Tìm kiếm/lọc  │    │                           │
│ đơn vị        │    │                           │
└───────────────┘    │                           │
                     │                           │
              ┌──────▼──────┐           ┌────────▼────────┐
              │ Thêm một    │           │ Thêm nhiều      │
              │ đơn vị bằng │           │ đơn vị từ       │
              │ form        │           │ file Excel      │
              └─────────────┘           └─────────────────┘

                     │
                     │
              ┌──────▼──────┐
              │ Xóa đơn vị  │
              │             │
              └─────────────┘

Actor: Quản trị viên
```

---

**Tài liệu này mô tả đầy đủ các use case của module Quản lý Đơn Vị trong hệ thống Đoàn Hội Portal.**

*Phiên bản: 1.0*  
*Ngày cập nhật: 18/12/2025*  
*Người tạo: GitHub Copilot*
