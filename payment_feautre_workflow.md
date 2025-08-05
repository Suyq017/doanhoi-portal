### Workflow Chi Tiết Chức Năng Đóng Phí

#### 1. **Cấu hình đợt đóng phí (Dành cho Admin)**

- **Bước 1:** Admin truy cập hệ thống quản trị.
- **Bước 2:** Chọn tổ chức trên cây tổ chức (thường hiển thị dưới dạng combo box hoặc tree view).
- **Bước 3:** Nhấn "Tạo đợt đóng phí mới".
- **Bước 4:** Nhập các thông tin:
    - Tên đợt đóng phí.
    - Mô tả đợt đóng phí.
    - Thêm các mức phí áp dụng (ví dụ: 20.000đ, 30.000đ...), có thể nhiều mức tuỳ tổ chức.
    - Nội dung chi tiết kèm theo cho từng mức phí (note hoặc mô tả riêng).
- **Bước 5:** Admin chọn danh sách thành viên thuộc tổ chức cần đóng phí. Có thể tick chọn từng thành viên hoặc chọn tất cả.
- **Bước 6:** Thiết lập số tiền \& nội dung phải đóng cho từng thành viên hoặc áp dụng theo từng nhóm.
- **Bước 7:** Hệ thống tạo API key riêng cho từng đợt đóng phí (không dùng chung giữa các đợt). Nếu tổ chức đó không có API key, hệ thống tự động lấy API key của tổ chức cấp cha gần nhất.

#### 3. **Thông báo và hiển thị đợt đóng phí**

- **Bước 8:** Thành viên nhận thông báo/hiển thị đợt đóng phí khi đăng nhập hệ thống.
- **Bước 9:** Thành viên vào mục "Đóng phí", xem các đợt phí cần thanh toán, chọn mức phí phù hợp hoặc theo mặc định của admin.


#### 4. **Thực hiện thanh toán**

- **Bước 10:** Thành viên thực hiện thanh toán:
    - Hệ thống sinh mã QR code cho từng mục thanh toán (tương ứng với API key của đợt).
    - Thành viên sử dụng app ngân hàng để quét mã QR và chuyển khoản.
- **Bước 11:** Sau khi thanh toán, hệ thống tự động xác nhận nếu liên kết với API ngân hàng, hoặc admin duyệt xác nhận thủ công.


#### 5. **Quản lý - Báo cáo**

- **Bước 12:** Admin/trưởng đơn vị theo dõi trạng thái đóng phí của các thành viên (chưa đóng, đã đóng, đang chờ xác nhận).
- **Bước 13:** Hệ thống hỗ trợ xuất danh sách đã/đang đóng phí, tổng hợp theo từng tổ chức, từng đợt đóng phí.


#### **Tóm tắt quy trình**

1. Tạo đợt đóng phí → Cấu hình mức phí, nội dung.
2. Chọn thành viên cần đóng phí.
3. Thành viên nhận thông báo → Thực hiện thanh toán qua QR code.
4. Hệ thống xác nhận thanh toán → Quản lý, thống kê và tổng hợp.

Quy trình này đảm bảo tính minh bạch, linh hoạt cho từng tổ chức và cá nhân, đồng thời dễ mở rộng và kiểm soát chặt chẽ việc đóng phí cũng như truy xuất thông tin, minh bạch tài chính nội bộ.