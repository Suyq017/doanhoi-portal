import React, { useState, useRef } from 'react';
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  ImportModalConfig,
  ImportState,
  ImportStep
} from '../types/import';

interface ImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  config: ImportModalConfig<T>;
  className?: string;
}

const ImportModal = <T extends Record<string, any>>({
  isOpen,
  onClose,
  config,
  className = ''
}: ImportModalProps<T>) => {
  const { t } = useTranslation(['common', config.entityName]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<ImportState<T>>({
    step: 'upload',
    selectedFile: null,
    importData: null,
    importResult: null,
    // Server-side state
    serverSession: null,
    serverValidation: null,
    serverResult: null,
    options: {
      skipErrors: true,
      updateExisting: false,
      dryRun: false,
      batchSize: 100
    },
    loading: false,
    dragActive: false
  });

  const [showAllRows, setShowAllRows] = useState(false);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  // File validation
  const isValidFile = (file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!config.acceptedFileTypes.includes(fileExtension)) {
      alert(t('errors.invalidFileType'));
      return false;
    }

    if (file.size > config.maxFileSize) {
      alert(t('errors.fileTooLarge'));
      return false;
    }

    return true;
  };

  // File handling - supports both client and server processing
  const handleFileSelect = async (file: File) => {
    if (!isValidFile(file)) return;

    setState(prev => ({ ...prev, selectedFile: file, loading: true }));

    try {
      if (config.processingMode === 'server') {
        // Server-side processing
        if (!config.uploadFile) {
          throw new Error('uploadFile function not provided for server mode');
        }

        const serverSession = await config.uploadFile(file);

        // Automatically validate after upload
        if (!config.validateServerData) {
          throw new Error('validateServerData function not provided for server mode');
        }

        const validationResult = await config.validateServerData(serverSession.sessionId);
        
        // Auto-fill dữ liệu cho server-side processing
        if (validationResult.previewData) {
          let totalAutoFilled = 0;
          validationResult.previewData = validationResult.previewData.map((item: any) => {
            const modified: Record<string, boolean> = {};
            
            // Tìm field email (case-insensitive và nhiều pattern khác nhau)
            const emailField = Object.keys(item).find(key => {
              const lowerKey = key.toLowerCase();
              return lowerKey.includes('email') || lowerKey.includes('mail') || lowerKey.includes('gmail');
            });
            
            // Tìm field password (case-insensitive) hoặc tạo mới
            let passwordField = Object.keys(item).find(key => {
              const lowerKey = key.toLowerCase();
              return lowerKey.includes('password') || lowerKey.includes('matkhau') || lowerKey.includes('pass');
            });
            
            // Nếu không tìm thấy field password, tạo field mới
            if (!passwordField) {
              passwordField = 'password';
              item[passwordField] = ''; // Khởi tạo với giá trị rỗng
            }
            
            // Tìm field isActive (case-insensitive và nhiều pattern khác nhau)
            const isActiveField = Object.keys(item).find(key => {
              const lowerKey = key.toLowerCase();
              return lowerKey === 'isactive' || lowerKey === 'active' || 
                     lowerKey === 'hoatdong' || lowerKey === 'is_active' ||
                     lowerKey === 'activestatus' || lowerKey === 'status';
            });
            
            const emailValue = emailField ? item[emailField] : null;
            
            // Auto-fill isActive = true (luôn luôn, kể cả khi đã có giá trị)
            if (isActiveField) {
              // Luôn set isActive = true, bất kể giá trị hiện tại
              if (item[isActiveField] !== true) {
                item[isActiveField] = true;
                modified[isActiveField] = true;
              }
            } else {
              // Nếu không tìm thấy field isActive, tạo mới với key 'isActive'
              item['isActive'] = true;
              modified['isActive'] = true;
            }
            
            // Auto-fill password từ email prefix nếu trống hoặc là '-'
            if (emailValue && passwordField && (!item[passwordField] || item[passwordField] === '' || item[passwordField] === '-')) {
              const emailPrefix = emailValue.split('@')[0];
              item[passwordField] = emailPrefix;
              modified[passwordField] = true;
            }
            
            // Debug logging - luôn log để biết đã xử lý
            console.log(`Server-side processing for ${emailValue || 'NO_EMAIL'}:`, {
              emailField,
              passwordField,
              isActiveField: isActiveField || 'isActive (new)',
              currentValues: {
                email: emailValue,
                password: passwordField ? item[passwordField] : 'NOT_FOUND',
                isActive: isActiveField ? item[isActiveField] : item['isActive']
              },
              modified,
              itemAfter: item
            });
            
            return item;
          });
          
          console.log(`Total auto-filled records: ${totalAutoFilled}`);
        }
        
        config.onValidationComplete?.(validationResult);

        setState(prev => ({
          ...prev,
          serverSession,
          serverValidation: validationResult,
          step: 'preview',
          loading: false
        }));
      } else {
        // Client-side processing (legacy)
        if (!config.parseFile || !config.validateData) {
          throw new Error('parseFile and validateData functions required for client mode');
        }

        const parsedData = await config.parseFile(file);
        
        // Auto-fill dữ liệu
        let totalAutoFilled = 0;
        const processedData = parsedData.map(item => {
          const processedItem = { ...item } as any;
          const modified: Record<string, boolean> = {};
          
          // Tìm field email (case-insensitive và nhiều pattern khác nhau)
          const emailField = Object.keys(processedItem).find(key => {
            const lowerKey = key.toLowerCase();
            return lowerKey.includes('email') || lowerKey.includes('mail') || lowerKey.includes('gmail');
          });
          
          // Tìm field password (case-insensitive) hoặc tạo mới
          let passwordField = Object.keys(processedItem).find(key => {
            const lowerKey = key.toLowerCase();
            return lowerKey.includes('password') || lowerKey.includes('matkhau') || lowerKey.includes('pass');
          });
          
          // Nếu không tìm thấy field password, tạo field mới
          if (!passwordField) {
            passwordField = 'password';
            processedItem[passwordField] = ''; // Khởi tạo với giá trị rỗng
          }
          
          // Tìm field isActive (case-insensitive và nhiều pattern khác nhau)
          const isActiveField = Object.keys(processedItem).find(key => {
            const lowerKey = key.toLowerCase();
            return lowerKey === 'isactive' || lowerKey === 'active' || 
                   lowerKey === 'hoatdong' || lowerKey === 'is_active' ||
                   lowerKey === 'activestatus' || lowerKey === 'status';
          });
          
          const emailValue = emailField ? processedItem[emailField] : null;
          
          // Auto-fill isActive = true (luôn luôn, kể cả khi đã có giá trị)
          if (isActiveField) {
            // Luôn set isActive = true, bất kể giá trị hiện tại
            if (processedItem[isActiveField] !== true) {
              processedItem[isActiveField] = true;
              modified[isActiveField] = true;
            }
          } else {
            // Nếu không tìm thấy field isActive, tạo mới với key 'isActive'
            processedItem['isActive'] = true;
            modified['isActive'] = true;
          }
          
          // Auto-fill password từ email prefix nếu trống hoặc là '-'
          if (emailValue && passwordField && (!processedItem[passwordField] || processedItem[passwordField] === '' || processedItem[passwordField] === '-')) {
            const emailPrefix = emailValue.split('@')[0];
            processedItem[passwordField] = emailPrefix;
            modified[passwordField] = true;
          }
          
          // Debug logging - luôn log để biết đã xử lý
          console.log(`Client-side processing for ${emailValue || 'NO_EMAIL'}:`, {
            emailField,
            passwordField,
            isActiveField: isActiveField || 'isActive (new)',
            currentValues: {
              email: emailValue,
              password: passwordField ? processedItem[passwordField] : 'NOT_FOUND',
              isActive: isActiveField ? processedItem[isActiveField] : processedItem['isActive']
            },
            modified,
            itemAfter: processedItem
          });
          
          // Đánh dấu các field đã được auto-fill
          if (Object.keys(modified).length > 0) {
            processedItem._autoFilled = modified;
            totalAutoFilled++;
          }
          
          return processedItem;
        });
        
        console.log(`Total client-side auto-filled records: ${totalAutoFilled}`);
        
        const validationResult = await config.validateData(processedData as T[]);

        config.onValidationComplete?.(validationResult);

        setState(prev => ({
          ...prev,
          importData: validationResult,
          step: 'preview',
          loading: false
        }));
      }
    } catch (error) {
      console.error('File processing error:', error);
      alert(t('errors.parseFile'));
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, dragActive: false }));

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, dragActive: true }));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, dragActive: false }));
  };

  // Import process - supports both client and server processing
  const handleImport = async () => {
    setState(prev => ({ ...prev, step: 'importing', loading: true }));

    try {
      if (config.processingMode === 'server') {
        // Server-side import
        if (!state.serverSession || !config.executeServerImport) {
          throw new Error('Server session or executeServerImport function not available');
        }

        const result = await config.executeServerImport(
          state.serverSession.sessionId,
          { skipConflicts: state.options.skipErrors }
        );

        setState(prev => ({
          ...prev,
          serverResult: result,
          step: 'result',
          loading: false
        }));

        if (result.success) {
          config.onSuccess?.(result);
        }
      } else {
        // Client-side import (legacy)
        if (!state.importData || !config.importData) {
          throw new Error('Import data or importData function not available');
        }

        const result = await config.importData(state.importData.data, state.options);

        setState(prev => ({
          ...prev,
          importResult: result,
          step: 'result',
          loading: false
        }));

        if (result.failed === 0) {
          config.onSuccess?.(result);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      config.onError?.(error as Error);
      setState(prev => ({ ...prev, step: 'preview', loading: false }));
    }
  };

  // Reset state
  const resetImport = () => {
    setState({
      step: 'upload',
      selectedFile: null,
      importData: null,
      importResult: null,
      // Server-side state
      serverSession: null,
      serverValidation: null,
      serverResult: null,
      options: {
        skipErrors: true,
        updateExisting: false,
        dryRun: false,
        batchSize: 100
      },
      loading: false,
      dragActive: false
    });
    setShowAllRows(false);
    setShowOnlyErrors(false);
  };

  // Utility functions
  const renderCellValue = (value: any, type: string, item?: any, fieldKey?: string): React.ReactNode => {
    if (value === null || value === undefined || value === '') {
      return <span className="italic text-gray-400">-</span>;
    }

    const isAutoFilled = item?._autoFilled && fieldKey && item._autoFilled[fieldKey];

    const renderValue = () => {
      switch (type) {
        case 'boolean':
          return value ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          );
        case 'date':
          return new Date(value).toLocaleDateString();
        case 'number':
          return typeof value === 'number' ? value.toLocaleString('en-US', { useGrouping: false }) : value;
        default:
          return String(value);
      }
    };

    const valueElement = renderValue();

    if (isAutoFilled) {
      return (
        <div className="flex items-center gap-2">
          {valueElement}
          <span className="text-blue-500 text-xs italic font-medium">
            ({t('common:import.autoFilled')})
          </span>
        </div>
      );
    }

    return valueElement;
  };

  const getDisplayRows = () => {
    // For server-side processing, we use previewData directly
    if (config.processingMode === 'server' && state.serverValidation) {
      let rows = state.serverValidation.previewData || [];

      if (showOnlyErrors) {
        rows = rows.filter(row => row.hasErrors);
      }

      if (!showAllRows) {
        rows = rows.slice(0, config.previewRowCount || 10);
      }

      return rows;
    }

    // For client-side processing (legacy)
    if (!state.importData) return [];

    let rows = state.importData.data;

    if (showOnlyErrors) {
      rows = rows.filter(row => row._hasError);
    }

    if (!showAllRows) {
      rows = rows.slice(0, config.previewRowCount || 10);
    }

    return rows;
  };

  // Render steps
  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
              {t(`${config.entityName}:import.instructions`)}
            </h4>
            <ol className="space-y-1 text-sm text-blue-800 list-decimal list-inside dark:text-blue-200">
              <li>
                {t(`${config.entityName}:import.step1`).includes(t(`${config.entityName}:import.templateLinkText`)) ? (
                  <>
                    {t(`${config.entityName}:import.step1`).split(t(`${config.entityName}:import.templateLinkText`))[0]}
                    <a
                      href={config.templateUrl}
                      download={config.templateFileName}
                      className="font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      {t(`${config.entityName}:import.templateLinkText`)}
                    </a>
                    {t(`${config.entityName}:import.step1`).split(t(`${config.entityName}:import.templateLinkText`))[1]}
                  </>
                ) : (
                  t(`${config.entityName}:import.step1`)
                )}
              </li>
              <li>{t(`${config.entityName}:import.step2`)}</li>
              <li>{t(`${config.entityName}:import.step3`)}</li>
            </ol>
          </div>
        </div>
      </div>

      {/* File Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${state.dragActive
          ? 'border-doan-400 bg-doan-50 dark:bg-doan-900/20 scale-105'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className={`mx-auto h-12 w-12 mb-4 transition-colors ${state.dragActive ? 'text-doan-500' : 'text-gray-400'
          }`} />

        <p className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          {state.dragActive ? t('import.dropFileNow') : t('import.dropFile')}
        </p>

        <p className="mb-4 text-gray-500 dark:text-gray-400">
          {config.acceptedFileTypes.includes('.xlsx') && config.acceptedFileTypes.length === 1
            ? t(`${config.entityName}:import.onlyExcelAllowed`)
            : `${t('import.supportedFormats')}: ${config.acceptedFileTypes.join(', ')}`
          }
          <br />
          {t('import.maxFileSize')}: {(config.maxFileSize / (1024 * 1024)).toFixed(1)}MB
        </p>

        <input
          type="file"
          accept={config.acceptedFileTypes.join(',')}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
          ref={fileInputRef}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={state.loading}
          className="inline-flex items-center px-6 py-3 font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.loading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {state.loading ? t('import.processing') : t('import.selectFile')}
        </button>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    // Support both client-side and server-side processing
    const validationData = config.processingMode === 'server'
      ? state.serverValidation
      : state.importData;

    if (!validationData) return null;

    // Adapt data structure for display - server response has different format
    let displayRows, summary, errors, warnings;

    if (config.processingMode === 'server' && state.serverValidation) {
      // Server-side data structure
      displayRows = state.serverValidation.previewData || [];
      summary = state.serverValidation.summary;
      errors = state.serverValidation.errors || [];
      warnings = state.serverValidation.warnings || [];
    } else if (state.importData) {
      // Client-side data structure
      displayRows = getDisplayRows();
      summary = state.importData.summary;
      errors = state.importData.errors;
      warnings = state.importData.warnings;
    } else {
      return null;
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="p-4 text-center rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.total}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('import.totalRecords')}
            </div>
          </div>

          <div className="p-4 text-center rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {summary.valid}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              {t('import.validRecords')}
            </div>
          </div>

          <div className="p-4 text-center rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {errors.length}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              {t('import.error')}
            </div>
          </div>

          <div className="p-4 text-center rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {warnings.length}
            </div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">
              {t('import.warnings')}
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowOnlyErrors(!showOnlyErrors)}
              className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${showOnlyErrors
                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
            >
              {showOnlyErrors ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
              {t('import.showOnlyErrors')}
            </button>

            <button
              onClick={() => setShowAllRows(!showAllRows)}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-md dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {showAllRows ? t('import.showLess') : t('import.showAll')}
              {!showAllRows && config.processingMode === 'client' && state.importData &&
                ` (${Math.min(config.previewRowCount || 10, state.importData.data.length)}/${state.importData.data.length})`
              }
            </button>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('import.showingRows', {
              count: displayRows.length,
              total: showOnlyErrors ? summary.invalid : summary.total
            })}
          </div>
        </div>

        {/* Preview Table */}
        <div className="overflow-hidden border rounded-lg">
          <div className="overflow-auto max-h-96">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                    {t('common:fields.order')}
                  </th>
                  {config.columns.map(col => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400"
                      style={col.width ? { width: col.width } : {}}
                    >
                      {col.label}
                      {col.required && <span className="ml-1 text-red-500">*</span>}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-400">
                    {t('common:fields.dataStatus')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayRows.map((item, index) => {
                  // Handle different data structures between client and server mode
                  const hasErrors = config.processingMode === 'server'
                    ? item.hasErrors
                    : item._hasError;
                  const hasWarnings = config.processingMode === 'server'
                    ? item.hasWarnings
                    : item._warnings?.length > 0;
                  // Display sequential order number (Thứ tự) instead of original row number
                  const orderNumber = index + 1;

                  return (
                    <tr
                      key={index}
                      className={`transition-colors ${hasErrors
                        ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                        : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      <td className="px-4 py-3 font-mono text-sm text-gray-500 dark:text-gray-400">
                        {orderNumber}
                      </td>
                      {config.columns.map(col => (
                        <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {renderCellValue(item[col.key], col.type, item, col.key)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        {hasErrors ? (
                          <div className="flex items-center justify-center">
                            <AlertTriangle
                              className="w-4 h-4 text-red-500"
                            />
                          </div>
                        ) : hasWarnings ? (
                          <div className="flex items-center justify-center">
                            <AlertCircle
                              className="w-4 h-4 text-yellow-500"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Error Details */}
        {errors.length > 0 && (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <h5 className="flex items-center mb-3 font-medium text-red-800 dark:text-red-200">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t('import.validationErrors')} ({errors.length})
            </h5>
            <div className="overflow-auto max-h-32">
              <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                {errors.slice(0, 10).map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="font-mono text-xs bg-red-100 dark:bg-red-900/30 px-1 rounded mr-2 mt-0.5">
                      {error.row}
                    </span>
                    <span className="mr-2 font-medium">{error.column}:</span>
                    <span>{error.message}</span>
                  </li>
                ))}
                {errors.length > 10 && (
                  <li className="italic text-red-600 dark:text-red-400">
                    {t('import.andMoreErrors', { count: errors.length - 10 })}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Import Options */}
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <h4 className="mb-3 font-medium text-gray-900 dark:text-white">
            {t('import.options')}
          </h4>
          <div className="space-y-3">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={state.options.skipErrors}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  options: { ...prev.options, skipErrors: e.target.checked }
                }))}
                className="mt-1 mr-3 text-doan-500 focus:ring-doan-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('import.skipErrorRows')}
                </span>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('import.skipErrorRowsDescription')}
                </p>
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={state.options.updateExisting}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  options: { ...prev.options, updateExisting: e.target.checked }
                }))}
                className="mt-1 mr-3 text-doan-500 focus:ring-doan-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('import.updateExisting')}
                </span>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('import.updateExistingDescription')}
                </p>
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={state.options.dryRun || false}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  options: { ...prev.options, dryRun: e.target.checked }
                }))}
                className="mt-1 mr-3 text-doan-500 focus:ring-doan-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('import.dryRun')}
                </span>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('import.dryRunDescription')}
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="py-12 text-center">
      <RefreshCw className="w-16 h-16 mx-auto mb-4 text-doan-500 animate-spin" />
      <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
        {state.options.dryRun ? t('import.validating') : t('import.importing')}
      </h3>
      <p className="mb-4 text-gray-500 dark:text-gray-400">
        {t('import.pleaseWait')}
      </p>
      <div className="h-2 max-w-md mx-auto bg-gray-200 rounded-full dark:bg-gray-700">
        <div className="h-2 rounded-full bg-doan-500 animate-pulse" style={{ width: '60%' }}></div>
      </div>
    </div>
  );

  const renderResultStep = () => {
    // Support both client-side and server-side results
    const result = config.processingMode === 'server' ? state.serverResult : state.importResult;
    if (!result) return null;

    // Adapt data structure for display
    let total: number, success: number, failed: number, skipped: number, isSuccess: boolean, isPartialSuccess: boolean;
    let errors: string[], warnings: string[];

    if (config.processingMode === 'server' && state.serverResult) {
      // Server-side result structure
      total = state.serverResult.importedCount + state.serverResult.skippedCount + state.serverResult.failedCount;
      success = state.serverResult.importedCount;
      failed = state.serverResult.failedCount;
      skipped = state.serverResult.skippedCount;
      errors = state.serverResult.errors || [];
      warnings = []; // Server result doesn't have warnings field
    } else if (state.importResult) {
      // Client-side result structure
      total = state.importResult.total;
      success = state.importResult.success;
      failed = state.importResult.failed;
      skipped = state.importResult.skipped;
      errors = state.importResult.errors || [];
      warnings = state.importResult.warnings || [];
    } else {
      return null;
    }

    isSuccess = failed === 0;
    isPartialSuccess = success > 0 && failed > 0;

    return (
      <div className="py-8 text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isSuccess
          ? 'bg-green-100 dark:bg-green-900/20'
          : isPartialSuccess
            ? 'bg-yellow-100 dark:bg-yellow-900/20'
            : 'bg-red-100 dark:bg-red-900/20'
          }`}>
          {isSuccess ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : isPartialSuccess ? (
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          ) : (
            <XCircle className="w-8 h-8 text-red-500" />
          )}
        </div>

        <h3 className={`text-xl font-medium mb-2 ${isSuccess
          ? 'text-green-600 dark:text-green-400'
          : isPartialSuccess
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-red-600 dark:text-red-400'
          }`}>
          {isSuccess
            ? t('import.successTitle')
            : isPartialSuccess
              ? t('import.partialSuccessTitle')
              : t('import.failureTitle')
          }
        </h3>

        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {state.options.dryRun
            ? t('import.dryRunComplete')
            : t('import.importComplete')
          }
        </p>

        {/* Results Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('import.total')}</div>
          </div>
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{success}</div>
            <div className="text-sm text-green-600 dark:text-green-400">{t('import.successful')}</div>
          </div>
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failed}</div>
            <div className="text-sm text-red-600 dark:text-red-400">{t('import.failed')}</div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{skipped}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">{t('import.skipped')}</div>
          </div>
        </div>

        {/* Error/Warning Details */}
        {(errors.length > 0 || warnings.length > 0) && (
          <div className="space-y-4 text-left">
            {errors.length > 0 && (
              <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                <h5 className="mb-2 font-medium text-red-800 dark:text-red-200">
                  {t('import.error')} ({errors.length})
                </h5>
                <ul className="space-y-1 overflow-auto text-sm text-red-700 dark:text-red-300 max-h-32">
                  {errors.slice(0, 5).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {errors.length > 5 && (
                    <li className="italic">
                      {t('import.andMoreErrors', { count: errors.length - 5 })}
                    </li>
                  )}
                </ul>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
                <h5 className="mb-2 font-medium text-yellow-800 dark:text-yellow-200">
                  {t('import.warnings')} ({warnings.length})
                </h5>
                <ul className="space-y-1 overflow-auto text-sm text-yellow-700 dark:text-yellow-300 max-h-32">
                  {warnings.slice(0, 5).map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                  {warnings.length > 5 && (
                    <li className="italic">
                      {t('import.andMoreWarnings', { count: warnings.length - 5 })}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className={`inline-block w-full max-w-4xl p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg ${className}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t(`${config.entityName}:import.title`)}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8 space-x-4">
            {(['upload', 'preview', 'importing', 'result'] as ImportStep[]).map((stepName, index) => {
              const stepIndex = ['upload', 'preview', 'importing', 'result'].indexOf(state.step);
              const isActive = stepName === state.step;
              const isCompleted = index < stepIndex;

              return (
                <React.Fragment key={stepName}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isActive
                      ? 'bg-doan-500 text-white'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className={`text-xs mt-1 ${isActive
                      ? 'text-doan-600 dark:text-doan-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                      }`}>
                      {t(`import.steps.${stepName}`)}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`w-8 h-0.5 transition-colors ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="mb-6">
            {state.step === 'upload' && renderUploadStep()}
            {state.step === 'preview' && renderPreviewStep()}
            {state.step === 'importing' && renderImportingStep()}
            {state.step === 'result' && renderResultStep()}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              {state.step === 'result' && (
                <button
                  onClick={resetImport}
                  className="inline-flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('import.importAgain')}
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              {state.step === 'preview' && (
                <>
                  <button
                    onClick={() => setState(prev => ({ ...prev, step: 'upload' }))}
                    className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {t('common:actions.back')}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={
                      config.processingMode === 'server'
                        ? !state.serverValidation?.isValid && !state.options.skipErrors
                        : !state.importData?.isValid && !state.options.skipErrors
                    }
                    className="px-4 py-2 text-white transition-colors rounded-md bg-doan-500 hover:bg-doan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {state.options.dryRun ? t('import.validate') : t('import.startImport')}
                  </button>
                </>
              )}

              {(state.step === 'upload' || state.step === 'result') && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {state.step === 'result' ? t('common:actions.close') : t('common:actions.cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
