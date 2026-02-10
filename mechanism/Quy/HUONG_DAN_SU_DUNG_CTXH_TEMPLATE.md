# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ CTXH VÀ BIỂU MẪU

**Portal Đoàn - Hội Sinh viên ĐHBK TP.HCM**

---

## MỤC LỤC

1. [Giới thiệu](#giới-thiệu)
2. [Chức năng Công tác Xã hội (CTXH)](#chức-năng-công-tác-xã-hội-ctxh)
   - [Dành cho Quản trị viên](#dành-cho-quản-trị-viên)
   - [Dành cho Sinh viên](#dành-cho-sinh-viên)
3. [Chức năng Quản lý Biểu mẫu](#chức-năng-quản-lý-biểu-mẫu)
   - [Dành cho Quản trị viên](#dành-cho-quản-trị-viên-1)
   - [Dành cho Sinh viên](#dành-cho-sinh-viên-1)
4. [Câu hỏi thường gặp (FAQ)](#câu-hỏi-thường-gặp)

---

## GIỚI THIỆU

Hệ thống Portal Đoàn - Hội cung cấp hai chức năng chính:

- **CTXH (Công tác Xã hội)**: Quản lý hoạt động CTXH, điểm danh và tính ngày CTXH cho sinh viên
- **Biểu mẫu**: Quản lý và điền đơn từ trực tuyến, tự động tạo file Word

Tài liệu này hướng dẫn chi tiết cách sử dụng từng chức năng cho cả quản trị viên và sinh viên.

---

## CHỨC NĂNG CÔNG TÁC XÃ HỘI (CTXH)

### DÀNH CHO QUẢN TRỊ VIÊN

#### 1. Quản lý Danh mục Hoạt động

**Tạo danh mục mới:**

1. Vào menu **CTXH** → **Danh mục**
2. Click nút **"Tạo danh mục"**
3. Điền thông tin:
   - **Tên danh mục**: VD: "Hoạt động tình nguyện", "Học tập", "Văn hóa - nghệ thuật"
   - **Mô tả**: Mô tả ngắn về loại hoạt động
4. Click **"Lưu"**

**Chỉnh sửa/Xóa danh mục:**

- Click vào icon **"Chỉnh sửa"** (✏️) bên cạnh danh mục
- Hoặc click icon **"Xóa"** (🗑️) để xóa (chỉ khi chưa có hoạt động nào)

**Xem danh sách hoạt động theo danh mục:**

- Click vào tên danh mục để xem tất cả hoạt động thuộc danh mục đó

---

#### 2. Quản lý Hoạt động CTXH

**Tạo hoạt động mới:**

1. Vào menu **CTXH** → **Hoạt động**
2. Click nút **"Tạo hoạt động"**
3. Điền thông tin:
   - **Tên hoạt động**: VD: "Tiếp sức mùa thi 2024"
   - **Danh mục**: Chọn danh mục phù hợp
   - **Tổ chức**: Chọn đơn vị tổ chức
   - **Thời gian**: Ngày bắt đầu và kết thúc
   - **Địa điểm**: Nơi diễn ra hoạt động
   - **Số ngày CTXH**: Số ngày được công nhận (VD: 2 ngày)
   - **Mô tả**: Thông tin chi tiết về hoạt động
4. Click **"Lưu nháp"** hoặc **"Lưu và kích hoạt"**

**Trạng thái hoạt động:**

| Trạng thái | Ý nghĩa | Hành động có thể thực hiện |
|------------|---------|---------------------------|
| **Nháp** (DRAFT) | Hoạt động đang soạn thảo | Sửa đổi, Xóa, Kích hoạt |
| **Đang hoạt động** (ACTIVE) | Hoạt động đang diễn ra | Sửa (giới hạn), Thêm/Xóa SV, Chấm điểm, Hoàn thành, Hủy |
| **Hoàn thành** (COMPLETED) | Hoạt động đã kết thúc | Xem thông tin |
| **Đã hủy** (CANCELLED) | Hoạt động bị hủy bỏ | Xem thông tin |

**Chuyển đổi trạng thái:**

```
Nháp → Đang hoạt động → Hoàn thành
  │                        
  └──────────> Đã hủy
```

---

#### 3. Quản lý Người tham gia

**Thêm sinh viên vào hoạt động:**

*Cách 1: Thêm thủ công*

1. Mở chi tiết hoạt động
2. Tab **"Người tham gia"**
3. Click **"Thêm sinh viên"**
4. Nhập MSSV → Hệ thống tự động tìm thông tin sinh viên
5. Click **"Thêm"**

*Cách 2: Import từ Excel*

1. Tải file mẫu Excel từ nút **"Tải file mẫu"**
2. Điền danh sách sinh viên vào file Excel:
   - Cột A: MSSV
   - Cột B: Họ và tên (tùy chọn)
   - Cột C: Số ngày CTXH thực tế (nếu đã biết)
3. Click **"Import từ Excel"**
4. Chọn file và upload
5. Hệ thống sẽ tự động:
   - Thêm sinh viên vào hoạt động
   - Cập nhật số ngày CTXH (nếu có)

**Chấm ngày CTXH:**

1. Tại tab **"Người tham gia"**, tìm sinh viên cần chấm
2. Nhập số ngày thực tế vào cột **"Ngày CTXH thực tế"**
   - Lưu ý: Số ngày thực tế ≤ Tổng số ngày của hoạt động
3. Click **"Lưu"** hoặc nhấn **Enter**

**Xóa sinh viên khỏi hoạt động:**

- Click icon **"Xóa"** (🗑️) bên cạnh tên sinh viên
- Xác nhận xóa

**Xuất danh sách:**

- Click nút **"Xuất Excel"** để tải về danh sách người tham gia
- File Excel bao gồm: MSSV, Họ tên, Lớp, Ngày CTXH

---

#### 4. Cấu hình Giới hạn CTXH

**Mục đích:** Thiết lập số ngày CTXH tối đa mà mỗi tổ chức có thể cấp cho một hoạt động.

**Tạo cấu hình:**

1. Vào **CTXH** → **Cấu hình giới hạn**
2. Click **"Tạo cấu hình"**
3. Điền:
   - **Năm học**: VD: 2024-2025
   - **Số ngày tối thiểu**: VD: 1 ngày
   - **Tổ chức**: Chọn đơn vị áp dụng (để trống = áp dụng toàn trường)
   - **Trạng thái**: Bật/Tắt
4. Click **"Lưu"**

**Lưu ý:**
- Cấu hình sẽ tự động áp dụng cho tất cả tổ chức con
- Mỗi năm học nên có một cấu hình riêng

---

#### 5. Import từ Hệ thống Cũ

**Dành cho**: Di chuyển dữ liệu từ hệ thống CTXH cũ

1. Vào **CTXH** → **Import từ hệ thống cũ**
2. Tải file mẫu
3. Chuẩn bị dữ liệu theo định dạng mẫu
4. Upload file
5. Kiểm tra kết quả import

---

### DÀNH CHO SINH VIÊN

#### 1. Xem Danh sách Hoạt động CTXH

1. Đăng nhập vào hệ thống
2. Vào menu **CTXH** → **Hoạt động**
3. Xem danh sách các hoạt động đang diễn ra và sắp tới
4. Có thể:
   - **Lọc** theo danh mục
   - **Tìm kiếm** theo tên hoạt động
   - Chuyển đổi giữa **Lưới** / **Danh sách**

**Thông tin hiển thị:**
- Tên hoạt động
- Danh mục
- Thời gian diễn ra
- Địa điểm
- Số ngày CTXH
- Trạng thái

---

#### 2. Xem Chi tiết Hoạt động

1. Click vào một hoạt động
2. Xem đầy đủ thông tin:
   - Mô tả chi tiết
   - Thời gian, địa điểm
   - Tổ chức đơn vị
   - Số lượng người tham gia

---

#### 3. Xem Kết quả CTXH của Bản thân

1. Vào **CTXH** → **Kết quả của tôi**
2. Xem danh sách hoạt động đã tham gia:
   - Tên hoạt động
   - Thời gian
   - Số ngày được công nhận
   - Trạng thái (Đã đăng ký / Đã hoàn thành)

**Tổng kết:**
- **Tổng số ngày CTXH**: Tổng cộng tất cả ngày đã tích lũy
- **Số hoạt động**: Tổng số hoạt động đã tham gia

---

#### 4. Sử dụng AI Chat Assistant

**Công dụng:**
- Hỏi về quy định CTXH
- Tra cứu thông tin hoạt động
- Nhận gợi ý hoạt động phù hợp

**Cách sử dụng:**

1. Click vào icon **Chat** ở góc dưới bên phải màn hình
2. Gõ câu hỏi, VD:
   - "Sinh viên cần tích lũy bao nhiêu ngày CTXH?"
   - "Có hoạt động nào về tình nguyện không?"
   - "Quy định về CTXH là gì?"
3. Nhận câu trả lời từ AI
4. Có thể hỏi tiếp để làm rõ

---

## CHỨC NĂNG QUẢN LÝ BIỂU MẪU

### DÀNH CHO QUẢN TRỊ VIÊN

#### 1. Upload Mẫu đơn Word

**Chuẩn bị file Word:**

1. Tạo file Word (.docx) với nội dung mẫu đơn
2. Đánh dấu các vị trí cần điền bằng placeholder:
   ```
   ${TEN_TRUONG}
   ```
   
**Ví dụ:**
```
ĐƠN XIN NGHỈ HỌC

Kính gửi: Ban Giám Hiệu Trường Đại học Bách Khoa

Tôi tên: ${HO_TEN}
MSSV: ${MSSV}
Lớp: ${LOP}

Với lý do: ${LY_DO}

Kính mong Nhà trường xem xét và chấp thuận.

        Ngày ${NGAY} tháng ${THANG} năm ${NAM}
                    Người làm đơn
                    ${HO_TEN}
```

**Upload lên hệ thống:**

1. Vào **Biểu mẫu** → **Quản lý mẫu**
2. Click **"Upload mẫu mới"**
3. Điền:
   - **Tên mẫu**: VD: "Đơn xin nghỉ học"
   - **Mô tả**: Mô tả ngắn về mục đích sử dụng
4. Chọn file Word (.docx)
5. Click **"Upload"**

**Hệ thống tự động:**
- Phân tích file và tìm tất cả placeholder (${...})
- Chuyển sang bước cấu hình

---

#### 2. Cấu hình Fields

**Sau khi upload, hệ thống hiển thị danh sách các placeholder đã phát hiện.**

**Cấu hình từng field:**

| Thông tin | Mô tả | Ví dụ |
|-----------|-------|-------|
| **Placeholder** | Tên trong file Word | ${HO_TEN} |
| **Label hiển thị** | Nhãn hiển thị cho người dùng | Họ và tên |
| **Loại trường** | TEXT, NUMBER, DATE, SELECT, CHECKBOX... | TEXT |
| **Bắt buộc** | Có bắt buộc điền không | ✓ |
| **Auto-fill** | Tự động điền từ thông tin cá nhân | FULL_NAME |
| **Giá trị mặc định** | Giá trị mặc định (nếu có) | - |

**Các loại trường (Field Type):**

- **TEXT**: Văn bản ngắn (họ tên, địa chỉ...)
- **TEXTAREA**: Văn bản dài (lý do, mô tả...)
- **NUMBER**: Số
- **DATE**: Ngày tháng
- **SELECT**: Chọn từ danh sách
- **CHECKBOX**: Tick chọn

**Auto-fill Source:**

Hệ thống có thể tự động điền từ thông tin sinh viên:

- `STUDENT_CODE`: MSSV
- `FULL_NAME`: Họ và tên
- `EMAIL`: Email
- `CLASS`: Lớp
- `DEPARTMENT`: Khoa
- `CURRENT_DATE`: Ngày hiện tại

**Cấu hình Mapping Ngày:**

Nếu cần tách ngày thành 3 trường riêng:

1. Click **"Mapping ngày"**
2. Chọn placeholder cho:
   - `${NGAY}` → Ngày (1-31)
   - `${THANG}` → Tháng (1-12)
   - `${NAM}` → Năm (2024)
3. Liên kết với 1 field DATE
4. Hệ thống tự động tách giá trị

**Lưu cấu hình:**

1. Kiểm tra lại tất cả fields
2. Click **"Lưu cấu hình"**

---

#### 3. Publish/Unpublish Mẫu

**Publish (Phát hành):**
- Sau khi cấu hình xong, click **"Publish"**
- Mẫu sẽ hiển thị cho sinh viên

**Unpublish (Gỡ):**
- Click **"Unpublish"** để ẩn mẫu
- Sinh viên không nhìn thấy và không thể điền

**Trạng thái:**
- **Draft**: Đang soạn thảo
- **Published**: Đã phát hành
- **Archived**: Đã lưu trữ

---

#### 4. Xem Danh sách Đơn đã nộp

1. Vào **Biểu mẫu** → **Đơn đã nộp**
2. Xem danh sách tất cả submission:
   - Tên sinh viên
   - Mẫu đã điền
   - Thời gian nộp
   - Trạng thái
3. Click vào để xem chi tiết hoặc tải file

---

#### 5. Xóa/Sửa Mẫu

**Sửa mẫu:**
- Click **"Cấu hình"** để chỉnh sửa fields
- Không thể thay đổi file Word gốc (cần upload lại)

**Xóa mẫu:**
- Click icon **"Xóa"** (🗑️)
- Xác nhận xóa
- Lưu ý: Các đơn đã nộp vẫn được giữ lại

---

### DÀNH CHO SINH VIÊN

#### 1. Xem Danh sách Mẫu đơn

1. Đăng nhập hệ thống
2. Vào menu **Biểu mẫu**
3. Tab **"Danh sách mẫu"** hiển thị các mẫu đơn có thể điền:
   - Tên mẫu
   - Mô tả
   - Nút **"Điền đơn"**

---

#### 2. Điền và Nộp đơn

**Bước 1: Chọn mẫu**
- Click **"Điền đơn"** trên mẫu muốn sử dụng

**Bước 2: Điền form**
- Hệ thống hiển thị form với các trường cần điền
- Các trường đã có auto-fill sẽ tự động điền sẵn (MSSV, họ tên...)
- Điền các trường còn lại
- Các trường bắt buộc có dấu **"*"**

**Bước 3: Preview (Xem trước)**
- Click **"Preview"** để xem văn bản trước khi nộp
- Kiểm tra thông tin đã điền
- Nếu cần sửa, đóng preview và chỉnh sửa

**Bước 4: Submit (Nộp đơn)**
- Click **"Nộp đơn"**
- Hệ thống xử lý và tạo file Word
- Thông báo thành công

**Bước 5: Download**
- Sau khi nộp, có thể tải file Word về máy
- Click **"Tải xuống"**

---

#### 3. Xem Đơn đã nộp

1. Tab **"Đơn đã nộp"**
2. Xem danh sách các đơn đã nộp trước đó:
   - Tên mẫu
   - Thời gian nộp
   - Trạng thái
3. Có thể:
   - **Preview**: Xem lại nội dung
   - **Download**: Tải file về

---

#### 4. Lưu ý khi Điền đơn

✅ **Nên:**
- Kiểm tra kỹ thông tin trước khi nộp
- Sử dụng chức năng Preview
- Lưu file đã tải về để giữ bản sao

❌ **Không nên:**
- Điền sai thông tin cá nhân
- Nộp đơn nhiều lần không cần thiết
- Bỏ qua các trường bắt buộc

---

## CÂU HỎI THƯỜNG GẶP

### Về CTXH

**Q1: Sinh viên có thể tự đăng ký hoạt động CTXH không?**
> Không. Quản trị viên sẽ thêm sinh viên vào hoạt động sau khi xác nhận tham gia.

**Q2: Tại sao số ngày CTXH của tôi khác với tổng số ngày của hoạt động?**
> Số ngày thực tế có thể nhỏ hơn tổng số ngày của hoạt động do:
> - Bạn không tham gia đủ các buổi
> - Quản trị viên chấm điểm theo thực tế tham gia

**Q3: Làm sao để xem tổng số ngày CTXH đã tích lũy?**
> Vào **CTXH → Kết quả của tôi**, phần tổng kết sẽ hiển thị tổng số ngày.

**Q4: Có thể sửa hoạt động đang ở trạng thái ACTIVE không?**
> Có, nhưng chỉ một số thông tin có thể sửa. Không thể thay đổi thời gian hoặc giảm số ngày CTXH khi đã có người tham gia.

**Q5: Import Excel bị lỗi, làm sao khắc phục?**
> Kiểm tra:
> - File đúng định dạng .xlsx
> - MSSV hợp lệ và tồn tại trong hệ thống
> - Số ngày CTXH không vượt quá tổng số ngày của hoạt động

**Q6: AI Chat có hiểu được tiếng Việt không?**
> Có, AI hỗ trợ đầy đủ tiếng Việt.

---

### Về Biểu mẫu

**Q1: File Word phải là định dạng gì?**
> Chỉ chấp nhận file .docx (Word 2007 trở lên). Nếu có file .doc, cần chuyển đổi sang .docx trước.

**Q2: Placeholder phải viết như thế nào?**
> Định dạng: `${TEN_TRUONG}` (trong dấu ngoặc nhọn, có dấu $)
> - Chỉ dùng chữ cái, số và dấu gạch dưới
> - Không có khoảng trắng
> - VD đúng: `${HO_TEN}`, `${LY_DO_1}`
> - VD sai: `${Họ tên}`, `$HO_TEN`, `{HO_TEN}`

**Q3: Có thể chỉnh sửa file Word sau khi upload không?**
> Không. Nếu cần sửa file Word, phải upload lại từ đầu.

**Q4: Preview không hiển thị, tại sao?**
> Có thể do:
> - Trình duyệt chặn popup → Cho phép popup từ trang web
> - Kết nối Internet chậm → Chờ một lúc
> - File quá lớn → Liên hệ quản trị viên

**Q5: Có thể nộp cùng một mẫu nhiều lần không?**
> Có thể, mỗi lần nộp là một submission riêng.

**Q6: File tải về có bị lỗi font chữ không?**
> Không, hệ thống giữ nguyên định dạng từ file Word gốc.

**Q7: Trường DATE hiển thị sai định dạng?**
> Định dạng ngày mặc định là DD/MM/YYYY. Nếu cần định dạng khác, sử dụng Mapping ngày.

**Q8: Có thể xem lại thông tin đã điền trong đơn cũ không?**
> Có, vào **Đơn đã nộp** → Click **Preview** để xem lại.

---

### Liên hệ Hỗ trợ

Nếu gặp vấn đề không được giải quyết trong tài liệu này, vui lòng liên hệ:

- **Email hỗ trợ**: [email hỗ trợ]
- **Hotline**: [số điện thoại]
- **Fanpage**: [link fanpage]

---

**Phiên bản:** 1.0  
**Cập nhật lần cuối:** Tháng 2/2026  
**Người biên soạn:** [Tên người soạn]

---

## PHỤ LỤC

### A. Danh sách Quyền hệ thống

#### Quyền CTXH:
- `ctxh.access`: Truy cập module CTXH
- `ctxh.categories.create`: Tạo danh mục
- `ctxh.categories.update`: Sửa danh mục
- `ctxh.categories.delete`: Xóa danh mục
- `ctxh.activities.create`: Tạo hoạt động
- `ctxh.activities.update`: Sửa hoạt động
- `ctxh.activities.delete`: Xóa hoạt động
- `ctxh.participants.manage`: Quản lý người tham gia
- `ctxh.reports.export`: Xuất báo cáo
- `ctxh.limit-configs.manage`: Quản lý cấu hình giới hạn

#### Quyền Biểu mẫu:
- `templates.access`: Xem trang Biểu mẫu
- `templates.admin.access`: Xem trang Quản lý biểu mẫu (admin)
- `templates.manage`: Quản lý biểu mẫu (admin)

---

### B. Các Trường Auto-fill

| Source | Mô tả | Ví dụ |
|--------|-------|-------|
| STUDENT_CODE | Mã số sinh viên | 2012345 |
| FULL_NAME | Họ và tên đầy đủ | Nguyễn Văn A |
| EMAIL | Email sinh viên | nguyenvana@hcmut.edu.vn |
| CLASS | Lớp | CC01 |
| DEPARTMENT | Khoa | Khoa Khoa học và Kỹ thuật Máy tính |
| CURRENT_DATE | Ngày hiện tại | 07/02/2026 |

---

**HẾT TÀI LIỆU HƯỚNG DẪN**
