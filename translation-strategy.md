# Chiến lược tối ưu Translation Keys

## 1. Cấu trúc Common Keys

### A. Actions (Hành động cơ bản)
```json
{
  "actions": {
    "create": "Tạo mới",
    "add": "Thêm",
    "edit": "Chỉnh sửa", 
    "update": "Cập nhật",
    "delete": "Xóa",
    "view": "Xem",
    "save": "Lưu",
    "cancel": "Hủy",
    "close": "Đóng",
    "confirm": "Xác nhận",
    "submit": "Gửi",
    "search": "Tìm kiếm",
    "filter": "Lọc",
    "clear": "Xóa",
    "refresh": "Làm mới",
    "retry": "Thử lại",
    "back": "Quay lại",
    "next": "Tiếp theo",
    "previous": "Trước"
  }
}
```

### B. States (Trạng thái)
```json
{
  "states": {
    "loading": "Đang tải...",
    "saving": "Đang lưu...",
    "creating": "Đang tạo...",
    "updating": "Đang cập nhật...",
    "deleting": "Đang xóa...",
    "processing": "Đang xử lý..."
  }
}
```

### C. Messages (Thông báo chung)
```json
{
  "messages": {
    "success": {
      "create": "Tạo thành công",
      "update": "Cập nhật thành công", 
      "delete": "Xóa thành công",
      "save": "Lưu thành công"
    },
    "error": {
      "create": "Có lỗi xảy ra khi tạo",
      "update": "Có lỗi xảy ra khi cập nhật",
      "delete": "Có lỗi xảy ra khi xóa",
      "load": "Có lỗi xảy ra khi tải dữ liệu",
      "network": "Lỗi kết nối mạng",
      "unknown": "Đã có lỗi xảy ra"
    },
    "confirm": {
      "delete": "Bạn có chắc chắn muốn xóa không?",
      "deleteWarning": "Hành động này không thể hoàn tác."
    },
    "empty": {
      "noData": "Không có dữ liệu",
      "noResults": "Không tìm thấy kết quả nào"
    }
  }
}
```

### D. Pagination (Phân trang chung)
```json
{
  "pagination": {
    "showing": "Hiển thị {{start}} - {{end}} của {{total}} kết quả",
    "previous": "Trước",
    "next": "Tiếp theo", 
    "page": "Trang {{current}} / {{total}}",
    "itemsPerPage": "{{count}} mục/trang"
  }
}
```

### E. Validation (Kiểm tra chung)
```json
{
  "validation": {
    "required": "{{field}} là bắt buộc",
    "minLength": "{{field}} phải có ít nhất {{min}} ký tự",
    "maxLength": "{{field}} không được vượt quá {{max}} ký tự",
    "email": "Email không hợp lệ",
    "phone": "Số điện thoại không hợp lệ",
    "duplicate": "{{field}} đã tồn tại"
  }
}
```

### F. Form Fields (Trường form chung)
```json
{
  "fields": {
    "name": "Tên",
    "code": "Mã",
    "description": "Mô tả",
    "email": "Email",
    "phone": "Số điện thoại",
    "status": "Trạng thái",
    "createdAt": "Ngày tạo",
    "updatedAt": "Cập nhật lần cuối",
    "actions": "Thao tác"
  }
}
```

## 2. Quy tắc cho Features

### A. Chỉ override khi cần thiết
Features chỉ nên define keys riêng khi:
- Có nghĩa đặc biệt cho domain đó
- Cần context cụ thể
- Không thể dùng common key

### B. Cấu trúc Feature keys
```json
{
  "title": "Tiêu đề chính",
  "subtitle": "Mô tả ngắn",
  "fields": {
    // Chỉ fields đặc thù
    "specificField": "Trường đặc biệt"
  },
  "labels": {
    // Labels đặc thù
    "specificLabel": "Nhãn đặc biệt"  
  },
  "messages": {
    // Messages đặc thù
    "specificMessage": "Thông báo đặc biệt"
  }
}
```

### C. Cách sử dụng
```typescript
// Thay vì
t('users.buttons.save')
t('departments.buttons.save')

// Dùng
t('common.actions.save')

// Thay vì
t('users.messages.loadError')
t('departments.messages.loadError')

// Dùng  
t('common.messages.error.load')

// Thay vì
t('users.validation.required', { field: 'Tên' })
t('departments.validation.required', { field: 'Tên' })

// Dùng
t('common.validation.required', { field: t('common.fields.name') })
```

## 3. Migration Plan

### Phase 1: Tái cấu trúc common.json
1. Tạo cấu trúc mới trong common.json
2. Di chuyển các keys trùng lặp
3. Chuẩn hóa naming convention

### Phase 2: Cập nhật feature files
1. Xóa các keys trùng lặp
2. Chỉ giữ lại keys đặc thù
3. Refactor messages, validation, pagination

### Phase 3: Cập nhật code
1. Cập nhật các component sử dụng translation
2. Thay đổi từ feature keys sang common keys
3. Test và validate

### Phase 4: Cleanup
1. Xóa keys không sử dụng
2. Đảm bảo consistency
3. Document quy tắc mới

## 4. Benefits

- **Giảm 60-70% keys trùng lặp**
- **Dễ maintain và scale**
- **Consistency across features**
- **Faster development**
- **Smaller bundle size**
