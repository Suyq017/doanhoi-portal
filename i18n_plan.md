Tôi sẽ phân tích cấu trúc ứng dụng và đưa ra kế hoạch chi tiết để chuyển đổi toàn bộ ứng dụng thành dạng song ngữ Anh - Việt. Dựa trên việc phân tích cấu trúc ứng dụng và các file hiện có, tôi sẽ lên kế hoạch chi tiết để chuyển đổi toàn bộ ứng dụng thành dạng song ngữ Anh - Việt:

# KẾ HOẠCH CHUYỂN ĐỔI ỨNG DỤNG THÀNH SONG NGỮ ANH - VIỆT

## 1. PHÂN TÍCH HIỆN TRẠNG

### Frontend (React)
- **Ngôn ngữ hiện tại**: Toàn bộ tiếng Việt
- **Các thành phần cần i18n**:
  - Layout và Navigation (Trang chủ, Người dùng, Tổ chức)
  - Forms và Labels (Thêm/Sửa/Xóa người dùng)
  - Messages và Notifications (Thông báo lỗi, thành công)
  - Tables và Data Display
  - Buttons và Actions
  - Validation Messages

### Backend (NestJS)
- **API Responses**: Cần hỗ trợ đa ngôn ngữ
- **Validation Messages**: Hiện tại bằng tiếng Việt
- **Error Messages**: Cần đa ngôn ngữ
- **Documentation**: Swagger cần hỗ trợ song ngữ

## 2. CHIẾN LƯỢC THỰC HIỆN

### 2.1 Thư viện Internationalization
**Frontend:**
- `react-i18next` - thư viện i18n phổ biến cho React
- `i18next-browser-languagedetector` - tự động phát hiện ngôn ngữ
- `i18next-http-backend` - load translation files

**Backend:**
- `nestjs-i18n` - thư viện i18n cho NestJS
- `i18n-json-v4` - format chuẩn cho translation files

### 2.2 Cấu trúc thư mục
```
frontend/src/
├── locales/
│   ├── en/
│   │   ├── common.json
│   │   ├── users.json
│   │   ├── organizations.json
│   │   ├── dashboard.json
│   │   └── validation.json
│   └── vi/
│       ├── common.json
│       ├── users.json
│       ├── organizations.json
│       ├── dashboard.json
│       └── validation.json

backend/src/
├── i18n/
│   ├── en/
│   │   ├── users.json
│   │   ├── organizations.json
│   │   └── validation.json
│   └── vi/
│       ├── users.json
│       ├── organizations.json
│       └── validation.json
```

## 3. KẾ HOẠCH TRIỂN KHAI

### GIAI ĐOẠN 1: SETUP CƠ BẢN (2-3 ngày)

#### Frontend Setup
1. **Cài đặt dependencies**
   ```bash
   npm install react-i18next i18next i18next-browser-languagedetector i18next-http-backend
   ```

2. **Cấu hình i18next** (`src/i18n/index.ts`)
   - Setup i18next với English và Vietnamese
   - Cấu hình language detection
   - Setup loading translation files

3. **Tạo translation files cơ bản**
   - `locales/en/common.json` - các từ chung
   - `locales/vi/common.json` - bản dịch tiếng Việt
   - Bao gồm: navigation, buttons, common actions

4. **Tích hợp vào App.tsx**
   - Wrap App với `I18nextProvider`
   - Thêm loading state cho translations

#### Backend Setup
1. **Cài đặt dependencies**
   ```bash
   npm install nestjs-i18n class-validator-i18n
   ```

2. **Cấu hình I18nModule** trong `app.module.ts`
   - Setup path cho translation files
   - Cấu hình default language
   - Setup header detection

3. **Tạo translation files backend**
   - `i18n/en/validation.json`
   - `i18n/vi/validation.json`

### GIAI ĐOẠN 2: CHUYỂN ĐỔI NAVIGATION & LAYOUT (1 ngày)

#### Files cần cập nhật:
1. **Layout.tsx**
   - Chuyển đổi navigation items
   - Thêm language switcher
   - Header title và footer

2. **Translation keys cần thiết**:
   ```json
   // common.json
   {
     "navigation": {
       "dashboard": "Dashboard",
       "users": "Users", 
       "organizations": "Organizations"
     },
     "common": {
       "loading": "Loading...",
       "error": "Error",
       "success": "Success"
     }
   }
   ```

### GIAI ĐOẠN 3: CHUYỂN ĐỔI USERS MODULE (2-3 ngày)

#### 3.1 UsersPage.tsx
- Table headers và columns
- Search placeholders
- Filter options
- Pagination text
- Action buttons (View, Edit, Delete)

#### 3.2 User Modals
**CreateUserModal.tsx:**
- Form labels
- Validation messages
- Button texts
- Placeholders

**EditUserModal.tsx:**
- Tương tự CreateUserModal
- Update messages

**ViewUserModal.tsx:**
- Field labels
- Status display texts

**DeleteConfirmModal.tsx:**
- Confirmation messages
- Warning texts

#### 3.3 Translation files
```json
// users.json
{
  "title": "User Management",
  "subtitle": "Manage members, students and staff information",
  "addUser": "Add User",
  "editUser": "Edit User",
  "deleteUser": "Delete User",
  "userInfo": "User Information",
  "actions": {
    "view": "View",
    "edit": "Edit", 
    "delete": "Delete"
  },
  "fields": {
    "code": "ID Code",
    "familyName": "Family Name",
    "givenName": "Given Name",
    "email": "Email",
    "phone": "Phone"
  },
  "userTypes": {
    "student": "Student",
    "staff": "Staff"
  },
  "membershipStatus": {
    "none": "Not Participated",
    "doan_vien": "Youth Union Member",
    "hoi_vien": "Student Association Member",
    "both": "Both Memberships"
  }
}
```

### GIAI ĐOẠN 4: CHUYỂN ĐỔI ORGANIZATIONS MODULE (1-2 ngày)

#### OrganizationsPage.tsx
- Tương tự Users module
- Organization-specific terms
- Structure và hierarchy terms

### GIAI ĐOẠN 5: CHUYỂN ĐỔI DASHBOARD (1 ngày)

#### DashboardPage.tsx
- Statistics labels
- Quick actions
- Recent activities
- Chart và graph labels

### GIAI ĐOẠN 6: BACKEND INTERNATIONALIZATION (2 ngày)

#### 6.1 Controller Updates
- Thêm `@I18n()` decorator vào controllers
- Update response messages

#### 6.2 Validation Messages
- Cập nhật DTO validation messages
- Sử dụng i18n keys thay vì hardcode

#### 6.3 Error Handling
- Tạo custom exception filter với i18n
- Translate error messages

### GIAI ĐOẠN 7: LANGUAGE SWITCHER & UX (1 ngày)

#### 7.1 Language Switcher Component
- Dropdown với EN/VI options
- Lưu preference vào localStorage
- Icon flags hoặc text labels

#### 7.2 URL Handling
- Optional: URL prefix `/en/` hoặc `/vi/`
- Browser language detection
- Fallback handling

#### 7.3 Date/Time Formatting
- Locale-specific date formats
- Vietnamese: dd/mm/yyyy
- English: mm/dd/yyyy or dd/mm/yyyy

### GIAI ĐOẠN 8: TESTING & REFINEMENT (2 ngày)

#### 8.1 Translation Completeness
- Đảm bảo tất cả strings đã được translate
- Kiểm tra missing keys
- Context appropriateness

#### 8.2 UX Testing
- Language switching flow
- Text overflow issues
- Layout adjustments cho text length khác nhau

#### 8.3 Performance
- Lazy loading translations
- Caching strategies
- Bundle size optimization

## 4. TRANSLATION STRATEGY

### 4.1 Key Naming Convention
```
module.component.element.state
// Ví dụ:
users.modal.create.title
users.table.headers.email
common.buttons.save
validation.required.field
```

### 4.2 Context-Specific Translations
- **Technical terms**: Giữ nguyên hoặc song song
  - "Database" = "Cơ sở dữ liệu"
  - "API" = "API"
  
- **Domain-specific**: Dịch phù hợp
  - "Đoàn viên" = "Youth Union Member"  
  - "Hội viên" = "Student Association Member"

### 4.3 Pluralization Handling
```json
{
  "user": {
    "zero": "No users",
    "one": "{{count}} user", 
    "other": "{{count}} users"
  }
}
```

## 5. TECHNICAL CONSIDERATIONS

### 5.1 Bundle Size Management
- Lazy load translation namespaces
- Split translations by routes
- Only load active language

### 5.2 SEO & Accessibility
- `lang` attribute updates
- Meta tags translation
- Screen reader compatibility

### 5.3 Maintenance Strategy
- Translation key validation
- Missing translation detection
- Automated translation suggestions

## 6. TIMELINE TỔNG QUAN

```
Tuần 1:
- Ngày 1-3: Giai đoạn 1 (Setup)
- Ngày 4: Giai đoạn 2 (Navigation)
- Ngày 5: Bắt đầu Giai đoạn 3

Tuần 2:  
- Ngày 1-3: Hoàn thành Giai đoạn 3 (Users)
- Ngày 4-5: Giai đoạn 4 (Organizations)

Tuần 3:
- Ngày 1: Giai đoạn 5 (Dashboard)  
- Ngày 2-3: Giai đoạn 6 (Backend)
- Ngày 4: Giai đoạn 7 (Language Switcher)
- Ngày 5: Giai đoạn 8 (Testing)
```

**Tổng thời gian dự kiến: 15 ngày làm việc (3 tuần)**

## 7. DELIVERABLES

1. **Codebase hoàn chỉnh** với i18n support
2. **Translation files** đầy đủ EN/VI
3. **Language switcher** component
4. **Documentation** về cách thêm translations mới
5. **Testing checklist** cho đa ngôn ngữ
6. **Performance report** về impact của i18n

Kế hoạch này đảm bảo chuyển đổi có hệ thống, dễ maintain và không gây gián đoạn lớn đến development workflow hiện tại.