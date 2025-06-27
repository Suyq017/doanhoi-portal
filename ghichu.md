Tuyệt vời! Dưới đây là ghi chú chi tiết về các yêu cầu chức năng (features) và những điểm cần lưu ý từ buổi họp trong video của bạn.

---

### **Ghi Chú Yêu Cầu Chức Năng**

**Ngày:** [Ghi lại ngày họp]
**Dự án:** Quản lý Đoàn Hội

**Người tổ chức:** Thầy Duy
**Người tham gia:** Toàn, Duy, Thịnh

---

#### **I. Chức Năng "Quản Lý Đơn Vị" (Đã hoàn thiện một phần)**

**Các thành phần:**
*   **Form:** Tên, mã, mô tả.
*   **Chức năng cơ bản:** Tạo mới, xem, sửa, xóa.

**Yêu cầu cải tiến:**

1.  **Gộp nút "Thêm Mới"**:
    *   Tạo một nút dạng `Dropdown`.
    *   Nút này chứa 2 lựa chọn:
        1.  `Thêm từng đơn vị` (chức năng tạo mới thủ công hiện tại).
        2.  `Thêm từ file`.

2.  **Cải tiến tính năng "Thêm từ File"**:
    *   **Tải file mẫu**:
        *   Thay vì để nguyên câu "Tải file mẫu Excel tại đây", biến chữ **"tại đây"** thành một liên kết (link) để người dùng bấm vào tải file mẫu Excel. Bỏ nút `Tải mẫu`.
        *   Kiểm tra lại: Hiện tại đang tải về file `.csv`, cần sửa lại để tải đúng file `.xlsx` (Excel).
    *   **Import file**:
        *   Người dùng sẽ kéo-thả (drag-and-drop) file Excel vào khu vực chỉ định.
        *   Hệ thống hiển thị màn hình `Xem trước` (preview) dữ liệu.
        *   Nút `Import` để xác nhận thêm dữ liệu vào hệ thống.
    *   **Lưu ý quan trọng**: Chức năng này chỉ chấp nhận file **Excel (.xlsx)**, không dùng file CSV.

---

#### **II. Chức Năng "Quản Lý Lớp Học"**

**Các thành phần:**
*   **Form:** Thêm lớp, năm học, chọn đơn vị (khoa).

**Yêu cầu phát triển:**

1.  **Bổ sung "Thêm từ File"**:
    *   Thêm chức năng import lớp học từ file Excel.
    *   Chức năng này phải được làm **đồng bộ và nhất quán** với chức năng "Thêm từ File" của trang Quản lý Đơn vị.
    *   Sử dụng chung một `component` (đặt tên là `ImportModel`) để tái sử dụng code.

---

#### **III. Chức Năng "Quản Lý Người Dùng"**

**Yêu cầu phát triển:**

1.  Bổ sung chức năng "Thêm từ File" để import danh sách người dùng.
2.  Chức năng này cũng phải đồng bộ và tái sử dụng component `ImportModel`.

---

#### **IV. Chức Năng "Quản Lý Tổ Chức" (Đoàn - Hội)**

**Cấu trúc dữ liệu (cần hiểu rõ):**
*   **Đoàn:** Đoàn trường -> Đoàn cơ sở (Đoàn khoa, Đoàn khối) -> Chi đoàn (lớp).
*   **Hội:** Hội sinh viên trường -> Liên chi hội -> Chi hội (lớp) và các CLB/Đội/Nhóm.

**Yêu cầu về giao diện & luồng hoạt động:**

1.  **Giao diện cây thư mục (Tree View) phân cấp**:
    *   Màn hình ban đầu chỉ hiển thị các đơn vị cấp cao nhất (Đoàn trường, Hội SV trường).
    *   Không xổ ra toàn bộ cây thư mục ngay từ đầu vì dữ liệu quá lớn.
2.  **Xem chi tiết cấp dưới**:
    *   Bên cạnh mỗi đơn vị, có một nút "Xem chi tiết" (hoặc "Quản lý").
    *   Khi bấm vào, sẽ chuyển đến một trang mới, hiển thị danh sách các đơn vị cấp con trực thuộc của đơn vị đó.
    *   **Ví dụ:** Bấm "Quản lý" ở dòng "Đoàn trường" -> chuyển đến trang "Quản lý tổ chức: Đoàn trường" và chỉ hiển thị 13 Đoàn cơ sở.
3.  **Thêm thành viên**:
    *   Chỉ có thể thêm thành viên ở cấp cuối cùng (Chi đoàn/Chi hội).
    *   Thêm bằng file Excel:
        *   **Khi ở trang tổng thể**: File import cần 2 cột: `Mã số sinh viên` và `Mã lớp/đơn vị`.
        *   **Khi ở trang chi tiết của một lớp**: File import chỉ cần 1 cột: `Mã số sinh viên`.

---

#### **V. Yêu Cầu Kỹ Thuật & Lưu Ý Chung**

1.  **Tái sử dụng Component (`ImportModel`)**:
    *   Component này đã được tạo và đặt trong thư mục `share/components`.
    *   Phải kế thừa và sử dụng component này cho tất cả các chức năng import file để đảm bảo tính nhất quán.
2.  **Quản lý biến môi trường (`.env`)**:
    *   Tất cả các URL, địa chỉ IP (ví dụ: `localhost`) phải được tách ra và lưu vào file `.env`.
    *   **Không hard-code** đường dẫn tuyệt đối trong mã nguồn.
3.  **Đa Ngôn Ngữ (Translation Keys)**:
    *   Cấu trúc file ngôn ngữ:
        *   `common.json`: Chứa các key dùng chung cho nhiều bảng (ví dụ: status, created_at, action).
        *   Các file riêng: Chứa các key đặc thù cho từng bảng (ví dụ: `department.json` chứa `name`, `code`).
    *   Kiểm tra và bổ sung các key còn thiếu để tránh hiển thị lỗi như "main.field.create".
4.  **Sử dụng AI (GitHub Copilot)**:
    *   Cẩn thận khi dùng AI để tạo code, vì nó có thể tạo ra mã không nhất quán.
    *   Phải đọc hiểu và chỉnh sửa lại code do AI tạo ra.
    *   **Giới hạn:** Tài khoản miễn phí chỉ có 300 lượt gọi/tháng, sử dụng tiết kiệm.

---

#### **VI. Phân Công & Công Việc Tiếp Theo**

1.  **Hoàn thiện 3 chức năng chính**: Người dùng, Tổ chức, Danh mục dữ liệu (Đơn vị, Lớp học).
2.  **Viết tài liệu (document)**: Toàn, Duy, Thịnh thống nhất và viết lại các yêu cầu thành tài liệu rõ ràng.
3.  **Tạo nhánh (branch)** trên Git và phân công công việc cụ thể.
4.  **Review code**: Mọi thay đổi phải được review trước khi merge.