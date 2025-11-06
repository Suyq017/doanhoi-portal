# Hướng Dẫn Sử Dụng Chức Năng Đóng Phí

## 📌 Giới Thiệu

Hệ thống đóng phí giúp tổ chức quản lý và thu phí từ các thành viên một cách tự động và hiện đại.

### Đối tượng sử dụng:
- **👨‍💼 Quản trị viên (Admin)**: Tạo đợt thu phí, gán phí cho thành viên, theo dõi thanh toán
- **👨‍🎓 Thành viên (Sinh viên/Cán bộ)**: Xem khoản phí được gán, thanh toán trực tuyến

### Tính năng chính:
- ✅ Tạo nhiều đợt thu phí khác nhau
- ✅ Linh hoạt mức phí theo đối tượng
- ✅ Thanh toán trực tuyến qua QR Code/Internet Banking
- ✅ Theo dõi tình trạng thanh toán thời gian thực
- ✅ Thống kê báo cáo chi tiết

---


## 👨‍💼 HƯỚNG DẪN CHO QUẢN TRỊ VIÊN

### Bước 1: Tạo Đợt Thu Phí Mới

#### 1.1. Truy cập trang quản lý
1. Đăng nhập vào hệ thống
2. Vào menu **"Đóng phí"** → **"Quản lý đợt thu"**
3. Nhấn nút **"Tạo mới"**

#### 1.2. Điền thông tin đợt thu
Bạn cần điền các thông tin sau:

| Trường thông tin | Mô tả | Ví dụ |
|-----------------|-------|-------|
| **Tên đợt thu** | Tên gọi của đợt thu phí | "Đoàn phí HK1 2024-2025" |
| **Tổ chức** | Chọn tổ chức áp dụng | "Khoa Khoa học và Kỹ thuật Máy tính" |
| **Mô tả** | Mô tả chi tiết về đợt thu | "Thu đoàn phí học kỳ 1..." |
| **Ngày bắt đầu** | Ngày bắt đầu cho phép thanh toán | 01/09/2024 |
| **Ngày kết thúc** | Hạn cuối thanh toán | 30/09/2024 |
| **Trạng thái** | Chọn trạng thái ban đầu | "Nháp" hoặc "Đang hoạt động" |

**💡 Lưu ý:**
- Trạng thái "Nháp": Chưa hiển thị với thành viên
- Trạng thái "Đang hoạt động": Thành viên có thể xem và thanh toán
- Trạng thái "Hoàn thành": Đã kết thúc, không thể thanh toán

#### 1.3. Lưu đợt thu
- Nhấn **"Lưu"** để tạo đợt thu mới
- Hệ thống sẽ chuyển đến trang chi tiết đợt thu

---

### Bước 2: Thiết Lập Mức Phí

Sau khi tạo đợt thu, bạn cần thiết lập các mức phí khác nhau.

#### 2.1. Vào tab "Mức phí"
1. Trong trang chi tiết đợt thu
2. Chọn tab **"Mức phí"**
3. Nhấn **"Thêm mức phí"**

#### 2.2. Tạo các mức phí
Ví dụ về các mức phí thông dụng:

| Tên mức phí | Số tiền | Đối tượng áp dụng |
|-------------|---------|-------------------|
| Sinh viên thường | 50,000đ | Sinh viên đại trà |
| Sinh viên KKHT | 100,000đ | Sinh viên Khoa học Kỹ thuật |
| Cán bộ | 150,000đ | Giảng viên, nhân viên |

**Cách thêm:**
1. Nhập tên mức phí
2. Nhập số tiền (đơn vị: VNĐ)
3. Nhập mô tả (tùy chọn)
4. Nhấn **"Lưu"**

**💡 Mẹo:**
- Có thể tạo nhiều mức phí cho cùng một đợt thu
- Mức phí có thể chỉnh sửa sau khi tạo
- Nên đặt tên mức phí rõ ràng để dễ quản lý

---

### Bước 3: Cấu Hình Cổng Thanh Toán PayOS

#### 3.1. Vào tab "Cấu hình PayOS"
1. Trong trang chi tiết đợt thu
2. Chọn tab **"Cấu hình PayOS"**

#### 3.2. Nhập thông tin PayOS
Bạn cần có tài khoản PayOS để lấy thông tin sau:

| Thông tin | Mô tả | Lấy ở đâu? |
|-----------|-------|-----------|
| **Client ID** | Mã định danh | Trang quản lý PayOS |
| **API Key** | Khóa truy cập API | Trang quản lý PayOS |
| **Checksum Key** | Khóa bảo mật | Trang quản lý PayOS |

**Cách nhập:**
1. Đăng nhập vào [PayOS Dashboard](https://payos.vn)
2. Copy các thông tin Client ID, API Key, Checksum Key
3. Paste vào form trong hệ thống
4. Chọn **"Sử dụng cấu hình riêng"** (hoặc dùng cấu hình chung)
5. Nhấn **"Lưu cấu hình"**

**⚠️ Quan trọng:**
- Thông tin PayOS được mã hóa an toàn
- Mỗi đợt thu có thể dùng cấu hình riêng hoặc cấu hình chung
- Nếu không có PayOS riêng, hệ thống sẽ dùng cấu hình mặc định

---

### Bước 4: Gán Phí Cho Thành Viên

Đây là bước quan trọng nhất - quyết định ai phải đóng phí.

#### 4.1. Vào tab "Gán phí"
1. Trong trang chi tiết đợt thu
2. Chọn tab **"Gán phí cho thành viên"**

#### 4.2. Chọn tổ chức
1. Chọn tổ chức cần gán phí (Ví dụ: Khoa CNTT)
2. Hệ thống sẽ hiển thị danh sách thành viên thuộc tổ chức đó

#### 4.3. Lọc thành viên (tùy chọn)
Bạn có thể lọc để dễ dàng chọn đúng đối tượng:

**Lọc theo:**
- **Tổ chức con**: Ví dụ chỉ chọn "Lớp K19"
- **Loại thành viên**: Sinh viên, Cán bộ
- **Trạng thái**: Đoàn viên, Hội viên, Cả hai

#### 4.4. Chọn thành viên và gán mức phí
**Cách 1: Chọn từng người**
1. Tích checkbox bên cạnh tên thành viên
2. Chọn mức phí phù hợp từ dropdown
3. Số tiền sẽ tự động hiển thị

**Cách 2: Chọn tất cả**
1. Tích checkbox "Chọn tất cả"
2. Chọn mức phí chung cho tất cả

**Ví dụ thực tế:**
```
☑️ Nguyễn Văn A (MSSV: 1234567)  →  Mức: "Sinh viên thường" (50,000đ)
☑️ Trần Thị B (MSSV: 1234568)    →  Mức: "Sinh viên thường" (50,000đ)
☑️ Lê Văn C (Giảng viên)         →  Mức: "Cán bộ" (150,000đ)
```

#### 4.5. Xác nhận gán phí
1. Kiểm tra lại danh sách đã chọn
2. Nhấn nút **"Gán phí"**
3. Hệ thống sẽ thông báo kết quả

**💡 Lưu ý:**
- Một người chỉ được gán phí một lần cho mỗi đợt thu
- Có thể hủy gán phí nếu chưa thanh toán
- Hạn thanh toán được tự động đặt theo ngày kết thúc của đợt thu

---

### Bước 5: Theo Dõi Tình Trạng Thanh Toán

#### 5.1. Xem tiến độ thu phí


#### 5.2. Xem lịch sử thanh toán chi tiết
Trong tab **"Lịch sử thanh toán"**, bạn có thể:

**Xem thông tin:**
- Họ tên, Mã số người thanh toán
- Số tiền đã thanh toán
- Mã đơn hàng
- Thời gian thanh toán
- Thông tin giao dịch ngân hàng

**Chức năng:**
- 🔍 Tìm kiếm theo tên, mã số
- 📋 Lọc theo trạng thái (Đã thanh toán, Chưa thanh toán, Quá hạn)
- 📄 Phân trang xem nhiều bản ghi
- 📥 Xuất Excel (sắp ra mắt)

#### 5.3. Nhắc nhở người chưa thanh toán
**Tab "Gán phí"** hiển thị:
- ⏳ **Màu vàng**: Chưa thanh toán nhưng còn hạn
- ❌ **Màu đỏ**: Đã quá hạn thanh toán
- ✅ **Màu xanh**: Đã thanh toán

Bạn có thể:
- Xuất danh sách người chưa thanh toán
- Gửi email nhắc nhở (sắp ra mắt)

---

### Bước 6: Quản Lý Đợt Thu

#### 6.1. Chỉnh sửa thông tin đợt thu
1. Vào trang chi tiết đợt thu
2. Nhấn nút **"Chỉnh sửa"**
3. Cập nhật thông tin cần thay đổi
4. Nhấn **"Lưu"**

**Có thể sửa:**
- Tên đợt thu
- Mô tả
- Ngày kết thúc (nếu chưa quá hạn)
- Trạng thái

**💡 Lưu ý:**
- Không thể sửa Tổ chức sau khi đã tạo
- Cẩn thận khi thay đổi ngày kết thúc

#### 6.2. Thay đổi trạng thái đợt thu
**Các trạng thái:**
- 📝 **Nháp**: Đang chuẩn bị, chưa công khai
- ✅ **Đang hoạt động**: Đang thu phí, thành viên có thể thanh toán
- 🏁 **Hoàn thành**: Đã kết thúc, không cho thanh toán nữa

**Khi nào thay đổi:**
- Nháp → Đang hoạt động: Khi đã sẵn sàng cho thành viên thanh toán
- Đang hoạt động → Hoàn thành: Khi muốn kết thúc sớm hoặc đã đủ

#### 6.3. Xóa gán phí (nếu cần)
Trong tab **"Gán phí"**:
1. Tìm người cần hủy gán phí
2. Nhấn nút **"Xóa"** ở cuối dòng
3. Xác nhận xóa

**⚠️ Điều kiện:**
- Chỉ xóa được nếu **chưa thanh toán** hoặc **quá hạn**
- Không thể xóa nếu đã thanh toán thành công

---

**⚠️ Lưu ý:** Chỉ sửa được nếu chưa thanh toán

---

## 👨‍🎓 HƯỚNG DẪN CHO THÀNH VIÊN

### Bước 1: Xem Các Khoản Phí Cần Đóng

#### 1.1. Truy cập trang thanh toán
1. Đăng nhập vào hệ thống
2. Vào "Đóng phí của tôi"**

#### 1.2. Xem danh sách khoản phí
Bạn sẽ thấy các thẻ khoản phí được gán cho mình:

**Các trạng thái:**
- 🟡 **Chưa thanh toán**: Còn hạn, cần thanh toán
- 🔴 **Quá hạn**: Đã quá hạn thanh toán
- 🟢 **Đã thanh toán**: Đã hoàn thành thanh toán

#### 1.3. Lọc và tìm kiếm
**Có thể lọc theo:**
- Tất cả trạng thái
- Chỉ xem "Chưa thanh toán"
- Chỉ xem "Đã thanh toán"
- Chỉ xem "Quá hạn"

**Tìm kiếm:** Nhập tên đợt thu vào ô tìm kiếm

---

### Bước 2: Thanh Toán Trực Tuyến

#### 2.1. Bắt đầu thanh toán
1. Tìm khoản phí cần đóng
2. Nhấn nút **"Thanh toán ngay"**
3. Hệ thống sẽ tạo link thanh toán

**⏳ Chờ trong giây lát...**
```
Đang tạo link thanh toán...
Vui lòng chờ trong giây lát
```

#### 2.2. Chuyển đến trang thanh toán PayOS
Sau khi tạo link thành công:
- Bạn sẽ được chuyển đến trang PayOS
- Trang này hiển thị:
  - Mã QR Code
  - Thông tin đơn hàng
  - Số tiền cần thanh toán

#### 2.3. Thực hiện thanh toán

**Cách 1: Quét QR Code** ⭐ Khuyến nghị
1. Mở app Ngân hàng trên điện thoại
2. Chọn chức năng **"Quét QR"** hoặc **"Chuyển khoản QR"**
3. Quét mã QR trên màn hình
4. App ngân hàng sẽ tự động điền đầy đủ thông tin:
   - Số tài khoản nhận
   - Số tiền
   - Nội dung chuyển khoản
5. Kiểm tra thông tin
6. Xác nhận thanh toán

---

### Bước 3: Xem Kết Quả Thanh Toán
Sau khi thanh toán , bạn sẽ được chuyển về trang kết quả.
---