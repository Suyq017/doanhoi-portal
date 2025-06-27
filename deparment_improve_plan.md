## **KẾ HOẠCH THỰC HIỆN CẢI TIẾN "QUẢN LÝ ĐƠN VỊ" - PHIÊN BẢN HOÀN CHỈNH**

### **🎯 MỤC TIÊU**
- **Gộp nút "Thêm Mới"**: Tạo dropdown button với 2 lựa chọn
- Cải tiến tính năng import: template `.xlsx`, UI drag-drop, link "tại đây"
- Tuân thủ **TUYỆT ĐỐI** Translation Strategy (không duplicate keys)

---

### **📋 DANH SÁCH CÔNG VIỆC**

#### **1. TRANSLATION CLEANUP**
- ✅ Audit departments.json - xóa tất cả duplicate keys
- ✅ Thêm keys cho dropdown button:
  - `addButton.dropdown`: "Thêm đơn vị"
  - `addButton.single`: "Thêm từng đơn vị" 
  - `addButton.fromFile`: "Thêm từ file"
- ✅ Chỉ giữ keys đặc thù cho departments
- ✅ Verify common.json đã đủ keys cần thiết

#### **2. BACKEND FIXES**
- ✅ Tạo/cập nhật `.env` với API URLs
- ✅ Sửa endpoint `/departments/template` trả về `.xlsx`
- ✅ Test template download

#### **3. FRONTEND COMPONENTS**

##### **3.1 Tạo Dropdown Button Component**
- ✅ Tạo `AddDepartmentButton` shared component phải có khả năng tái sử dụng
- ✅ **Chức năng dropdown**:
  - Nút chính hiển thị "Thêm đơn vị"
  - Click để mở dropdown menu
  - 2 options: "Thêm từng đơn vị" và "Thêm từ file"
- ✅ **UI/UX Requirements**:
  - Responsive design
  - Hover effects
  - Loading states
  - Icon cho mỗi option
- ✅ **Props Interface**:
  - `onAddSingle`: callback cho tạo thủ công
  - `onAddFromFile`: callback cho import file
  - `loading`: boolean cho loading state

##### **3.2 Cải tiến ImportModal**
- ✅ **Instruction**:
  - Tại instruction số 1 thay "Tải file mẫu Excel và điền đầy đủ thông tin các đơn vị" bằng "Tải file mẫu Excel tại [tại đây](#) và điền đầy đủ thông tin các đơn vị"
  - Link này sẽ dẫn đến file mẫu `.xlsx` thay cho phần template download
- ✅ **Template Download**:
  - Xóa toàn bộ phần này
- ✅ **Drag-Drop Area**:
  - Visual drag-drop zone rõ ràng
  - Chỉ accept `.xlsx` files
  - Feedback khi drag file vào
- ✅ **File Upload**:
  - Reject CSV files
  - Show file validation errors
  - Preview Excel data

#### **4. INTEGRATION**
- ✅ **Update DepartmentsPage.tsx**:
  - Remove 2 separate buttons hiện tại
  - Thay bằng `AddDepartmentButton` component
  - Wire up callbacks cho 2 actions
- ✅ **Update Import Config**:
  - Chỉ accept `.xlsx` files
  - Update template URL từ ENV
- ✅ **Test Integration**:
  - Dropdown hoạt động smooth
  - Callbacks trigger đúng modals
  - Import flow hoàn chỉnh

#### **5. COMPLIANCE CHECK**
- ✅ **Translation Audit**:
  - Scan code tìm duplicate keys
  - Verify pattern: `common:actions.*`, `departments:specific.*`
  - Check multiple namespaces usage
- ✅ **Final QA**:
  - Test all user flows
  - Cross-browser compatibility
  - Mobile responsiveness

---

### **🔧 CHI TIẾT DROPDOWN BUTTON**

#### **Thiết kế UI:**
```
┌─────────────────────────┐
│ 🏢 Thêm đơn vị      ▼  │ ← Main button
└─────────────────────────┘
┌─────────────────────────┐
│ ➕ Thêm từng đơn vị     │ ← Option 1
│ 📁 Thêm từ file         │ ← Option 2  
└─────────────────────────┘
```

#### **Behavior:**
1. **Default**: Dropdown đóng, chỉ hiện nút chính
2. **On Click**: Dropdown mở, hiện 2 options
3. **On Select**: Dropdown đóng, trigger callback tương ứng
4. **On Outside Click**: Dropdown đóng

#### **States:**
- **Normal**: Sẵn sàng click
- **Loading**: Disable khi đang process
- **Open**: Dropdown đang mở
- **Hover**: Highlight option khi hover

---

### **🚫 CÁC LỖI TUYỆT ĐỐI TRÁNH**

#### **Translation Violations:**
- ❌ Tạo `departments:actions.save` (phải dùng `common:actions.save`)
- ❌ Tạo `departments:states.loading` (phải dùng `common:states.loading`)
- ❌ Tạo `departments:messages.*` (phải dùng `common:messages.*`)

#### **UI/UX Violations:**
- ❌ Dropdown không responsive
- ❌ Không có loading states
- ❌ Missing hover effects
- ❌ Không handle outside clicks

#### **Technical Violations:**
- ❌ Hard-code URLs (phải dùng ENV)
- ❌ Accept CSV files (chỉ Excel)
- ❌ Component không reusable

---

### **✅ PATTERN ĐÚNG DUY NHẤT**

#### **Translation Keys Structure:**
```json
// departments.json - CHỈ specific content
{
  "addButton": {
    "dropdown": "Thêm đơn vị",
    "single": "Thêm từng đơn vị", 
    "fromFile": "Thêm từ file"
  },
  "import": {
    "templateLinkText": "tại đây",
    "onlyExcelAllowed": "Chỉ chấp nhận file Excel (.xlsx)"
  }
}

// common.json - TẤT CẢ actions/states/messages
{
  "actions": { "save": "Lưu", "cancel": "Hủy" },
  "states": { "loading": "Đang tải..." },
  "messages": { "success": {...}, "error": {...} }
}
```

#### **Component Usage:**
```typescript
const { t } = useTranslation(['departments', 'common']);

// ✅ Dropdown button
<AddDepartmentButton 
  onAddSingle={() => setIsCreateModalOpen(true)}
  onAddFromFile={() => setIsImportModalOpen(true)}
  loading={isLoading}
/>

// ✅ Translation usage
buttonText: t('departments:addButton.dropdown')
option1: t('departments:addButton.single')  
option2: t('departments:addButton.fromFile')
loadingText: t('common:states.loading')
```

---

**Lưu ý**: Dropdown button component cần được thiết kế generic để có thể customize labels cho các features khác nhau.
