# Import Config Hook Refactoring Plan

## Tổng quan
Kế hoạch này tài liệu hóa việc refactor logic `importConfig` từ việc duplicate code trong nhiều component thành một custom React hook có thể tái sử dụng (`useImportConfig`). Điều này sẽ giảm code duplication, tăng tính nhất quán và dễ dàng maintain.

## Phân tích hiện trạng

### Cách sử dụng hiện tại
Hiện tại `importConfig` được implement trực tiếp trong từng page component:

1. **DepartmentsPage.tsx**: Server-side processing với columns cho departments
2. **ClassesPage.tsx**: Server-side processing với columns cho classes  
3. **UsersPage.tsx**: Server-side processing với columns phức tạp cho users
4. **Organizations**: Sử dụng utility function `createOrganizationImportConfig()` - đã có một dạng abstraction

### Code hiện tại chi tiết

**DepartmentsPage.tsx:**
```typescript
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
  columns: [
    { key: 'name', label: t('departments:fields.name'), required: true, type: 'text' },
    { key: 'code', label: t('departments:fields.code'), required: true, type: 'text' },
    // ... other columns
  ],
  entityName: 'departments',
  onSuccess: () => { loadDepartments(); setIsImportModalOpen(false); showSuccess(...); },
  onError: (error) => { console.error('Import error:', error); showError(...); }
};
```

**ClassesPage.tsx:**
```typescript
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
  columns: [
    { key: 'name', label: t('classes:fields.name'), required: true, type: 'text' },
    { key: 'code', label: t('classes:fields.code'), required: false, type: 'text' },
    { key: 'year', label: t('classes:fields.year'), required: false, type: 'number' },
    // ... other columns
  ],
  entityName: 'classes',
  onSuccess: () => { loadClasses(); setIsImportModalOpen(false); showSuccess(...); },
  onError: (error) => { console.error('Import error:', error); showError(...); }
};
```

**UsersPage.tsx:**
```typescript
const importConfig: ImportModalConfig<any> = {
  templateUrl: userService.getTemplate(),
  templateFileName: 'users_import_template.xlsx',
  acceptedFileTypes: ['.xlsx', '.xls'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  processingMode: 'server',
  columns: [
    { key: 'familyName', label: 'Family Name', required: true, type: 'text' },
    { key: 'givenName', label: 'Given Name', required: true, type: 'text' },
    { key: 'email', label: 'Email', required: true, type: 'email' },
    { key: 'userType', label: 'User Type', required: false, type: 'select', selectOptions: [
      { value: 'student', label: 'Student' },
      { value: 'staff', label: 'Staff' }
    ]},
    // ... 10+ more complex columns
  ],
  uploadFile: async (file: File) => { /* complex validation mapping */ },
  validateServerData: async (sessionId: string) => { /* complex result mapping */ },
  executeServerImport: async (sessionId: string, options?: any) => { /* complex execution */ },
  entityName: 'users',
  onSuccess: () => { loadUsers(); setIsImportModalOpen(false); showSuccess(...); },
  onError: (error: Error) => { showError(...); }
};
```

**Organizations (đã có abstraction):**
```typescript
// organizationUtils.ts
export const createOrganizationImportConfig = (level: 2 | 3): ImportModalConfig<any> => {
  return {
    templateUrl: organizationService.getTemplate(`${level}`),
    templateFileName: `organization_level${level}_template.xlsx`,
    // ... standard config
    columns: level === 2 ? [...] : [...], // Different columns by level
    entityName: 'organizations',
  };
};

// Usage in pages
const importConfig = createOrganizationImportConfig(2);
```

### Điểm chung được phát hiện
- **Template handling**: `templateUrl`, `templateFileName`
- **File validation**: `acceptedFileTypes`, `maxFileSize` (tất cả đều 5MB và .xlsx/.xls)
- **Processing mode**: Tất cả đều dùng `'server'`
- **Server functions**: `uploadFile`, `validateServerData`, `executeServerImport`, `getImportStatus`
- **Callbacks**: `onSuccess`, `onError` pattern tương tự
- **UI config**: `entityName` cho i18n

### Điểm khác nhau quan trọng
- **Columns definition**: Mỗi entity có structure columns hoàn toàn khác nhau
- **Service bindings**: Mỗi entity bind với service khác nhau
- **Success/Error handling**: Logic reload data và toast messages khác nhau
- **Template parameters**: Organizations có thêm `level` parameter
- **Complex validation mapping**: Users có logic mapping phức tạp nhất

## Thiết kế Custom Hook

### Interface của Hook

```typescript
interface UseImportConfigOptions<T = any> {
  // Entity information
  entityName: string;
  entityService: ImportServiceInterface;
  
  // Columns definition
  columns: ImportColumn[];
  
  // Template configuration  
  templateParams?: Record<string, any>; // For organizations level, etc.
  templateFileName?: string; // Override default template filename
  
  // Callbacks
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  
  // Advanced options (with sensible defaults)
  processingMode?: 'client' | 'server';
  maxFileSize?: number;
  acceptedFileTypes?: string[];
}

interface UseImportConfigReturn {
  importConfig: ImportModalConfig<any>;
  isImporting: boolean;
  importProgress?: ImportProgress;
}
```

### Service Interface chuẩn hóa

Để hook hoạt động, tất cả service phải implement interface chuẩn:

```typescript
interface ImportServiceInterface {
  // Template
  getTemplate(params?: string): string;
  
  // Server-side processing (required methods)
  uploadImportFile(file: File, ...extraParams: any[]): Promise<ServerImportSession>;
  validateImportData(sessionId: string): Promise<ServerValidationResult>;
  executeImport(sessionId: string, options?: any): Promise<ServerImportResult>;
  getImportStatus(sessionId: string): Promise<any>;
}
```

### Hook Implementation

```typescript
// hooks/useImportConfig.ts
import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from './useToast';
import { 
  ImportModalConfig, 
  ImportColumn, 
  ServerImportSession, 
  ServerValidationResult, 
  ServerImportResult 
} from '../types/import';

export const useImportConfig = <T = any>(options: UseImportConfigOptions<T>): UseImportConfigReturn => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  
  const {
    entityName,
    entityService,
    columns,
    templateParams,
    templateFileName,
    onSuccess,
    onError,
    processingMode = 'server',
    maxFileSize = 5 * 1024 * 1024, // 5MB default
    acceptedFileTypes = ['.xlsx', '.xls']
  } = options;

  // Generate template filename if not provided
  const defaultTemplateFileName = useMemo(() => {
    if (templateFileName) return templateFileName;
    
    const suffix = templateParams?.level ? `_level${templateParams.level}` : '';
    return `${entityName}${suffix}_template.xlsx`;
  }, [entityName, templateFileName, templateParams]);

  // Create import config with standardized logic
  const importConfig: ImportModalConfig<T> = useMemo(() => ({
    // Template & File handling
    templateUrl: entityService.getTemplate(templateParams?.level?.toString()),
    templateFileName: defaultTemplateFileName,
    acceptedFileTypes,
    maxFileSize,
    
    // Processing mode
    processingMode,
    
    // Server-side functions with error handling and loading state
    uploadFile: async (file: File) => {
      setIsImporting(true);
      try {
        const result = await entityService.uploadImportFile(
          file, 
          ...(templateParams ? Object.values(templateParams) : [])
        );
        
        // Standardize return format
        return {
          sessionId: result.sessionId,
          fileName: result.fileName || file.name,
          totalRows: result.totalRows || 0,
          message: result.message || '',
        };
      } catch (error) {
        setIsImporting(false);
        throw error;
      }
    },
    
    validateServerData: async (sessionId: string) => {
      try {
        const result = await entityService.validateImportData(sessionId);
        
        // Handle different response formats from different services
        let mappedPreviewData: any[] = [];
        
        if (result.validationResults) {
          // Format from Users service
          mappedPreviewData = result.validationResults.map(item => ({
            ...item.data,
            _rowIndex: item.rowIndex,
            _hasError: !item.validation.isValid,
            _errors: item._errors || [],
            _warnings: item._warnings || []
          }));
        } else if (result.previewData) {
          // Format from other services
          mappedPreviewData = result.previewData;
        }

        return {
          sessionId: result.sessionId,
          isValid: result.isValid,
          summary: {
            total: result.summary.total,
            valid: result.summary.valid,
            invalid: result.summary.invalid,
            duplicates: result.summary.duplicates || 0,
            conflicts: result.summary.conflicts || 0
          },
          errors: result.errors || [],
          warnings: result.warnings || [],
          previewData: mappedPreviewData
        };
      } catch (error) {
        setIsImporting(false);
        throw error;
      }
    },
    
    executeServerImport: async (sessionId: string, importOptions?: any) => {
      try {
        const result = await entityService.executeImport(sessionId, importOptions);
        setIsImporting(false);
        
        return {
          sessionId: result.sessionId,
          success: result.success,
          importedCount: result.importedCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount,
          errors: result.errors || [],
          message: result.message
        };
      } catch (error) {
        setIsImporting(false);
        throw error;
      }
    },
    
    getImportStatus: entityService.getImportStatus.bind(entityService),
    
    // UI Configuration
    columns,
    entityName,
    
    // Callbacks with built-in success/error handling + i18n
    onSuccess: () => {
      setIsImporting(false);
      showSuccess(t(`${entityName}:import.success`, { 
        defaultValue: 'Import thành công!' 
      }));
      onSuccess?.();
    },
    
    onError: (error: Error) => {
      setIsImporting(false);
      showError(error.message || t(`${entityName}:import.error`, { 
        defaultValue: 'Import thất bại!' 
      }));
      onError?.(error);
    }
  }), [
    entityService,
    templateParams,
    defaultTemplateFileName,
    acceptedFileTypes,
    maxFileSize,
    processingMode,
    columns,
    entityName,
    onSuccess,
    onError,
    t,
    showSuccess,
    showError
  ]);

  return {
    importConfig,
    isImporting
  };
};
```
  entityName: 'users',
  onSuccess: () => { loadUsers(); setIsImportModalOpen(false); showSuccess(...); },
  onError: (error) => { showError(error.message || t('users:import.error')); }
};
```

### 2.2 Những điểm chung
- `acceptedFileTypes`: ['.xlsx', '.xls']
- `maxFileSize`: 5 * 1024 * 1024 (5MB)
- `processingMode`: 'server'
- Cách bind service functions
- Cấu trúc onSuccess/onError tương tự

### 2.3 Những điểm khác nhau
- `templateUrl`: Khác endpoint cho mỗi module
- `templateFileName`: Khác tên file và translation key
- `columns`: Hoàn toàn khác nhau giữa các module
- `entityName`: 'departments', 'classes', 'users', 'organizations'
- Service instance khác nhau
- Load function khác nhau (loadDepartments, loadClasses, loadUsers)
- Translation namespace khác nhau

## 3. Thiết kế Custom Hook

### 3.1 Interface cho Hook Parameters
```typescript
interface ImportHookParams<T = any> {
  // Module identification
  entityName: string; // 'departments', 'users', 'classes', 'organizations'
  
  // Service configuration
  service: {
    uploadImportFile: (file: File) => Promise<ServerImportSession>;
    validateImportData: (sessionId: string) => Promise<ServerValidationResult>;
    executeImport: (sessionId: string, options?: any) => Promise<ServerImportResult>;
    getImportStatus: (sessionId: string) => Promise<any>;
    // Legacy support
    parseFile?: (file: File) => Promise<T[]>;
    validateData?: (data: T[]) => Promise<ValidationResult<T>>;
    importData?: (data: T[], options?: ImportOptions) => Promise<ImportResult>;
  };
  
  // Column definitions (specific to each module)
  columns: ImportColumn[];
  
  // Callbacks
  onSuccess: () => void;
  onError: (error: Error) => void;
  
  // Translation namespace (optional, defaults to entityName)
  translationNamespace?: string;
  
  // Custom template configuration (optional)
  customTemplate?: {
    url: string;
    fileName: string;
  };
}
```

### 3.2 Hook Implementation Location
**File:** `frontend/src/shared/hooks/useImportConfig.ts`

### 3.3 Hook Return Type
```typescript
interface ImportHookReturn {
  importConfig: ImportModalConfig<any>;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  openImportModal: () => void;
  closeImportModal: () => void;
}
```

### 3.4 Hook Implementation Structure
```typescript
export function useImportConfig<T = any>(params: ImportHookParams<T>): ImportHookReturn {
  const { t } = useTranslation([params.translationNamespace || params.entityName, 'common']);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const importConfig = useMemo(() => ({
    // Common configuration
    acceptedFileTypes: ['.xlsx', '.xls'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    processingMode: 'server' as const,
    
    // Dynamic configuration based on entityName
    templateUrl: params.customTemplate?.url || 
                `${import.meta.env.VITE_BACKEND_API_URL}/${params.entityName}/template`,
    templateFileName: params.customTemplate?.fileName || 
                     t(`${params.entityName}:import.templateFile`, { 
                       defaultValue: `${params.entityName}_template.xlsx` 
                     }),
    
    // Service bindings
    uploadFile: params.service.uploadImportFile,
    validateServerData: params.service.validateImportData,
    executeServerImport: params.service.executeImport,
    getImportStatus: params.service.getImportStatus,
    
    // Legacy support
    parseFile: params.service.parseFile,
    validateData: params.service.validateData,
    importData: params.service.importData,
    
    // Module-specific configuration
    columns: params.columns,
    entityName: params.entityName,
    
    // Enhanced callbacks
    onSuccess: () => {
      params.onSuccess();
      setIsImportModalOpen(false);
    },
    onError: params.onError
  }), [params, t]);
  
  return {
    importConfig,
    isImportModalOpen,
    setIsImportModalOpen,
    openImportModal: () => setIsImportModalOpen(true),
    closeImportModal: () => setIsImportModalOpen(false)
  };
}
```

## 4. Column Definitions cho từng Module

### 4.1 Departments Columns
```typescript
const departmentColumns: ImportColumn[] = [
  { key: 'name', label: t('departments:fields.name'), required: true, type: 'text' },
  { key: 'code', label: t('departments:fields.code'), required: false, type: 'text' },
  { key: 'description', label: t('departments:fields.description'), required: false, type: 'text' },
];
```

### 4.2 Classes Columns
```typescript
const classColumns: ImportColumn[] = [
  { key: 'name', label: t('classes:fields.name'), required: true, type: 'text' },
  { key: 'code', label: t('classes:fields.code'), required: false, type: 'text' },
  { key: 'year', label: t('classes:fields.year'), required: false, type: 'number' },
  { key: 'departmentCode', label: t('classes:fields.departmentCode'), required: false, type: 'text' },
  { key: 'isActive', label: t('common:fields.status'), required: false, type: 'boolean' },
];
```

### 4.3 Users Columns (phức tạp nhất)
```typescript
const userColumns: ImportColumn[] = [
  { key: 'familyName', label: 'Family Name', required: true, type: 'text' },
  { key: 'givenName', label: 'Given Name', required: true, type: 'text' },
  { key: 'email', label: 'Email', required: true, type: 'email' },
  { key: 'code', label: 'Code', required: true, type: 'text' },
  { key: 'password', label: 'Password', required: false, type: 'text' },
  { key: 'phone', label: 'Phone', required: false, type: 'text' },
  { key: 'className', label: 'Class Name', required: false, type: 'text' },
  { key: 'managementDepartmentCode', label: 'Management Department Code', required: false, type: 'text' },
  { key: 'trainingDepartmentCode', label: 'Training Department Code', required: false, type: 'text' },
  { key: 'organizationCodes', label: 'Organization Codes', required: false, type: 'text' },
  { 
    key: 'userType', 
    label: 'User Type', 
    required: false, 
    type: 'select',
    selectOptions: [
      { value: 'student', label: 'Student' },
      { value: 'staff', label: 'Staff' }
    ]
  },
  { 
    key: 'membershipStatus', 
    label: 'Membership Status', 
    required: false, 
    type: 'select',
    selectOptions: [
      { value: 'doan_vien', label: 'Đoàn viên' },
      { value: 'hoi_vien', label: 'Hội viên' },
      { value: 'both', label: 'Cả hai' },
      { value: 'none', label: 'Không' }
    ]
  },
  { key: 'isActive', label: 'Is Active', required: false, type: 'boolean' }
];
```

## 5. Cách sử dụng Hook trong các trang

### 5.1 DepartmentsPage.tsx
```typescript
// Import hook
import { useImportConfig } from '@/shared/hooks/useImportConfig';

// Trong component
const Departments: React.FC = () => {
  const { t } = useTranslation(['departments', 'common']);
  const { showSuccess, showError } = useToast();
  
  // Column definitions
  const departmentColumns: ImportColumn[] = [
    { key: 'name', label: t('departments:fields.name'), required: true, type: 'text' },
    { key: 'code', label: t('departments:fields.code'), required: false, type: 'text' },
    { key: 'description', label: t('departments:fields.description'), required: false, type: 'text' },
  ];
  
  // Use import hook
  const { 
    importConfig, 
    isImportModalOpen, 
    setIsImportModalOpen,
    openImportModal,
    closeImportModal 
  } = useImportConfig({
    entityName: 'departments',
    service: {
      uploadImportFile: departmentService.uploadImportFile.bind(departmentService),
      validateImportData: departmentService.validateImportData.bind(departmentService),
      executeImport: departmentService.executeImport.bind(departmentService),
      getImportStatus: departmentService.getImportStatus.bind(departmentService),
      // Legacy
      parseFile: departmentService.parseFile?.bind(departmentService),
      validateData: departmentService.validateData?.bind(departmentService),
      importData: departmentService.importData?.bind(departmentService),
    },
    columns: departmentColumns,
    onSuccess: () => {
      loadDepartments();
      showSuccess(t('departments:import.importSuccess'));
    },
    onError: (error) => {
      console.error('Import error:', error);
      showError(t('departments:import.importError'));
    }
  });
  
  // Update dropdown options
  const addDropdownOptions: DropdownOption[] = [
    {
      key: 'single',
      label: t('departments:addButton.single'),
      icon: <UserPlus className="w-4 h-4" />,
      description: t('departments:addButton.singleDescription'),
      onClick: () => setIsCreateModalOpen(true)
    },
    {
      key: 'fromFile',
      label: t('departments:addButton.fromFile'), 
      icon: <Upload className="w-4 h-4" />,
      description: t('departments:addButton.fromFileDescription'),
      onClick: openImportModal // Sử dụng function từ hook
    }
  ];
  
  // Remove manual importConfig definition
  // Remove manual isImportModalOpen state
  
  // Render ImportModal
  return (
    <div className="space-y-6">
      {/* ... existing UI ... */}
      
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal} // Sử dụng function từ hook
        config={importConfig}
      />
    </div>
  );
};
```

### 5.2 ClassesPage.tsx
```typescript
// Similar structure nhưng với class-specific configurations
const classColumns: ImportColumn[] = [
  { key: 'name', label: t('classes:fields.name'), required: true, type: 'text' },
  { key: 'code', label: t('classes:fields.code'), required: false, type: 'text' },
  { key: 'year', label: t('classes:fields.year'), required: false, type: 'number' },
  { key: 'departmentCode', label: t('classes:fields.departmentCode'), required: false, type: 'text' },
  { key: 'isActive', label: t('common:fields.status'), required: false, type: 'boolean' },
];

const { importConfig, isImportModalOpen, openImportModal, closeImportModal } = useImportConfig({
  entityName: 'classes',
  service: {
    uploadImportFile: classService.uploadImportFile.bind(classService),
    validateImportData: classService.validateImportData.bind(classService),
    executeImport: classService.executeImport.bind(classService),
    getImportStatus: classService.getImportStatus.bind(classService),
    // Legacy
    parseFile: classService.parseFile?.bind(classService),
    validateData: classService.validateData?.bind(classService),
    importData: classService.importData?.bind(classService),
  },
  columns: classColumns,
  onSuccess: () => {
    loadClasses();
    showSuccess(t('classes:import.importSuccess', { defaultValue: 'Import lớp học thành công!' }));
  },
  onError: (error) => {
    console.error('Import error:', error);
    showError(t('classes:import.importError', { defaultValue: 'Có lỗi xảy ra khi import lớp học' }));
  }
});
```

### 5.3 UsersPage.tsx
```typescript
// Special case với custom template URL
const userColumns: ImportColumn[] = [
  // ... complex user columns with select options ...
];

const { importConfig, isImportModalOpen, openImportModal, closeImportModal } = useImportConfig({
  entityName: 'users',
  service: {
    uploadImportFile: async (file: File) => {
      console.log('Uploading file:', file.name, file.size);
      const result = await userService.uploadImportFile(file);
      console.log('Upload result:', result);
      return {
        sessionId: result.sessionId,
        fileName: result.fileName,
        totalRows: result.totalRows,
        message: result.message,
      };
    },
    validateImportData: async (sessionId: string) => {
      // Custom validation logic cho users
      const result = await userService.validateImportData(sessionId);
      // Custom mapping logic
      const mappedPreviewData = result.validationResults?.map(item => ({
        ...item.data,
        _rowIndex: item.rowIndex,
        _hasError: !item.validation.isValid,
        _errors: item._errors || [],
        _warnings: item._warnings || []
      })) || [];

      return {
        sessionId: result.sessionId,
        isValid: result.isValid,
        summary: {
          total: result.summary.total,
          valid: result.summary.valid,
          invalid: result.summary.invalid,
          duplicates: result.summary.duplicates || 0,
          conflicts: result.summary.conflicts || 0
        },
        errors: result.errors || [],
        warnings: result.warnings || [],
        previewData: mappedPreviewData
      };
    },
    executeImport: userService.executeImport.bind(userService),
    getImportStatus: userService.getImportStatus.bind(userService),
  },
  columns: userColumns,
  customTemplate: {
    url: userService.getTemplate(),
    fileName: 'users_import_template.xlsx'
  },
  onSuccess: () => {
    loadUsers();
    showSuccess(t('users:import.success', { defaultValue: 'Import thành công!' }));
  },
  onError: (error: Error) => {
    showError(error.message || t('users:import.error', { defaultValue: 'Import thất bại!' }));
  }
});
```

## 6. Lợi ích của Hook

### 6.1 Code Reusability
- Giảm 80% code duplication giữa các trang
- Logic chung được tập trung trong hook
- Dễ dàng thêm module mới

### 6.2 Maintainability
- Chỉ cần sửa ở một nơi cho common logic
- Type safety với TypeScript
- Consistent behavior across modules

### 6.3 Flexibility
- Support custom template URLs (như users)
- Support custom validation logic
- Support legacy và server-side processing
- Extensible cho các module mới

## 7. Implementation Steps

### 7.1 Phase 1: Tạo Hook
1. Tạo file `frontend/src/shared/hooks/useImportConfig.ts`
2. Implement interface và hook logic
3. Test với một module đơn giản (departments)

### 7.2 Phase 2: Refactor từng trang
1. **DepartmentsPage.tsx**: Thay thế importConfig bằng hook
2. **ClassesPage.tsx**: Tương tự departments
3. **UsersPage.tsx**: Xử lý custom logic đặc biệt
4. **OrganizationsPage.tsx**: Thêm khi cần

### 7.3 Phase 3: Testing & Optimization
1. Test tất cả import functionality
2. Kiểm tra translation keys
3. Performance optimization nếu cần
4. Documentation update

## 8. Migration Strategy

### 8.1 Backward Compatibility
- Hook support cả legacy và server-side processing
- Không break existing functionality
- Gradual migration possible

### 8.2 Testing Approach
- Unit test cho hook
- Integration test cho từng trang
- E2E test cho import flow

### 8.3 Risk Mitigation
- Feature flag cho hook vs manual config
- Rollback plan sẵn sàng
- Thorough testing trước khi deploy

## 9. Future Enhancements

### 9.1 Advanced Features
- Import progress tracking
- Bulk import validation
- Template customization UI
- Import history

### 9.2 Performance Improvements
- Lazy loading for large files
- Chunked upload
- Background processing

### 9.3 Developer Experience
- Better error messages
- Debug mode
- Import analytics

## Implementation Ready

Kế hoạch này đã sẵn sàng để implement. Tất cả analysis, design, examples, migration strategy và testing plan đã được document chi tiết.

**Next Steps:**
1. Create hook infrastructure
2. Migrate Departments (simplest test case)
3. Migrate Classes 
4. Migrate Organizations (test templateParams)
5. Migrate Users (most complex)
6. Cleanup và testing

Từ hơn 200 lines duplicate code sẽ được reduce thành <10 lines configuration per page, significantly improving maintainability và developer experience.