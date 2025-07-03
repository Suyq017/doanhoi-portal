import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from './useToast';
import { 
  ImportModalConfig, 
  ImportColumn, 
  ServerImportSession, 
  ServerValidationResult, 
  ServerImportResult 
} from '../types/import';

// Service interface that all import services must implement
export interface ImportServiceInterface {
  // Template
  getTemplate(params?: string): string;
  
  // Server-side processing (required methods)
  uploadImportFile(file: File, ...extraParams: any[]): Promise<ServerImportSession>;
  validateImportData(sessionId: string): Promise<ServerValidationResult | any>;
  executeImport(sessionId: string, options?: any): Promise<ServerImportResult>;
  getImportStatus(sessionId: string): Promise<any>;
}

// Hook options interface
export interface UseImportConfigOptions {
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

// Hook return interface
export interface UseImportConfigReturn {
  importConfig: ImportModalConfig<any>;
  isImporting: boolean;
  isImportModalOpen: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;
  setIsImportModalOpen: (open: boolean) => void;
}

/**
 * Custom hook for import configuration
 * Reduces code duplication across modules (Departments, Users, Classes, Organizations)
 * Provides standardized import functionality with customizable options
 */
export const useImportConfig = (options: UseImportConfigOptions): UseImportConfigReturn => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
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
    return t(`${entityName}:import.templateFile`, {
      defaultValue: `${entityName}${suffix}_template.xlsx`
    });
  }, [entityName, templateFileName, templateParams, t]);

  // Modal control functions
  const openImportModal = () => setIsImportModalOpen(true);
  const closeImportModal = () => setIsImportModalOpen(false);

  // Create import config with standardized logic
  const importConfig: ImportModalConfig<any> = useMemo(() => ({
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
        
        // Check if result has custom validation structure (like Users service)
        if ((result as any).validationResults) {
          // Format from Users service (complex validation with nested structure)
          const customResult = result as any;
          mappedPreviewData = customResult.validationResults.map((item: any) => ({
            ...item.data,
            _rowIndex: item.rowIndex,
            _hasError: !item.validation?.isValid,
            _errors: item._errors || [],
            _warnings: item._warnings || []
          }));
        } else if (result.previewData) {
          // Format from other services (direct preview data)
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
      closeImportModal();
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
    isImporting,
    isImportModalOpen,
    openImportModal,
    closeImportModal,
    setIsImportModalOpen
  };
};
