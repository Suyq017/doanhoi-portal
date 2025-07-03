# DepartmentsPage Refactor Plan

## ✅ Hoàn thành - Mục tiêu
Refactor DepartmentsPage.tsx để sử dụng custom hook `useImportConfig` thay vì định nghĩa importConfig thủ công.

## ✅ Đã thực hiện - Thay đổi

### 1. ✅ Import Statements
**Đã thêm:**
- `useImportConfig` hook
- `departmentColumns` utility từ shared/utils/importColumns

**Đã loại bỏ:**
- `ImportModalConfig` (không cần thiết nữa)

### 2. ✅ State Management  
**Đã loại bỏ:**
- `const [isImportModalOpen, setIsImportModalOpen] = useState(false);` 
- Hook `useImportConfig` giờ quản lý modal state tự động

### 3. ✅ ImportConfig Definition
**Đã thay thế:**
```tsx
// CŨ: Manual config definition (~30 lines)
const importConfig: ImportModalConfig<any> = {
  templateUrl: `${import.meta.env.VITE_BACKEND_API_URL}/departments/template`,
  templateFileName: t('departments:import.templateFile'),
  acceptedFileTypes: ['.xlsx', '.xls'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  processingMode: 'server',
  uploadFile: departmentService.uploadImportFile.bind(departmentService),
  validateServerData: departmentService.validateImportData.bind(departmentService),
  executeServerImport: departmentService.executeImport.bind(departmentService),
  getImportStatus: departmentService.getImportStatus.bind(departmentService),
  parseFile: departmentService.parseFile.bind(departmentService),
  validateData: departmentService.validateData.bind(departmentService),
  importData: departmentService.importData.bind(departmentService),
  columns: [
    { key: 'name', label: t('departments:fields.name'), required: true, type: 'text' },
    { key: 'code', label: t('departments:fields.code'), required: false, type: 'text' },
    { key: 'description', label: t('departments:fields.description'), required: false, type: 'text' },
  ],
  entityName: 'departments',
  onSuccess: () => {
    loadDepartments();
    setIsImportModalOpen(false);
    showSuccess(t('departments:import.importSuccess'));
  },
  onError: (error) => {
    console.error('Import error:', error);
    showError(t('departments:import.importError'));
  }
};

// MỚI: Hook usage (~15 lines)
const { 
  importConfig, 
  isImportModalOpen, 
  openImportModal, 
  closeImportModal 
} = useImportConfig({
  entityName: 'departments',
  entityService: {
    getTemplate: () => `${import.meta.env.VITE_BACKEND_API_URL}/departments/template`,
    uploadImportFile: departmentService.uploadImportFile.bind(departmentService),
    validateImportData: departmentService.validateImportData.bind(departmentService),
    executeImport: departmentService.executeImport.bind(departmentService),
    getImportStatus: departmentService.getImportStatus.bind(departmentService),
  },
  columns: departmentColumns(t),
  onSuccess: () => {
    loadDepartments();
    showSuccess(t('departments:import.importSuccess'));
  },
  onError: (error: Error) => {
    console.error('Import error:', error);
    showError(t('departments:import.importError'));
  }
});
```

### 4. ✅ Dropdown Options Update
**Đã thay đổi:**
- `onClick: () => setIsImportModalOpen(true)` → `onClick: openImportModal`

### 5. ✅ ImportModal Props Update  
**Đã thay đổi:**
- `onClose={() => setIsImportModalOpen(false)}` → `onClose={closeImportModal}`

## ✅ Lợi ích đã đạt được
- ✅ Giảm code từ ~35 lines → ~15 lines
- ✅ Modal state được quản lý tự động bởi hook
- ✅ Standardized import logic sử dụng departmentColumns utility
- ✅ Type safety được đảm bảo hoàn toàn
- ✅ Dễ dàng maintain và extend
- ✅ Không còn manual modal state management
- ✅ Built-in success callback tự động đóng modal
- ✅ Consistent với other modules khi migration

## ✅ Testing Points - Cần kiểm tra
- [ ] Import modal mở/đóng đúng cách
- [ ] Import functionality hoạt động như cũ  
- [ ] Success/error handling works correctly
- [ ] Translation keys hoạt động đúng
- [ ] Department columns hiển thị đúng trong import modal
- [ ] File upload và validation process hoạt động bình thường

## Files đã thay đổi
- ✅ `frontend/src/features/departments/DepartmentsPage.tsx` - HOÀN THÀNH

## Next Steps
1. Test import functionality trong DepartmentsPage
2. Nếu không có issue, tiếp tục migrate ClassesPage và UsersPage
3. Document lessons learned cho migration process
