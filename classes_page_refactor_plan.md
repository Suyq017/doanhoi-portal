# ClassesPage Refactor Plan

## ✅ Hoàn thành - Mục tiêu
Refactor ClassesPage.tsx để sử dụng custom hook `useImportConfig` thay vì định nghĩa importConfig thủ công.

## ✅ Đã thực hiện - Thay đổi

### 1. ✅ Import Statements
**Đã thêm:**
- `useImportConfig` hook 
- `classColumns` utility từ shared/utils/importColumns

**Đã loại bỏ:**
- `ImportModalConfig` (không cần thiết nữa)

### 2. ✅ State Management  
**Đã loại bỏ:**
- `const [isImportModalOpen, setIsImportModalOpen] = useState(false);`
- Hook `useImportConfig` giờ quản lý modal state tự động

### 3. ✅ ImportConfig Definition
**Đã thay thế:**
```tsx
// CŨ: Manual config definition (~35 lines)
const importConfig: ImportModalConfig<any> = {
  templateUrl: `${import.meta.env.VITE_BACKEND_API_URL}/classes/template`,
  templateFileName: t('classes:import.templateFile', { defaultValue: 'classes_template.xlsx' }),
  acceptedFileTypes: ['.xlsx', '.xls'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  processingMode: 'server',
  uploadFile: classService.uploadImportFile.bind(classService),
  validateServerData: classService.validateImportData.bind(classService),
  executeServerImport: classService.executeImport.bind(classService),
  getImportStatus: classService.getImportStatus.bind(classService),
  parseFile: classService.parseFile.bind(classService),
  validateData: classService.validateData.bind(classService),
  importData: classService.importData.bind(classService),
  columns: [
    { key: 'name', label: t('classes:fields.name'), required: true, type: 'text' },
    { key: 'code', label: t('classes:fields.code'), required: false, type: 'text' },
    { key: 'year', label: t('classes:fields.year'), required: false, type: 'number' },
    { key: 'departmentCode', label: t('classes:fields.departmentCode'), required: false, type: 'text' },
    { key: 'isActive', label: t('common:fields.status'), required: false, type: 'boolean' },
  ],
  entityName: 'classes',
  onSuccess: () => {
    loadClasses();
    setIsImportModalOpen(false);
    showSuccess(t('classes:import.importSuccess', { defaultValue: 'Import lớp học thành công!' }));
  },
  onError: (error) => {
    console.error('Import error:', error);
    showError(t('classes:import.importError', { defaultValue: 'Có lỗi xảy ra khi import lớp học' }));
  }
};

// MỚI: Hook usage (~17 lines)
const { 
  importConfig, 
  isImportModalOpen, 
  openImportModal, 
  closeImportModal 
} = useImportConfig({
  entityName: 'classes',
  entityService: {
    getTemplate: () => `${import.meta.env.VITE_BACKEND_API_URL}/classes/template`,
    uploadImportFile: classService.uploadImportFile.bind(classService),
    validateImportData: classService.validateImportData.bind(classService),
    executeImport: classService.executeImport.bind(classService),
    getImportStatus: classService.getImportStatus.bind(classService),
  },
  columns: classColumns(t),
  templateFileName: t('classes:import.templateFile', { defaultValue: 'classes_template.xlsx' }),
  onSuccess: () => {
    loadClasses();
    showSuccess(t('classes:import.importSuccess', { defaultValue: 'Import lớp học thành công!' }));
  },
  onError: (error: Error) => {
    console.error('Import error:', error);
    showError(t('classes:import.importError', { defaultValue: 'Có lỗi xảy ra khi import lớp học' }));
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
- ✅ Giảm code từ ~40 lines → ~17 lines
- ✅ Modal state được quản lý tự động bởi hook
- ✅ Standardized import logic sử dụng classColumns utility
- ✅ Type safety được đảm bảo hoàn toàn
- ✅ Dễ dàng maintain và extend
- ✅ Không còn manual modal state management
- ✅ Built-in success callback tự động đóng modal
- ✅ Consistent với DepartmentsPage và other modules

## ✅ Đặc điểm riêng của ClassesPage
- ✅ Custom template filename được specify: `templateFileName: t('classes:import.templateFile', { defaultValue: 'classes_template.xlsx' })`
- ✅ Classes có columns phức tạp hơn departments: name, code, year, departmentCode, isActive
- ✅ Success/error messages được customize cho classes domain

## ✅ Testing Points - Cần kiểm tra
- [ ] Import modal mở/đóng đúng cách
- [ ] Import functionality hoạt động như cũ  
- [ ] Success/error handling works correctly
- [ ] Translation keys hoạt động đúng
- [ ] Class columns hiển thị đúng trong import modal (5 columns)
- [ ] Custom template filename được sử dụng đúng
- [ ] File upload và validation process hoạt động bình thường

## Files đã thay đổi
- ✅ `frontend/src/features/classes/ClassesPage.tsx` - HOÀN THÀNH

## So sánh với DepartmentsPage
| Aspect | DepartmentsPage | ClassesPage |
|--------|-----------------|-------------|
| **Columns count** | 3 columns | 5 columns |
| **Template filename** | Auto-generated | Custom specified |
| **Complexity** | Simple | Medium |
| **Code reduction** | ~35 → ~15 lines | ~40 → ~17 lines |

## Next Steps
1. Test import functionality trong ClassesPage
2. Nếu không có issue, tiếp tục migrate UsersPage (most complex)
3. Document lessons learned cho migration process
