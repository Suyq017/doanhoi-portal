# Shared Hooks

## useImportConfig

Custom hook for standardizing import functionality across modules.

### Features
- ✅ Reduces code duplication
- ✅ Built-in modal state management  
- ✅ Loading states and error handling
- ✅ i18n integration
- ✅ Template parameter support
- ✅ Type-safe service interface

### Quick Usage

```typescript
import { useImportConfig } from '../shared';
import { departmentColumns } from '../shared/utils/importColumns';

const { 
  importConfig, 
  isImportModalOpen, 
  openImportModal, 
  closeImportModal 
} = useImportConfig({
  entityName: 'departments',
  entityService: departmentService,
  columns: departmentColumns(t),
  onSuccess: loadDepartments,
  onError: console.error
});
```

### Documentation

See [full documentation](../docs/useImportConfig.md) for detailed usage, examples, and migration guide.

### Files

- `useImportConfig.ts` - Main hook implementation
- `../utils/importColumns.ts` - Predefined column configurations
- `../examples/useImportConfigExamples.ts` - Usage examples
- `../docs/useImportConfig.md` - Complete documentation
