/**
 * Example usage of useImportConfig hook
 * These examples show how to use the hook in different pages
 * Note: These are examples only, not actual implementations
 */

import { useImportConfig } from '../hooks/useImportConfig';
import { departmentColumns, classColumns, userColumns, organizationColumns } from '../utils/importColumns';

// Example 1: Departments Page Usage
export const getDepartmentsImportExample = (departmentService: any, t: (key: string) => string) => {
  const hookResult = useImportConfig({
    entityName: 'departments',
    entityService: {
      getTemplate: () => `${process.env.VITE_BACKEND_API_URL}/departments/template`,
      uploadImportFile: departmentService.uploadImportFile.bind(departmentService),
      validateImportData: departmentService.validateImportData.bind(departmentService),
      executeImport: departmentService.executeImport.bind(departmentService),
      getImportStatus: departmentService.getImportStatus.bind(departmentService),
    },
    columns: departmentColumns(t),
    onSuccess: () => {
      // loadDepartments(); // Reload departments data
      console.log('Departments import success');
    },
    onError: (error) => {
      console.error('Departments import error:', error);
    }
  });

  return hookResult;
};

// Example 2: Classes Page Usage  
export const getClassesImportExample = (classService: any, t: (key: string) => string) => {
  const hookResult = useImportConfig({
    entityName: 'classes',
    entityService: {
      getTemplate: () => `${process.env.VITE_BACKEND_API_URL}/classes/template`,
      uploadImportFile: classService.uploadImportFile.bind(classService),
      validateImportData: classService.validateImportData.bind(classService),
      executeImport: classService.executeImport.bind(classService),
      getImportStatus: classService.getImportStatus.bind(classService),
    },
    columns: classColumns(t),
    onSuccess: () => {
      // loadClasses(); // Reload classes data
      console.log('Classes import success');
    },
    onError: (error) => {
      console.error('Classes import error:', error);
    }
  });

  return hookResult;
};

// Example 3: Users Page Usage (Most Complex)
export const getUsersImportExample = (userService: any, t: (key: string) => string) => {
  const hookResult = useImportConfig({
    entityName: 'users',
    entityService: {
      getTemplate: () => userService.getTemplate(),
      uploadImportFile: userService.uploadImportFile.bind(userService),
      validateImportData: userService.validateImportData.bind(userService),
      executeImport: userService.executeImport.bind(userService),
      getImportStatus: userService.getImportStatus.bind(userService),
    },
    columns: userColumns(t), // Pass translation function for better i18n
    templateFileName: 'users_import_template.xlsx', // Custom template filename
    onSuccess: () => {
      // loadUsers(); // Reload users data
      console.log('Users import success');
    },
    onError: (error) => {
      console.error('Users import error:', error);
    }
  });

  return hookResult;
};

// Example 4: Organizations Page Usage (with templateParams)
export const getOrganizationsImportExample = (organizationService: any, level: 2 | 3, t: (key: string) => string) => {
  const hookResult = useImportConfig({
    entityName: 'organizations',
    entityService: {
      getTemplate: (params?: string) => organizationService.getTemplate(params),
      uploadImportFile: organizationService.uploadImportFile.bind(organizationService),
      validateImportData: organizationService.validateImportData.bind(organizationService),
      executeImport: organizationService.executeImport.bind(organizationService),
      getImportStatus: organizationService.getImportStatus.bind(organizationService),
    },
    columns: organizationColumns(level, t), // Pass translation function
    templateParams: { level }, // This gets passed to service methods
    onSuccess: () => {
      // loadOrganizations(); // Reload organizations data
      console.log(`Organizations level ${level} import success`);
    },
    onError: (error) => {
      console.error('Organizations import error:', error);
    }
  });

  return hookResult;
};

// Example 5: How to replace dropdown option onClick
export const getDropdownOptionsExample = (departmentService: any) => {
  const { openImportModal } = useImportConfig({
    entityName: 'departments',
    entityService: {
      getTemplate: () => `${process.env.VITE_BACKEND_API_URL}/departments/template`,
      uploadImportFile: departmentService.uploadImportFile.bind(departmentService),
      validateImportData: departmentService.validateImportData.bind(departmentService),
      executeImport: departmentService.executeImport.bind(departmentService),
      getImportStatus: departmentService.getImportStatus.bind(departmentService),
    },
    columns: departmentColumns((key: string) => key), // Mock translation
    onSuccess: () => {},
    onError: () => {}
  });

  // Before: onClick: () => setIsImportModalOpen(true)
  // After: onClick: openImportModal
  const addDropdownOptions = [
    {
      key: 'single',
      label: 'Create Single',
      onClick: () => console.log('create single')
    },
    {
      key: 'fromFile',
      label: 'Import from File',
      onClick: openImportModal // Use hook function
    }
  ];

  return addDropdownOptions;
};

// Example Usage Pattern:
/*
// In actual component:
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
      loadDepartments();
      showSuccess(t('departments:import.importSuccess'));
    },
    onError: (error) => {
      console.error('Import error:', error);
      showError(t('departments:import.importError'));
    }
  });

  // Use in dropdown:
  const addDropdownOptions = [
    {
      key: 'fromFile',
      label: t('departments:addButton.fromFile'),
      icon: <Upload className="w-4 h-4" />,
      description: t('departments:addButton.fromFileDescription'),
      onClick: openImportModal // Replace setIsImportModalOpen(true)
    }
  ];

  // Use in JSX:
  return (
    <div>
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        config={importConfig}
      />
    </div>
  );
};
*/
