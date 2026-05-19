# Activity Diagram - Thêm Người Dùng

## Mô tả
Activity diagram mô tả quy trình thêm một thành viên mới vào hệ thống thông qua form nhập liệu.

---

## Activity Diagram - Thêm Một Thành Viên Bằng Form

```mermaid
graph TD
    Start([Bắt đầu]) --> A1[Quản trị viên bấm<br/>'Thêm thành viên mới']
    
    A1 --> A2[Hệ thống hiển thị form<br/>nhập thông tin]
    
    A2 --> A3[Quản trị viên điền<br/>thông tin cơ bản]
    
    A3 --> D1{Có chọn<br/>tổ chức?}
    
    D1 -->|Có| A4[Chọn tổ chức từ dropdown]
    D1 -->|Không| A5[Bỏ qua chọn tổ chức]
    
    A4 --> D2{Có gán<br/>vai trò?}
    A5 --> D2
    
    D2 -->|Có| A6[Chọn vai trò và<br/>tổ chức áp dụng]
    D2 -->|Không| A7[Bỏ qua gán vai trò]
    
    A6 --> D3{Gán nhiều<br/>vai trò?}
    A7 --> A8
    
    D3 -->|Có| A6A[Thêm vai trò khác]
    D3 -->|Không| A8[Quản trị viên bấm 'Lưu']
    A6A --> A6
    
    A8 --> A9[Hệ thống validate dữ liệu]
    
    A9 --> D4{Dữ liệu<br/>hợp lệ?}
    
    D4 -->|Không - Thiếu trường bắt buộc| E1[Hiển thị lỗi:<br/>'Thiếu thông tin bắt buộc']
    D4 -->|Không - Format sai| E2[Hiển thị lỗi:<br/>'Dữ liệu không hợp lệ']
    
    E1 --> A3
    E2 --> A3
    
    D4 -->|Có| A10[Kiểm tra email/mã số<br/>đã tồn tại]
    
    A10 --> D5{Email/Mã<br/>trùng lặp?}
    
    D5 -->|Có| E3[Hiển thị lỗi:<br/>'Email/Mã số đã tồn tại']
    E3 --> A3
    
    D5 -->|Không| A11[Tạo mật khẩu mặc định<br/>từ email/mã số]
    
    A11 --> A12[Hash mật khẩu<br/>bằng bcrypt]
    
    A12 --> A13[Lưu thông tin<br/>thành viên vào DB]
    
    A13 --> D6{Có chọn<br/>tổ chức?}
    
    D6 -->|Có| A14[Thêm thành viên vào tổ chức<br/>và tổ chức cha]
    D6 -->|Không| A15
    
    A14 --> D7{Có gán<br/>vai trò?}
    
    D7 -->|Có| A15[Gán vai trò cho<br/>thành viên]
    D7 -->|Không| A16
    
    A15 --> A16[Ghi log tạo thành viên]
    
    A16 --> A17[Hiển thị thông báo<br/>'Tạo thành công']
    
    A17 --> A18[Chuyển hướng đến<br/>trang chi tiết thành viên]
    
    A18 --> End([Kết thúc])
    
    style Start fill:#90EE90
    style End fill:#FFB6C1
    style D1 fill:#FFE4B5
    style D2 fill:#FFE4B5
    style D3 fill:#FFE4B5
    style D4 fill:#FFE4B5
    style D5 fill:#FFE4B5
    style D6 fill:#FFE4B5
    style D7 fill:#FFE4B5
    style E1 fill:#FFB6C1
    style E2 fill:#FFB6C1
    style E3 fill:#FFB6C1
    style A11 fill:#ADD8E6
    style A12 fill:#ADD8E6
```

---

## Activity Diagram - Thêm Nhiều Thành Viên Từ Excel (Server-side)

```mermaid
graph TD
    Start([Bắt đầu]) --> B1[Quản trị viên bấm<br/>'Import từ Excel']
    
    B1 --> B2[Hệ thống hiển thị<br/>hướng dẫn và nút tải template]
    
    B2 --> B3[Quản trị viên tải<br/>template Excel]
    
    B3 --> B4[Quản trị viên điền<br/>dữ liệu vào template]
    
    B4 --> B5[Quản trị viên<br/>upload file Excel]
    
    B5 --> B6[Hệ thống nhận file<br/>và tạo session import]
    
    B6 --> B7[Parse file Excel<br/>và trả về sessionId]
    
    B7 --> D1{File<br/>hợp lệ?}
    
    D1 -->|Không - Sai định dạng| E1[Lỗi: 'File không<br/>đúng định dạng']
    D1 -->|Không - Quá lớn| E2[Lỗi: 'File quá lớn']
    D1 -->|Không - Sai template| E3[Lỗi: 'File không<br/>đúng template']
    
    E1 --> B5
    E2 --> B5
    E3 --> B3
    
    D1 -->|Có| B8[Quản trị viên bấm<br/>'Validate dữ liệu']
    
    B8 --> B9[Validate từng bản ghi:<br/>- Trường bắt buộc<br/>- Định dạng email/phone<br/>- Mã khoa/lớp tồn tại<br/>- Trùng lặp]
    
    B9 --> B10[Hiển thị kết quả validation:<br/>- Số bản ghi hợp lệ<br/>- Số lỗi/cảnh báo<br/>- Chi tiết lỗi]
    
    B10 --> D2{Có lỗi<br/>nghiêm trọng?}
    
    D2 -->|Có - 100% lỗi| E4[Lỗi: 'Tất cả bản ghi<br/>đều có lỗi']
    E4 --> B4
    
    D2 -->|Có - Một phần lỗi| D3{Bỏ qua<br/>lỗi?}
    
    D3 -->|Không| B4
    D3 -->|Có| B11
    
    D2 -->|Không| B11[Quản trị viên bấm<br/>'Thực hiện import']
    
    B11 --> B12[Chia dữ liệu thành<br/>batches 50 records]
    
    B12 --> B13[Xử lý batch đầu tiên]
    
    B13 --> B14[Với mỗi record trong batch:<br/>- Tạo thành viên<br/>- Hash mật khẩu<br/>- Tạo tổ chức nếu cần<br/>- Gán vào tổ chức]
    
    B14 --> D4{Batch<br/>thành công?}
    
    D4 -->|Không| E5[Rollback batch<br/>Ghi log lỗi]
    E5 --> D5
    
    D4 -->|Có| B15[Cập nhật tiến trình]
    
    B15 --> D5{Còn batch<br/>tiếp theo?}
    
    D5 -->|Có| B13
    
    D5 -->|Không| B16[Tạo báo cáo import:<br/>- Tổng số xử lý<br/>- Thành công<br/>- Thất bại<br/>- Chi tiết lỗi]
    
    B16 --> B17[Hiển thị báo cáo<br/>cho quản trị viên]
    
    B17 --> B18[Quản trị viên xem<br/>và tải báo cáo]
    
    B18 --> End([Kết thúc])
    
    style Start fill:#90EE90
    style End fill:#FFB6C1
    style D1 fill:#FFE4B5
    style D2 fill:#FFE4B5
    style D3 fill:#FFE4B5
    style D4 fill:#FFE4B5
    style D5 fill:#FFE4B5
    style E1 fill:#FFB6C1
    style E2 fill:#FFB6C1
    style E3 fill:#FFB6C1
    style E4 fill:#FFB6C1
    style E5 fill:#FFB6C1
    style B9 fill:#ADD8E6
    style B14 fill:#ADD8E6
```

---

## Activity Diagram - Thêm Nhiều Thành Viên (Client-side Batch Processing)

```mermaid
graph TD
    Start([Bắt đầu]) --> C1[Quản trị viên bấm<br/>'Import từ Excel']
    
    C1 --> C2[Hệ thống hiển thị<br/>hướng dẫn]
    
    C2 --> C3[Quản trị viên tải<br/>template và điền dữ liệu]
    
    C3 --> C4[Upload file Excel]
    
    C4 --> C5[Frontend parse file<br/>trực tiếp trên client]
    
    C5 --> C6[Frontend validate<br/>cơ bản trên client]
    
    C6 --> C7[Hiển thị kết quả<br/>validation với phân trang]
    
    C7 --> C8[Quản trị viên xem<br/>và xác nhận dữ liệu]
    
    C8 --> C9[Cấu hình tùy chọn import:<br/>- Skip duplicates<br/>- Update existing]
    
    C9 --> C10[Quản trị viên bấm<br/>'Bắt đầu import']
    
    C10 --> C11[Frontend chia dữ liệu<br/>thành batches 200 records]
    
    C11 --> C12[Lấy batch đầu tiên]
    
    C12 --> C13[Gửi batch lên backend<br/>qua API /users/import/batch]
    
    C13 --> C14[Backend xử lý batch:<br/>- Validation server-side<br/>- Process sub-batches 50<br/>- Transaction management]
    
    C14 --> D1{Batch<br/>thành công?}
    
    D1 -->|Không| C15[Frontend retry<br/>lần 1]
    
    C15 --> D2{Thành công<br/>sau retry?}
    
    D2 -->|Không| C16[Retry lần 2]
    
    C16 --> D3{Thành công?}
    
    D3 -->|Không| C17[Retry lần 3]
    
    C17 --> D4{Thành công?}
    
    D4 -->|Không| C18[Ghi log batch thất bại<br/>Hiển thị cảnh báo]
    
    C18 --> D5
    
    D4 -->|Có| C19
    D3 -->|Có| C19
    D2 -->|Có| C19
    D1 -->|Có| C19[Cập nhật tiến trình:<br/>- Số batch xử lý/tổng<br/>- Số records thành công<br/>- Tỷ lệ %<br/>- Thời gian còn lại]
    
    C19 --> D5{Còn batch<br/>tiếp theo?}
    
    D5 -->|Có| C12
    
    D5 -->|Không| C20[Frontend gọi API<br/>lấy tổng kết session]
    
    C20 --> C21[Hiển thị báo cáo<br/>chi tiết]
    
    C21 --> C22[Quản trị viên xem<br/>và tải báo cáo]
    
    C22 --> End([Kết thúc])
    
    style Start fill:#90EE90
    style End fill:#FFB6C1
    style D1 fill:#FFE4B5
    style D2 fill:#FFE4B5
    style D3 fill:#FFE4B5
    style D4 fill:#FFE4B5
    style D5 fill:#FFE4B5
    style C5 fill:#87CEEB
    style C6 fill:#87CEEB
    style C11 fill:#87CEEB
    style C13 fill:#87CEEB
    style C14 fill:#ADD8E6
    style C15 fill:#FFA07A
    style C16 fill:#FFA07A
    style C17 fill:#FFA07A
    style C18 fill:#FFB6C1
```

---

## Swimlane Diagram - Thêm Thành Viên Bằng Form

```mermaid
graph TB
    subgraph "Quản trị viên"
        A1[Bấm 'Thêm thành viên mới']
        A3[Điền thông tin vào form]
        A4[Chọn tổ chức nếu có]
        A5[Chọn vai trò nếu có]
        A8[Bấm 'Lưu']
        A18[Xem trang chi tiết]
    end
    
    subgraph "Hệ thống"
        A2[Hiển thị form nhập liệu]
        A9[Validate dữ liệu]
        D4{Hợp lệ?}
        A10[Kiểm tra trùng lặp]
        D5{Trùng?}
        A11[Tạo mật khẩu mặc định]
        A12[Hash mật khẩu]
        A13[Lưu vào database]
        A14[Thêm vào tổ chức]
        A15[Gán vai trò]
        A16[Ghi log]
        A17[Hiển thị thông báo thành công]
    end
    
    subgraph "Xử lý lỗi"
        E1[Lỗi: Thiếu thông tin]
        E2[Lỗi: Format sai]
        E3[Lỗi: Trùng lặp]
    end
    
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    A5 --> A8
    A8 --> A9
    A9 --> D4
    
    D4 -->|Không| E1
    D4 -->|Không| E2
    E1 --> A3
    E2 --> A3
    
    D4 -->|Có| A10
    A10 --> D5
    
    D5 -->|Có| E3
    E3 --> A3
    
    D5 -->|Không| A11
    A11 --> A12
    A12 --> A13
    A13 --> A14
    A14 --> A15
    A15 --> A16
    A16 --> A17
    A17 --> A18
    
    style A1 fill:#90EE90
    style A18 fill:#90EE90
    style E1 fill:#FFB6C1
    style E2 fill:#FFB6C1
    style E3 fill:#FFB6C1
```

---

## Giải thích các thành phần

### Decision Points (Decision Nodes)
- **Diamond shapes**: Các điểm quyết định trong flow
- Ví dụ: "Có chọn tổ chức?", "Dữ liệu hợp lệ?", "Email/Mã trùng lặp?"

### Activities (Action Nodes)
- **Rectangle shapes**: Các hoạt động/hành động
- Ví dụ: "Validate dữ liệu", "Lưu vào database", "Hash mật khẩu"

### Error Handling
- **Pink/Red nodes**: Các trường hợp lỗi và exception
- Flow quay về bước trước để sửa lỗi

### Key Features
1. **Validation**: Nhiều bước kiểm tra dữ liệu
2. **Security**: Hash mật khẩu trước khi lưu
3. **Auto-generation**: Tạo mật khẩu mặc định tự động
4. **Flexibility**: Hỗ trợ gán nhiều vai trò
5. **Error Recovery**: Cho phép sửa lỗi và thử lại

### Batch Processing Features
1. **Retry Logic**: Tự động retry tối đa 3 lần khi thất bại
2. **Progress Tracking**: Hiển thị tiến trình real-time
3. **Transaction Management**: Rollback khi batch thất bại
4. **Session Management**: Lưu trạng thái để tiếp tục sau

---

**Tài liệu Activity Diagram cho chức năng Thêm Người Dùng**

*Phiên bản: 1.0*  
*Ngày tạo: 19/12/2025*  
*Người tạo: GitHub Copilot*
