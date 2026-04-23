// Types and interfaces for templates feature
import type { Template, TemplateStatus, ConfigureFieldDto, TemplateSubmission } from '@/shared/types/template.types';

// ==================== Admin Types ====================

// Template List Page
export interface TemplateListPermissions {
    canManageTemplates: boolean;
}

export interface TemplateListFilters {
    statusFilter: string;
    searchInput: string;
    debouncedSearch: string;
    currentPage: number;
    limit: number;
}

export interface UseTemplateListPageReturn {
    // Data
    templates: Template[];
    total: number;
    totalPages: number;
    isLoading: boolean;
    error: Error | null;

    // Filters
    filters: TemplateListFilters;
    statusOptions: StatusOption[];

    // Actions
    setSearchInput: (value: string) => void;
    setStatusFilter: (value: string) => void;
    setCurrentPage: (page: number) => void;
    setLimit: (limit: number) => void;
    handleDelete: (id: string, name: string) => Promise<void>;
    handleNavigateToUpload: () => void;

    // UI State
    statusDropdownOpen: boolean;
    setStatusDropdownOpen: (open: boolean) => void;

    // Permissions
    permissions: TemplateListPermissions;
    hasActiveS3Config: boolean;
    isCheckingS3Config: boolean;

    // Toast & Dialog
    toasts: Toast[];
    hideToast: (id: string) => void;
    confirmDialog: ConfirmDialogState;
}

export interface StatusOption {
    value: string;
    label: string;
}

// Template Upload Page
export interface UploadState {
    name: string;
    description: string;
    file: File | null;
    step: 'upload' | 'info';
    detectedFields: string[];
    placeholderCounts: Record<string, number>;
    isParsing: boolean;
    dragActive: boolean;
}

export interface UseTemplateUploadPageReturn {
    // State
    state: UploadState;

    // Actions
    setName: (name: string) => void;
    setDescription: (description: string) => void;
    handleFileChange: (file: File) => void;
    handleCancelFile: () => void;
    handleSubmit: (e: React.FormEvent) => void;
    handleDrag: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;

    // Mutation
    isUploading: boolean;

    // Toast
    toasts: Toast[];
    hideToast: (id: string) => void;
}

// Template Config Page
export interface DateMappingFields {
    dayFieldIndex: number | null;
    monthFieldIndex: number | null;
    yearFieldIndex: number | null;
}

export interface TemplateConfigState {
    fields: ConfigureFieldDto[];
    selectedFields: Set<number>;
    showDateMappingDialog: boolean;
    dateMappingFields: DateMappingFields;
    templateName: string;
    templateDescription: string;
    templateStatus: TemplateStatus;
    statusDropdownOpen: boolean;
}

export interface UseTemplateConfigPageReturn {
    // Data
    template: Template | undefined;
    isLoading: boolean;

    // State
    state: TemplateConfigState;
    statusOptions: StatusOption[];

    // Actions
    setTemplateName: (name: string) => void;
    setTemplateDescription: (description: string) => void;
    setTemplateStatus: (status: TemplateStatus) => void;
    setStatusDropdownOpen: (open: boolean) => void;
    updateField: (index: number, updates: Partial<ConfigureFieldDto>) => void;
    toggleFieldSelection: (index: number) => void;
    mergeFieldsToDate: () => void;
    performMerge: (mapping: { dayFieldIndex: number; monthFieldIndex: number; yearFieldIndex: number } | null) => void;
    unmergeField: (index: number) => void;
    setShowDateMappingDialog: (show: boolean) => void;
    setDateMappingFields: (fields: DateMappingFields) => void;
    handleSubmit: (e: React.FormEvent) => void;

    // Mutation
    isSaving: boolean;

    // Helper
    isFieldMapped: (fieldName: string) => boolean;

    // Toast
    toasts: Toast[];
    hideToast: (id: string) => void;
}

// ==================== User Types ====================

// Forms Page (User)
export interface FormsPageTab {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

export interface FormsPageState {
    activeTab: string;
    selectedTemplateId: string | null;
    editingSubmission: TemplateSubmission | null;
    returnTab: string;
}

export interface UseFormsPageReturn {
    // State
    state: FormsPageState;
    tabs: FormsPageTab[];

    // Actions
    handleTabChange: (tabId: string) => void;
    handleSelectTemplate: (templateId: string) => void;
    handleBackToList: () => void;
    handleSubmitSuccess: (message: string, status?: 'completed' | 'failed' | 'pending') => void;
    handleEditSubmission: (submission: TemplateSubmission) => void;

    // Toast
    toasts: Toast[];
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    hideToast: (id: string) => void;
}

// ==================== Shared Types ====================

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

export interface ConfirmDialogState {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm?: () => void;
    onCancel?: () => void;
}

// ==================== Component Props ====================

export interface TemplateListHeaderProps {
    canManageTemplates: boolean;
    onNavigateToUpload: () => void;
    hasActiveS3Config: boolean;
    isCheckingS3Config: boolean;
}

export interface TemplateListFiltersProps {
    searchInput: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    statusOptions: StatusOption[];
    onStatusChange: (value: string) => void;
    statusDropdownOpen: boolean;
    onStatusDropdownOpenChange: (open: boolean) => void;
    statusDropdownRef: React.RefObject<HTMLDivElement>;
}

export interface TemplateTableProps {
    templates: Template[];
    canManageTemplates: boolean;
    onConfigure: (id: string) => void;
    onDelete: (id: string, name: string) => void;
    isDeleting: boolean;
}

export interface UploadHeaderProps {
    onBack: () => void;
}

export interface FileDropzoneProps {
    dragActive: boolean;
    onDrag: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onFileSelect: (file: File) => void;
}

export interface TemplateInfoFormProps {
    file: File;
    name: string;
    description: string;
    detectedFields: string[];
    placeholderCounts: Record<string, number>;
    isParsing: boolean;
    isUploading: boolean;
    onNameChange: (name: string) => void;
    onDescriptionChange: (description: string) => void;
    onCancelFile: () => void;
}

export interface FormsPageHeaderProps {
    tabs: FormsPageTab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

// Re-export shared types
export type { Template, TemplateStatus, ConfigureFieldDto, TemplateSubmission };
