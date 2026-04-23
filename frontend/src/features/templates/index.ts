// Templates feature exports

// Types (explicit to avoid name conflict with TemplateListFilters component)
export type {
    TemplateListFilters,
    TemplateListPermissions,
    UseTemplateListPageReturn,
    StatusOption,
    UploadState,
    UseTemplateUploadPageReturn,
    DateMappingFields,
    TemplateConfigState,
    UseTemplateConfigPageReturn,
    FormsPageTab,
    FormsPageState,
    UseFormsPageReturn,
    Toast,
    ConfirmDialogState,
    TemplateListHeaderProps,
    TemplateListFiltersProps,
    TemplateTableProps,
    UploadHeaderProps,
    FileDropzoneProps,
    TemplateInfoFormProps,
    FormsPageHeaderProps,
} from './types';

// Re-export shared types from templates
export type { Template, TemplateStatus, ConfigureFieldDto, TemplateSubmission } from './types';

// Hooks
export * from './hooks';

// Admin components - exclude TemplateListFilters to avoid conflict with type of same name
export {
  LoadingState,
  FullPageLoading,
  ErrorState,
  TemplateListHeader,
  TemplateListFilters as TemplateListFiltersComponent,
  TemplateTable,
  TemplateEmptyState,
  UploadHeader,
  FileDropzone,
  UploadInstructions,
} from './components/admin';

// Pages
export {
  TemplateListPage,
  TemplateUploadPage,
  TemplateConfigPage,
  FormsPage,
} from './pages';

