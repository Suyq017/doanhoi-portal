# 📋 KẾ HOẠCH TRIỂN KHAI CHỨC NĂNG QUẢN LÝ TỔ CHỨC CÂY PHÂN CẤP

## 🎯 PHÂN TÍCH HIỆN TRẠNG VÀ YÊU CẦU

### **Current State Analysis:**

**Backend đã có sẵn:**
- ✅ `Organization` entity với TreeRepository (closure-table)
- ✅ `OrganizationType` enum với các loại tổ chức  
- ✅ `OrganizationsService` với basic tree operations
- ✅ `OrganizationsController` với CRUD endpoints
- ✅ `UserOrganization` entity cho member management

**Frontend hiện tại:**
- ✅ `OrganizationsPage.tsx` với static tree display
- ✅ Interface `Organization` với children structure
- ✅ Basic expand/collapse functionality
- ❌ Chưa có API integration thực tế
- ❌ Navigation giữa levels chưa optimize
- ❌ Member management chưa hoàn chỉnh

### **Target Requirements:**

**Cấu trúc Đoàn - Hội cần implement:**
```
Quản lý tổ chức
├ Đoàn trường (Level 1)
│       └── Đoàn cơ sở (Level 2) - Đoàn khoa, Đoàn khối
│           └── Chi đoàn (Level 3) - Theo lớp
└ Hội sinh viên trường (Level 1)
        ├── Liên chi hội (Level 2)
        │   └── Chi hội (Level 3) - Theo lớp
        └── CLB/Đội/Nhóm (Level 2) - Cùng cấp với Liên chi hội
```

## 🌲 PHƯƠNG ÁN HIỂN THỊ VÀ ĐIỀU HƯỚNG

### **Cấu trúc điều hướng theo cấp độ:**

**1. Trang chính `/organizations`:**
- Hiển thị: Level 1 và Level 2
- UI: Breadcrumb, tiêu đề "Quản lý Tổ chức"
- Hành động: Nút "Xem chi tiết" ở Level 2 → `/organizations/{type}/{code}`

**2. Trang cấp 2 `/organizations/{type}/{code}`:**
- Hiển thị: Level 2 được chọn và Level 3 con
- UI: Breadcrumb (Tổ chức > Đoàn khoa), tiêu đề "Quản lý Tổ chức: {Tên Đoàn khoa}"
- Hành động: Nút "Xem chi tiết" ở Level 3 → `/organizations/{type}/{code}/{child-type}/{child-code}`

**3. Trang cấp 3 `/organizations/{type}/{code}/{child-type}/{child-code}`:**
- Hiển thị: Chi tiết Level 3 và danh sách thành viên
- UI: Breadcrumb (Tổ chức > Đoàn khoa > Chi đoàn), tiêu đề "Quản lý Tổ chức: {Tên Đoàn khoa}: {Tên Chi đoàn}"

## 🚀 KẾ HOẠCH TRIỂN KHAI

### **1. Backend Enhancements:**

**API Endpoints cần bổ sung:**
- `GET /organizations/:id/children` - Lấy danh sách tổ chức con trực tiếp
- `GET /organizations/:id/parent` - Lấy tổ chức cha
- `GET /organizations/:id/breadcrumb` - Lấy đường dẫn breadcrumb

**Service Methods cần thêm:**
- `findByTypeAndCode(type, code)` - Tìm tổ chức bằng type và code
- `findChildren(id)` - Lấy tổ chức con trực tiếp
- `findParent(id)` - Lấy tổ chức cha
- `getBreadcrumb(id)` - Lấy đường dẫn breadcrumb

### **2. Frontend Implementation:**

**File Structure:**
```
features/
  └── organizations/
      ├── pages/
      │   ├── OrganizationsPage.tsx         # Trang chính (Level 1-2)
      │   ├── OrganizationDetailPage.tsx    # Trang cấp 2 (Level 2-3)
      │   └── OrganizationSubDetailPage.tsx # Trang cấp 3 (Level 3)
      ├── components/
      │   ├── OrganizationTree.tsx          # Component hiển thị cây
      │   ├── OrganizationBreadcrumb.tsx    # Component breadcrumb
      │   └── ViewDetailButton.tsx          # Nút xem chi tiết      └── utils/
          └── organization-path.ts               # Utility xử lý type/code path
```

**Router Configuration:**
```
/organizations                          → OrganizationsPage
/organizations/:type/:code              → OrganizationDetailPage
/organizations/:type/:code/:childType/:childCode → OrganizationSubDetailPage
```

## 📊 API UTILIZATION

### **API Hiện Có:**

| API | Method | Sử dụng |
|-----|--------|---------|
| `/organizations/tree` | GET | Trang chính - Lấy cây tổ chức |
| `/organizations/:id` | GET | Trang chi tiết - Lấy thông tin tổ chức |
| `/organizations/:id/members` | GET | Trang chi tiết - Lấy thành viên |

### **API Đã Bổ Sung:**

| API | Method | Mục đích |
|-----|--------|----------|
| `/organizations/by-type-code/:type/:code` | GET | Chuyển đổi type/code → ID |
| `/organizations/:id/children` | GET | Lấy tổ chức con trực tiếp |
| `/organizations/:id/parent` | GET | Lấy tổ chức cha |
| `/organizations/:id/breadcrumb` | GET | Lấy đường dẫn breadcrumb |

## 📝 TRIỂN KHAI

### **1. Quy trình làm việc và thứ tự thực hiện:**

1. **Backend:**
   - Bước 1: Triển khai các service methods (findByTypeAndCode, findChildren, findParent, getBreadcrumb)
   - Bước 2: Triển khai API endpoints mới (by-type-code, children, parent, breadcrumb)
   - Bước 3: Viết tests cho API
   - Bước 4: Tạo Swagger documentation đầy đủ

2. **Frontend:**
   - Bước 1: Tạo utility xử lý type/code path
   - Bước 2: Tạo shared components (OrganizationTree, OrganizationBreadcrumb)
   - Bước 3: Cập nhật router configuration
   - Bước 4: Triển khai OrganizationsPage (Level 1-2)
   - Bước 5: Triển khai OrganizationDetailPage (Level 2-3)
   - Bước 6: Triển khai OrganizationSubDetailPage (Level 3)
   - Bước 7: Tích hợp translations

### **2. Kỹ thuật xử lý type/code path:**
- Sử dụng type và code có sẵn trong dữ liệu từ API
- Tạo URL path dạng `/organizations/{type}/{code}`
- Dùng hàm utility thống nhất ở cả backend và frontend để xử lý chuyển đổi type/code → ID

### **3. Translation Implementation:**

**Translation Keys cho Organizations:**
```typescript
// organizations.json
{
  // Chỉ định nghĩa keys đặc thù cho Organizations

}
```

**Sử dụng Common Keys:**
```typescript
// Component sử dụng multiple namespaces
const { t } = useTranslation(['organizations', 'common']);

// Dùng common keys cho actions, status, v.v.
<Button>{t('common:actions.view_details')}</Button>
<Button>{t('common:actions.add_member')}</Button>

// Chỉ dùng organizations namespace cho nội dung đặc thù
<h1>{t('organizations:title')}</h1>
<span>{t(`organizations:org_types.${org.type}`)}</span>
```

## 🚩 LƯU Ý QUAN TRỌNG

1. **Performance:**
   - Tìm kiếm bằng type và code nhanh hơn slug
   - Cần đánh index trên cột type và code để tối ưu

2. **UX:**
   - Breadcrumb và navigation phải nhất quán
   - Chuyển đổi giữa các cấp độ phải mượt mà
   - URL có ý nghĩa rõ ràng với type/code


### **Translation Keys - TUYỆT ĐỐI KHÔNG VI PHẠM:**
- ❌ **KHÔNG** tạo duplicate keys (save, cancel, loading, etc.)
- ✅ **CHỈ** tạo keys đặc thù cho organizations
- ✅ **SỬ DỤNG** common keys cho tất cả actions, states, messages chung
- ✅ **TUÂN THỦ** naming convention đã tối ưu

### **Code Pattern cho Translations:**
```typescript
// Component sử dụng multiple namespaces
const { t } = useTranslation(['organizations', 'common']);

// ĐÚNG: Dùng common keys cho actions chung
return (
  <>
    <Button>{t('common:actions.save')}</Button>
    <span>{t('common:statuses.loading')}</span>
    
    {/* ĐÚNG: Chỉ dùng namespace riêng cho nội dung đặc thù */}
    <h1>{t('organizations:title')}</h1>
    <span>{t(`organizations:org_types.${org.type}`)}</span>
  </>
);

// SAI: Tạo duplicate keys
// ❌ organizations:actions.save - KHÔNG TẠO KEY NÀY
// ❌ organizations:loading - KHÔNG TẠO KEY NÀY
```


