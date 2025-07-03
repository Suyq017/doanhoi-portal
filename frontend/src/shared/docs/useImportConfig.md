# useImportConfig Hook Documentation

## Overview

The `useImportConfig` hook is a custom React hook that standardizes import functionality across different modules (Departments, Users, Classes, Organizations). It reduces code duplication by providing a reusable configuration for the ImportModal component.

## Features

- ✅ **Standardized import logic** across all modules
- ✅ **Built-in loading states** and error handling
- ✅ **Modal state management** included
- ✅ **Template parameter support** (for Organizations)
- ✅ **Type-safe service interface**
- ✅ **i18n integration** for success/error messages
- ✅ **Customizable callbacks** for success/error handling

## Installation

The hook is already available in the shared hooks:

```typescript
import { useImportConfig } from '../shared/hooks/useImportConfig';
// or
import { useImportConfig } from '../shared';
```

## Basic Usage

### 1. Simple Usage (Departments)

```typescript
import { useImportConfig } from '../shared';
import { departmentColumns } from '../shared/utils/importColumns';

const DepartmentsPage = () => {
  const { t } = useTranslation(['departments', 'common']);
  
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
      loadDepartments(); // Reload your data
    },
    onError: (error) => {
      console.error('Import error:', error);
    }
  });

  // Use in dropdown options
  const addDropdownOptions = [
    {
      key: 'fromFile',
      label: t('departments:addButton.fromFile'),
      onClick: openImportModal // Replace manual state setter
    }
  ];

  return (
    <div>
      {/* Your existing UI */}
      
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        config={importConfig}
      />
    </div>
  );
};
```

### 2. Advanced Usage (Users with Custom Logic)

```typescript
const UsersPage = () => {
  const { importConfig, openImportModal, closeImportModal } = useImportConfig({
    entityName: 'users',
    entityService: {
      getTemplate: () => userService.getTemplate(),
      uploadImportFile: userService.uploadImportFile.bind(userService),
      validateImportData: userService.validateImportData.bind(userService),
      executeImport: userService.executeImport.bind(userService),
      getImportStatus: userService.getImportStatus.bind(userService),
    },
    columns: userColumns(), // Complex columns with select options
    templateFileName: 'users_import_template.xlsx', // Custom filename
    onSuccess: () => {
      loadUsers();
      // Additional custom logic
    },
    onError: (error) => {
      // Custom error handling
    }
  });

  // Rest of component...
};
```

### 3. Organizations with Template Parameters

```typescript
const OrganizationsPage = () => {
  const level = 2; // or 3
  
  const { importConfig, openImportModal } = useImportConfig({
    entityName: 'organizations',
    entityService: organizationService,
    columns: organizationColumns(level),
    templateParams: { level }, // Gets passed to service methods
    onSuccess: () => {
      // Reload organizations
    }
  });
  
  // Rest of component...
};
```

## API Reference

### Parameters

```typescript
interface UseImportConfigOptions {
  // Required
  entityName: string;                    // 'departments', 'users', 'classes', 'organizations'
  entityService: ImportServiceInterface; // Service implementing required methods
  columns: ImportColumn[];               // Column definitions
  
  // Optional
  templateParams?: Record<string, any>;  // For organizations level, etc.
  templateFileName?: string;             // Override default template filename
  onSuccess?: () => void;                // Success callback
  onError?: (error: Error) => void;      // Error callback
  processingMode?: 'client' | 'server';  // Default: 'server'
  maxFileSize?: number;                  // Default: 5MB
  acceptedFileTypes?: string[];          // Default: ['.xlsx', '.xls']
}
```

### Return Value

```typescript
interface UseImportConfigReturn {
  importConfig: ImportModalConfig<any>;  // Configuration for ImportModal
  isImporting: boolean;                  // Loading state during import
  isImportModalOpen: boolean;            // Modal open/close state
  openImportModal: () => void;           // Function to open modal
  closeImportModal: () => void;          // Function to close modal
  setIsImportModalOpen: (open: boolean) => void; // Manual state setter
}
```

### Service Interface

Your service must implement these methods:

```typescript
interface ImportServiceInterface {
  getTemplate(params?: string): string;
  uploadImportFile(file: File, ...extraParams: any[]): Promise<ServerImportSession>;
  validateImportData(sessionId: string): Promise<ServerValidationResult>;
  executeImport(sessionId: string, options?: any): Promise<ServerImportResult>;
  getImportStatus(sessionId: string): Promise<any>;
}
```

## Column Definitions

Use predefined column configurations:

```typescript
import { 
  departmentColumns, 
  classColumns, 
  userColumns, 
  organizationColumns 
} from '../shared/utils/importColumns';

// Usage
columns: departmentColumns(t)          // For departments
columns: classColumns(t)               // For classes
columns: userColumns()                 // For users (no translation needed)
columns: organizationColumns(2)        // For organizations (level 2 or 3)
```

## Migration from Manual Config

### Before (Manual importConfig)

```typescript
// ~40-100 lines of repetitive code
const importConfig: ImportModalConfig<any> = {
  templateUrl: `${import.meta.env.VITE_BACKEND_API_URL}/departments/template`,
  templateFileName: t('departments:import.templateFile'),
  acceptedFileTypes: ['.xlsx', '.xls'],
  maxFileSize: 5 * 1024 * 1024,
  processingMode: 'server',
  uploadFile: departmentService.uploadImportFile.bind(departmentService),
  validateServerData: departmentService.validateImportData.bind(departmentService),
  executeServerImport: departmentService.executeImport.bind(departmentService),
  getImportStatus: departmentService.getImportStatus.bind(departmentService),
  columns: [...],
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

const [isImportModalOpen, setIsImportModalOpen] = useState(false);
```

### After (useImportConfig Hook)

```typescript
// ~10 lines of configuration
const { 
  importConfig, 
  isImportModalOpen, 
  openImportModal, 
  closeImportModal 
} = useImportConfig({
  entityName: 'departments',
  entityService: departmentService,
  columns: departmentColumns(t),
  onSuccess: () => loadDepartments(),
  onError: (error) => console.error('Import error:', error)
});
```

## Benefits

1. **Code Reduction**: 80-90% less boilerplate code
2. **Consistency**: Standardized behavior across all modules
3. **Maintainability**: Single source of truth for import logic
4. **Type Safety**: Full TypeScript support
5. **Error Handling**: Built-in error handling and loading states
6. **i18n Integration**: Automatic success/error messages

## Troubleshooting

### Service Interface Compatibility

Make sure your service implements the required interface. If your service has different method signatures, create an adapter:

```typescript
const adaptedService: ImportServiceInterface = {
  getTemplate: (params?: string) => myService.getTemplateUrl(params),
  uploadImportFile: (file: File, ...params) => myService.upload(file, ...params),
  validateImportData: (sessionId: string) => myService.validate(sessionId),
  executeImport: (sessionId: string, options?: any) => myService.execute(sessionId, options),
  getImportStatus: (sessionId: string) => myService.status(sessionId),
};
```

### Custom Validation Logic

For complex validation logic (like Users), you can override the service methods:

```typescript
entityService: {
  // ... other methods
  validateImportData: async (sessionId: string) => {
    const result = await userService.validateImportData(sessionId);
    // Custom mapping logic here
    return transformedResult;
  }
}
```

### Template Parameters

For services that need additional parameters (like Organizations), use `templateParams`:

```typescript
templateParams: { level: 2 } // Gets passed to all service methods
```

## Examples

See `shared/examples/useImportConfigExamples.ts` for complete usage examples for all modules.

## Future Enhancements

- Progress tracking support
- Batch processing capabilities
- Custom validation rules
- Import history tracking
- Performance optimizations
