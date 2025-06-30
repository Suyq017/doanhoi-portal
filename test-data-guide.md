# Test Data for Department Import Demo

Tôi đã hoàn thành việc cài đặt chức năng import modal cho Departments với server-side processing. Để tạo file test data Excel, bạn có thể:

## Cách tạo file test data:

1. **Sử dụng endpoint template để tải file mẫu:**
   - Truy cập: `http://localhost:9200/departments/template`
   - File sẽ được tạo với header và một số dòng demo

2. **Hoặc tạo file Excel thủ công với cấu trúc:**

### Cấu trúc file Excel cần có:
- **Sheet name**: "Departments" (hoặc bất kỳ tên nào)
- **Headers (dòng 1)**: 
  - Tên đơn vị
  - Mã đơn vị  
  - Mô tả

### Dữ liệu mẫu (từ dòng 2 trở đi):
```
Khoa Khoa học máy tính | CSE | Khoa đào tạo về công nghệ thông tin và khoa học máy tính
Khoa Điện tử | EE | Khoa đào tạo về kỹ thuật điện tử và viễn thông
Khoa Cơ khí | ME | Khoa đào tạo về kỹ thuật cơ khí và chế tạo máy
Khoa Kinh tế | ECO | Khoa đào tạo về kinh tế và quản trị kinh doanh
Phòng Đào tạo | EDU | Phòng quản lý các hoạt động đào tạo
Phòng Khoa học công nghệ | RND | Phòng quản lý nghiên cứu và phát triển
```

### Test cases nên bao gồm:
- **Valid data**: Dữ liệu hợp lệ
- **Invalid data**: Tên đơn vị trống, mã quá dài
- **Duplicate data**: Trùng tên hoặc mã đơn vị
- **Conflict data**: Tên/mã đã tồn tại trong database

Bạn có thể tạo file Excel này và test import functionality!
