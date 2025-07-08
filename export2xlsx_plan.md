# Kế hoạch Xuất Dữ liệu ra File XLSX

## Tổng quan
Hiện thực chức năng xuất danh sách member của một organization ra file XLSX, có thể tái sử dụng cho các loại dữ liệu khác trong tương lai.

## Phase 1: Frontend Development

### 1.1 Tạo Component Export Modal
- Tạo component `ExportModal` có thể tái sử dụng
- Modal sẽ hiển thị danh sách các trường có thể xuất
- Người dùng có thể chọn/bỏ chọn các trường muốn xuất
- Hỗ trợ chọn tất cả/bỏ chọn tất cả
- Validation để đảm bảo ít nhất một trường được chọn

### 1.2 Định nghĩa Export Fields
Tạo danh sách các trường có thể xuất cho User:
- Thông tin cơ bản: Code, Family Name, Given Name, Full Name, Email, Phone
- Thông tin học tập: Management Department, Training Department, Class
- Thông tin tổ chức: User Type, Membership Status
- Thông tin thời gian: Created At, Updated At

### 1.3 Tích hợp Export Button
- Thêm nút "Xuất dữ liệu" vào dropdown trong trang organization level 3
- Thêm nút "Xuất dữ liệu" vào dropdown trong trang user
- Nút sẽ mở ExportModal khi được click

### 1.4 State Management
- Quản lý trạng thái loading khi xuất file
- Quản lý trạng thái lỗi nếu xuất file thất bại
- Quản lý danh sách trường được chọn

### 1.5 Export Service
- Tạo service để gọi API xuất file
- Xử lý response từ backend (file stream)
- Tự động download file về máy người dùng
- Hiển thị thông báo thành công/thất bại

## Phase 2: Backend Development

### 2.1 Cài đặt Dependencies
- Cài đặt thư viện xử lý Excel (xlsx, exceljs hoặc tương tự)
- Cập nhật package.json với dependency mới

### 2.2 Tạo Export Service
- Tạo `ExportService` chuyên xử lý xuất file
- Implement method xuất danh sách user ra XLSX
- Hỗ trợ filter theo organizationId
- Hỗ trợ chọn các trường muốn xuất

### 2.3 Tạo Export Controller
- Tạo endpoint GET `/organizations/{id}/export/members`
- Tạo endpoint GET `/users/export`
- Validate input parameters
- Trả về file stream với proper headers

### 2.4 Tạo Export DTOs
- Tạo DTO cho request xuất file (danh sách trường muốn xuất)
- Tạo DTO cho response (thông tin file)
- Validation cho các trường hợp lệ

### 2.5 Database Query Optimization
- Tối ưu query để lấy dữ liệu user với các relation cần thiết
- Sử dụng join thay vì N+1 query
- Hỗ trợ pagination nếu dữ liệu lớn

### 2.6 File Generation Logic
- Tạo Excel workbook với header phù hợp
- Map dữ liệu từ database sang Excel rows
- Xử lý các trường null/undefined
- Format dữ liệu (ngày tháng, số điện thoại, v.v.)

### 2.7 Error Handling
- Xử lý lỗi khi không tìm thấy organization
- Xử lý lỗi khi không có dữ liệu để xuất
- Xử lý lỗi khi tạo file thất bại
- Trả về error response phù hợp

## Cấu trúc File và Folder

### Frontend
```
src/
├── components/
│   └── export/
│       ├── ExportModal.tsx
│       ├── ExportFieldSelector.tsx
│       └── index.ts
├── services/
│   └── exportService.ts
├── types/
│   └── export.types.ts
└── hooks/
    └── useExport.ts
```

### Backend
```
src/
├── export/
│   ├── export.module.ts
│   ├── export.service.ts
│   ├── export.controller.ts
│   └── dto/
│       ├── export-request.dto.ts
│       └── export-response.dto.ts
└── common/
    └── types/
        └── export.types.ts
```

## Luồng Hoạt động

### Frontend Flow
1. User click nút "Xuất dữ liệu" → Mở ExportModal
2. User chọn các trường muốn xuất → Validate selection
3. User click "Xuất file" → Gọi API với danh sách trường
4. Nhận response → Tự động download file
5. Hiển thị thông báo thành công/thất bại

### Backend Flow
1. Nhận request với organizationId và danh sách trường
2. Validate input parameters
3. Query database để lấy danh sách user
4. Tạo Excel file với các trường được chọn
5. Trả về file stream với proper headers

## Tính năng Mở rộng (Tương lai)
- Hỗ trợ xuất nhiều định dạng file (CSV, PDF)
- Hỗ trợ xuất theo template có sẵn
- Hỗ trợ lọc dữ liệu trước khi xuất
- Hỗ trợ xuất dữ liệu các entity khác (Department, Class, Organization)
- Hỗ trợ xuất theo lịch trình (scheduled export)

## Ưu tiên Phát triển
1. **✅ HOÀN THÀNH**: Tạo ExportModal component và tích hợp vào UI
2. **✅ HOÀN THÀNH**: Implement backend service xuất User list
3. **✅ HOÀN THÀNH**: Tích hợp export vào trang Users
4. **✅ HOÀN THÀNH**: Tích hợp export vào trang Organizations level 3
5. **Trung bình**: Tối ưu performance cho dữ liệu lớn
6. **Thấp**: Các tính năng mở rộng và customization

## Trạng thái Thực hiện

### ✅ Phase 1: Frontend Development - HOÀN THÀNH
- ✅ ExportModal component có thể tái sử dụng
- ✅ ExportFieldSelector component  
- ✅ Export types và USER_EXPORT_FIELDS
- ✅ Export service gọi API
- ✅ Export hook quản lý state
- ✅ Tích hợp vào Users page dropdown
- ✅ Tích hợp vào Organizations level 3 dropdown

### ✅ Phase 2: Backend Development - HOÀN THÀNH  
- ✅ Export service với Excel generation
- ✅ Export controller với REST endpoints
- ✅ Export DTOs với validation
- ✅ Database query optimization
- ✅ File generation logic với formatting
- ✅ Error handling
- ✅ Module integration

### 🚀 Hệ thống Export đã sẵn sàng sử dụng!

**API Endpoints:**
- `POST /api/export/users` - Xuất danh sách người dùng
- `POST /api/export/organizations/{id}/members` - Xuất danh sách thành viên tổ chức

**Cách sử dụng:**
1. Vào trang Users hoặc trang Organizations level 3
2. Click dropdown button
3. Chọn "Xuất dữ liệu"
4. Chọn các trường muốn xuất trong modal
5. Click "Xuất file" để download