Tôi sẽ phân tích cấu trúc hiện tại và lên kế hoạch thực hiện chức năng Class dựa trên cách làm của Users và Departments, đồng thời tuân thủ chiến lược translation keys đã được tối ưu. Dựa trên phân tích cấu trúc hiện tại và chiến lược translation đã được tối ưu, tôi sẽ lên kế hoạch chi tiết để thực hiện chức năng Class. Đây là kế hoạch tổng thể:

# 📋 KẾ HOẠCH THỰC HIỆN CHỨC NĂNG CLASS

## 🎯 PHÂN TÍCH THAM KHẢO TỪ USERS & DEPARTMENTS

Từ việc tham khảo cấu trúc users và departments, tôi thấy pattern sau:

**Backend (NestJS):**
- Controller: CRUD operations với Swagger documentation
- Service: Business logic với TypeORM repository  
- DTOs: Create, Update, Query với validation
- Module: Import TypeORM entities và export service
- Entity: Đã có sẵn Class entity

**Frontend (React + TypeScript):**
- Page component: Quản lý state, pagination, filtering
- Service: API calls với error handling
- Components: Modal cho Create/Edit/View/Delete
- i18n: Tuân thủ translation strategy đã tối ưu

## 🗂️ CẤU TRÚC FILES CẦN TẠO

### **Backend - classes/**
```
backend/src/classes/
├── classes.controller.ts              # ❌ CRUD endpoints 
├── classes.service.ts                 # ❌ Business logic
├── classes.module.ts                  # ❌ Module configuration
└── dto/
    ├── create-class.dto.ts            # ❌ Create DTO
    ├── update-class.dto.ts            # ❌ Update DTO  
    └── query-class.dto.ts             # ❌ Query DTO với pagination
```

### **Frontend - classes/**
```
frontend/src/features/classes/
├── index.ts                           # ❌ Export barrel
├── ClassesPage.tsx                    # ❌ Main page component
└── components/
    ├── CreateClassModal.tsx           # ❌ Create modal
    ├── EditClassModal.tsx             # ❌ Edit modal
    ├── ViewClassModal.tsx             # ❌ View modal  
    └── DeleteConfirmModal.tsx         # ❌ Delete confirmation
```

### **Services & i18n**
```
frontend/src/shared/services/
└── classService.ts                    # ❌ API service

frontend/public/locales/
├── vi/classes.json                    # ❌ Vietnamese translations
└── en/classes.json                    # ❌ English translations  
```

## 🔧 CHI TIẾT IMPLEMENTATION

### **1. Backend Implementation**

**classes.controller.ts:**
- `POST /classes` - Tạo class mới
- `GET /classes` - Lấy danh sách với pagination & filtering  
- `GET /classes/:id` - Lấy chi tiết class
- `PATCH /classes/:id` - Cập nhật class
- `DELETE /classes/:id` - Xóa class

**classes.service.ts:**
- Validation business logic
- TypeORM query với relations (Department, Students)
- Error handling (NotFoundException, BadRequestException)
- Pagination logic tương tự users/departments

**DTOs cần tạo:**
- `CreateClassDto` - name, code, year, departmentId, isActive
- `UpdateClassDto` - extends PartialType(CreateClassDto)  
- `QueryClassDto` - page, limit, search, year, departmentId, isActive filter

### **2. Frontend Implementation**

**ClassesPage.tsx features:**
- State management cho danh sách classes
- Search & filtering (name, code, year, department, isActive)
- Pagination với prev/next buttons
- CRUD operations với modals
- Loading states & error handling
- Toast notifications

**API Service:**
```typescript
interface Class {
  id: string;
  name: string;
  code?: string;
  year?: number;
  department?: Department;
  students?: User[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Modal Components:**
- Form validation với react-hook-form hoặc vanilla validation
- Loading states cho async operations
- Error handling và user feedback

## 🎛️ FEATURES CHÍNH

- ✅ **CRUD Operations** - Create, Read, Update, Delete
- ✅ **Search & Filter** - Theo name, code, year, department, isActive status
- ✅ **Pagination** - Với prev/next navigation
- ✅ **Data Validation** - Backend & frontend validation
- ✅ **Error Handling** - Proper error messages & loading states
- ✅ **Responsive Design** - Mobile-friendly UI
- ✅ **i18n Support** - Vietnamese & English (tuân thủ translation strategy)
- ✅ **Toast Notifications** - Success/error feedback
- ✅ **Relations** - Hiển thị department và student count

## 🌐 TRANSLATION STRATEGY (QUAN TRỌNG)

### **Tuân thủ chiến lược đã tối ưu:**

**SỬ DỤNG COMMON KEYS:**
```typescript
// ĐÚNG - Dùng common keys
t('common:actions.save')
t('common:actions.cancel') 
t('common:states.loading')
t('common:messages.success.create')
t('common:messages.error.load')
t('common:pagination.showing', { start: 1, end: 10, total: 100 })
t('common:validation.required', { field: t('common:fields.name') })
```

**CHỈ TẠO KEYS ĐẶC THÙ CHO CLASSES:**
```json
// classes.json - CHỈ keys đặc thù
{
  "title": "Quản lý Lớp học",
  "subtitle": "Quản lý thông tin lớp học và sinh viên",
  "titles": {
    "create": "Thêm lớp học mới",
    "edit": "Chỉnh sửa thông tin lớp học", 
    "view": "Thông tin chi tiết lớp học"
  },
  "fields": {
    "year": "Năm học",
    "studentCount": "Số sinh viên"
  },
  "placeholders": {
    "name": "Ví dụ: Kỹ thuật phần mềm K19",
    "code": "Ví dụ: KTPM_K19",
    "year": "Ví dụ: 2024"
  },
  "labels": {
    "classInfo": "Thông tin lớp học",
    "studentList": "Danh sách sinh viên"
  }
}
```

## 🔄 THỨ TỰ THỰC HIỆN

### **Phase 1: Backend Setup** (Ưu tiên cao)
1. Tạo `classes.module.ts`
2. Tạo DTOs: `create-class.dto.ts`, `update-class.dto.ts`, `query-class.dto.ts`
3. Tạo `classes.service.ts` với business logic
4. Tạo `classes.controller.ts` với CRUD endpoints
5. Đăng ký module trong app.module.ts

### **Phase 2: Frontend Service Layer**
1. Tạo `classService.ts` với API calls
2. Định nghĩa interfaces cho Class, CreateClassRequest, etc.
3. Export trong index.ts

### **Phase 3: Frontend UI Components**  
1. Tạo `ClassesPage.tsx` với basic layout
2. Tạo các modal components (Create/Edit/View/Delete)
3. Tích hợp với classService
4. State management và error handling

### **Phase 4: i18n & Translation**
1. Tạo `classes.json` (vi/en) với CHỈ keys đặc thú
2. Sử dụng common keys cho actions, states, messages
3. Update navigation trong common.json
4. Testing translation keys

### **Phase 5: Testing & Polish**
1. Test các CRUD operations
2. Test pagination và filtering
3. Test responsive design
4. Bug fixes và UI/UX improvements

## 🚨 LƯU Ý QUAN TRỌNG

### **Translation Keys - TUYỆT ĐỐI KHÔNG VI PHẠM:**
- ❌ **KHÔNG** tạo duplicate keys (save, cancel, loading, etc.)
- ✅ **CHỈ** tạo keys đặc thù cho classes
- ✅ **SỬ DỤNG** common keys cho tất cả actions, states, messages chung
- ✅ **TUÂN THỦ** naming convention đã tối ưu

### **Code Pattern:**
```typescript
// Component sử dụng multiple namespaces
const { t } = useTranslation(['classes', 'common']);

// Mixed usage  
<h2>{t('classes:titles.create')}</h2>
<Button onClick={handleSave}>{t('common:actions.save')}</Button>
<div>{t('common:states.loading')}</div>
```

### **API Pattern:**
- Tuân theo exact pattern của users/departments
- Consistent error handling
- Swagger documentation đầy đủ
- Validation với class-validator

## 📊 EXPECTED OUTCOMES

- **Consistent codebase** với users/departments
- **70% reduction** duplicate translation keys
- **Scalable architecture** dễ maintain
- **Full CRUD functionality** cho class management
- **Responsive UI/UX** cho tất cả devices
- **Multi-language support** với optimized translation structure

Kế hoạch này đảm bảo tính nhất quán với codebase hiện tại và tuân thủ nghiêm ngặt chiến lược translation đã được tối ưu, tránh làm rối loạn translation keys.