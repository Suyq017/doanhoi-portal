# Generic Import Modal Component

## 📋 Tổng quan

`ImportModal` là một component generic được thiết kế để xử lý việc import dữ liệu từ file Excel/CSV cho bất kỳ entity nào trong hệ thống. Component này cung cấp một workflow hoàn chỉnh bao gồm:

1. **Upload**: Tải file template và upload file dữ liệu
2. **Preview**: Xem trước và validate dữ liệu
3. **Import**: Thực hiện import với các tùy chọn linh hoạt
4. **Result**: Hiển thị kết quả import chi tiết

## 🎯 Tính năng chính

- ✅ **Generic**: Có thể sử dụng cho bất kỳ entity nào (Departments, Users, Classes, v.v.)
- ✅ **Type-safe**: Full TypeScript support với generics
- ✅ **Drag & Drop**: Hỗ trợ kéo thả file
- ✅ **Validation**: Kiểm tra dữ liệu trước khi import
- ✅ **Preview**: Xem trước dữ liệu với highlighting lỗi
- ✅ **Flexible Options**: Skip errors, update existing, dry run
- ✅ **Progress Tracking**: Hiển thị tiến trình import
- ✅ **Error Handling**: Xử lý và hiển thị lỗi chi tiết
- ✅ **i18n Ready**: Hỗ trợ đa ngôn ngữ
- ✅ **Dark Mode**: Hỗ trợ dark/light theme

## 📦 Installation

Component đã được export từ `shared/components`:

```typescript
import { ImportModal, ImportModalConfig } from '../../shared';
```

## 🔧 Types và Interfaces

### ImportModalConfig<T>

```typescript
interface ImportModalConfig<T> {
  // Template & File handling
  templateUrl: string;           // URL để download template
  templateFileName: string;      // Tên file template
  acceptedFileTypes: string[];   // ['.xlsx', '.xls', '.csv']
  maxFileSize: number;          // Kích thước tối đa (bytes)
  
  // Data processing functions
  parseFile: (file: File) => Promise<T[]>;
  validateData: (data: T[]) => Promise<ValidationResult<T>>;
  importData: (data: T[], options?: ImportOptions) => Promise<ImportResult>;
  
  // UI Configuration
  columns: ImportColumn[];       // Cấu hình cột hiển thị
  entityName: string;           // Tên entity cho i18n
  previewRowCount?: number;     // Số dòng hiển thị preview (default: 10)
  allowPartialImport?: boolean; // Cho phép import một phần
  
  // Optional callbacks
  onSuccess?: (result: ImportResult) => void;
  onError?: (error: Error) => void;
  onValidationComplete?: (result: ValidationResult<T>) => void;
}
```

### ImportColumn

```typescript
interface ImportColumn {
  key: string;                  // Key của field
  label: string;               // Label hiển thị
  required: boolean;           // Có bắt buộc không
  type: 'text' | 'number' | 'boolean' | 'date' | 'email' | 'select';
  validator?: (value: any, row: any) => string | null;
  formatter?: (value: any) => any;
  selectOptions?: { value: string; label: string }[];
  width?: string;              // CSS width
}
```

## 🚀 Cách sử dụng

### 1. Basic Usage

```typescript
import React, { useState } from 'react';
import { ImportModal, ImportModalConfig } from '../../shared';

const MyComponent: React.FC = () => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const importConfig: ImportModalConfig<MyEntity> = {
    templateUrl: '/api/my-entities/template',
    templateFileName: 'my_entities_template.xlsx',
    acceptedFileTypes: ['.xlsx', '.xls', '.csv'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    
    parseFile: async (file) => {
      // Implement file parsing logic
    },
    
    validateData: async (data) => {
      // Implement validation logic
    },
    
    importData: async (data, options) => {
      // Implement import logic
    },
    
    columns: [
      { key: 'name', label: 'Name', required: true, type: 'text' },
      { key: 'email', label: 'Email', required: true, type: 'email' },
      { key: 'isActive', label: 'Active', required: false, type: 'boolean' }
    ],
    
    entityName: 'my-entities',
    
    onSuccess: (result) => {
      console.log('Import successful:', result);
      // Reload data, show success message, etc.
    }
  };

  return (
    <>
      <button onClick={() => setIsImportModalOpen(true)}>
        Import Data
      </button>
      
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        config={importConfig}
      />
    </>
  );
};
```

### 2. Departments Example

```typescript
const departmentImportConfig: ImportModalConfig<Department> = {
  templateUrl: '/api/departments/template',
  templateFileName: 'departments_template.xlsx',
  acceptedFileTypes: ['.xlsx', '.xls', '.csv'],
  maxFileSize: 5 * 1024 * 1024,
  
  parseFile: async (file: File): Promise<Department[]> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/departments/parse', {
      method: 'POST',
      body: formData
    });
    return response.json();
  },
  
  validateData: async (data: Department[]) => {
    const response = await fetch('/api/departments/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    return response.json();
  },
  
  importData: async (data: Department[], options?) => {
    const response = await fetch('/api/departments/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, options })
    });
    return response.json();
  },
  
  columns: [
    { 
      key: 'name', 
      label: t('departments:fields.name'), 
      required: true, 
      type: 'text',
      validator: (value) => {
        if (!value || value.trim().length < 2) {
          return 'Tên đơn vị phải có ít nhất 2 ký tự';
        }
        return null;
      }
    },
    { 
      key: 'code', 
      label: t('departments:fields.code'), 
      required: false, 
      type: 'text',
      validator: (value) => {
        if (value && !/^[A-Z0-9_]+$/.test(value)) {
          return 'Mã đơn vị chỉ được chứa chữ hoa, số và dấu gạch dưới';
        }
        return null;
      }
    },
    { 
      key: 'description', 
      label: t('departments:fields.description'), 
      required: false, 
      type: 'text' 
    },
    { 
      key: 'isActive', 
      label: t('common:fields.status'), 
      required: false, 
      type: 'boolean',
      formatter: (value) => {
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      }
    }
  ],
  
  entityName: 'departments',
  previewRowCount: 15,
  
  onSuccess: (result) => {
    if (result.failed === 0) {
      showSuccess(t('departments:import.success', { count: result.success }));
    } else {
      showSuccess(t('departments:import.partialSuccess', { 
        success: result.success, 
        total: result.total 
      }));
    }
    loadDepartments();
    setIsImportModalOpen(false);
  },
  
  onError: (error) => {
    showError(t('departments:import.error'));
  }
};
```

## 🔧 Backend API Requirements

Import modal cần các API endpoints sau:

### 1. Template Download
```
GET /api/{entity}/template
Response: Excel file download
```

### 2. File Parsing
```
POST /api/{entity}/parse
Body: FormData with file
Response: Array<Entity>
```

### 3. Data Validation
```
POST /api/{entity}/validate
Body: { data: Array<Entity> }
Response: ValidationResult<Entity>
```

### 4. Import Data
```
POST /api/{entity}/import
Body: { data: Array<Entity>, options: ImportOptions }
Response: ImportResult
```

## 🌐 Internationalization

Component sử dụng các translation keys:

### Common keys (common.json):
```json
{
  "import": {
    "downloadTemplate": "Download Template",
    "dropFile": "Drag and drop file here",
    "selectFile": "Select file",
    "processing": "Processing...",
    "totalRecords": "Total records",
    "validRecords": "Valid records",
    "errors": "Errors",
    "warnings": "Warnings",
    // ... more keys
  }
}
```

### Entity-specific keys ({entity}.json):
```json
{
  "import": {
    "title": "Import {Entity} List", 
    "instructions": "{Entity} Import Guide",
    "step1": "Download template and fill data",
    "step2": "Check data format",
    "step3": "Upload file to import",
    "success": "Successfully imported {{count}} {entities}",
    "error": "Import failed"
  }
}
```

## 🎨 Customization

### Styling
```typescript
<ImportModal
  isOpen={isOpen}
  onClose={onClose}
  config={config}
  className="max-w-6xl" // Custom width
/>
```

### Column Configuration
```typescript
const columns: ImportColumn[] = [
  {
    key: 'status',
    label: 'Status',
    required: false,
    type: 'select',
    selectOptions: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ],
    validator: (value) => {
      if (!['active', 'inactive'].includes(value)) {
        return 'Invalid status value';
      }
      return null;
    }
  }
];
```

## 📁 File Structure

```
src/shared/
├── components/
│   ├── ImportModal.tsx          # Main component
│   ├── ImportModal.example.tsx  # Usage examples
│   └── index.ts
├── types/
│   ├── import.ts               # Type definitions
│   └── index.ts
└── index.ts
```

## 🔄 Future Enhancements

- [ ] Support for multiple file upload
- [ ] Real-time progress tracking
- [ ] Import history and rollback
- [ ] Advanced filtering and sorting in preview
- [ ] Export validation errors to Excel
- [ ] Support for image/file uploads in cells
- [ ] Batch processing for large files
- [ ] Integration with queue systems

## 💡 Best Practices

1. **Error Handling**: Always implement proper error handling in API calls
2. **Validation**: Use both client-side and server-side validation
3. **Performance**: For large files, consider pagination in preview
4. **UX**: Provide clear instructions and error messages
5. **Testing**: Test with various file formats and edge cases
6. **Security**: Validate file types and sizes on server-side
7. **Accessibility**: Ensure keyboard navigation and screen reader support

## 🐛 Troubleshooting

### Common Issues:

1. **File parsing fails**: Check file format and encoding
2. **Validation errors**: Verify data types and required fields
3. **Import timeout**: Increase server timeout for large files
4. **Memory issues**: Implement streaming for very large files
5. **Translation missing**: Add required keys to translation files

### Debug Mode:

Enable console logging by adding to config:
```typescript
onValidationComplete: (result) => {
  console.log('Validation result:', result);
}
```
