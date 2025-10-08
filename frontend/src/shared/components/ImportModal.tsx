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
import { Toast } from '@/shared/components';
import { useToast } from '@/shared/hooks/useToast';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ImportModalConfig;
  className?: string;
}

const ImportModal = ({
  isOpen,
  onClose,
  config,
  className = ''
}: ImportModalProps) => {
  const { t } = useTranslation(['common', 'ctxh', config.entityName]);
  const { showError, toasts, hideToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<ImportState>({
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
  const [previewPage, setPreviewPage] = useState(1);
  const [previewLimit] = useState(10);

  // File validation
  const isValidFile = (file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!config.acceptedFileTypes.includes(fileExtension)) {
      showError(t('import.errors.invalidFileType'));
      return false;
    }

    if (file.size > config.maxFileSize) {
      showError(t('import.errors.fileTooLarge'));
      return false;
    }

    return true;
  };

  // File handling - server-side processing only
  const handleFileSelect = async (file: File) => {
    if (!isValidFile(file)) return;

    setState(prev => ({ ...prev, selectedFile: file, loading: true }));

    try {
      // Server-side processing
      if (!config.uploadFile) {
        throw new Error('uploadFile function not provided');
      }

      const serverSession = await config.uploadFile(file);

      // Automatically validate after upload
      if (!config.validateServerData) {
        throw new Error('validateServerData function not provided');
      }

      const validationResult = await config.validateServerData(serverSession.sessionId);

      // Auto-fill dữ liệu cho server-side processing
      if (validationResult.previewData) {
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

          const emailValue = emailField ? item[emailField] : null;

          // Auto-fill password từ email prefix nếu trống hoặc là '-'
          if (emailValue && passwordField && (!item[passwordField] || item[passwordField] === '' || item[passwordField] === '-')) {
            const emailPrefix = emailValue.split('@')[0];
            item[passwordField] = emailPrefix;
            modified[passwordField] = true;
          }

          return item;
        });
      }

      config.onValidationComplete?.(validationResult);

      setState(prev => ({
        ...prev,
        serverSession,
        serverValidation: validationResult,
        step: 'preview',
        loading: false
      }));
    } catch (error: any) {
      console.error('File processing error:', error);
      
      // Don't show error toast here - let parent component handle it via onError callback
      // Call onError callback to let parent component handle the error and show toast
      config.onError?.(error);
      
      // Reset completely to upload step when there's an error
      resetImport();
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

  // Import process - server-side processing only
  const handleImport = async () => {
    setState(prev => ({ ...prev, step: 'importing', loading: true }));

    try {
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
    setPreviewPage(1);
    
    // Clear file input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Utility functions
  const renderCellValue = (value: any, type: string): React.ReactNode => {
    if (value === null || value === undefined || value === '') {
      return <span className="italic text-gray-400">-</span>;
    }

    const renderValue = () => {
      switch (type) {
        case 'boolean':
          return value ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : null;
        case 'date':
          return new Date(value).toLocaleDateString();
        case 'number':
          // Handle NaN and convert to string to avoid React warning
          if (typeof value === 'number') {
            if (isNaN(value)) {
              return <span className="italic text-gray-400">-</span>;
            }
            return value.toLocaleString('en-US', { useGrouping: false });
          }
          // Try to parse as number if it's a string
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            return numValue.toLocaleString('en-US', { useGrouping: false });
          }
          return String(value);
        default:
          return String(value);
      }
    };

    return renderValue();
  };

  const getDisplayRows = () => {
    // Server-side processing only
    if (!state.serverValidation) return [];
    
    // Try to get data from serverValidation first, then from serverSession
    let rows = state.serverValidation.previewData || state.serverSession?.previewData || [];
    
    console.log('ImportModal getDisplayRows:');
    console.log('- serverValidation.previewData:', state.serverValidation.previewData);
    console.log('- serverSession.previewData:', state.serverSession?.previewData);
    console.log('- final rows:', rows);

    // Apply error filtering - check both hasErrors and _hasError for compatibility
    if (showOnlyErrors) {
      rows = rows.filter(row => row.hasErrors || row._hasError);
    }

    // Calculate pagination
    const startIndex = (previewPage - 1) * previewLimit;
    const endIndex = startIndex + previewLimit;

    // Apply pagination if not showing all rows
    if (!showAllRows) {
      rows = rows.slice(startIndex, endIndex);
    }

    return rows;
  };

  const getTotalPages = () => {
    if (!state.serverValidation) return 0;

    let totalRows = state.serverValidation.previewData?.length || 0;

    if (showOnlyErrors) {
      totalRows = state.serverValidation.previewData?.filter(row => row.hasErrors || row._hasError).length || 0;
    }

    return Math.ceil(totalRows / previewLimit);
  };

  const getCurrentRowRange = () => {
    if (!state.serverValidation) return { start: 0, end: 0, total: 0 };

    let totalRows = state.serverValidation.previewData?.length || 0;

    if (showOnlyErrors) {
      totalRows = state.serverValidation.previewData?.filter(row => row.hasErrors || row._hasError).length || 0;
    }

    if (showAllRows) {
      return { start: 1, end: totalRows, total: totalRows };
    }

    const start = (previewPage - 1) * previewLimit + 1;
    const end = Math.min(previewPage * previewLimit, totalRows);

    return { start, end, total: totalRows };
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
              {config.instructions ? t('common:import.instructionsTitle') : t(`${config.entityName}:import.instructions`)}
            </h4>
            <ol className="space-y-1 text-sm text-blue-800 list-decimal list-inside dark:text-blue-200">
              {config.instructions ? (
                config.instructions.map((instruction, index) => {
                  // Only detect 'here' or 'tại đây' as download links when they appear after 'template'
                  const hasVietnameseLink = instruction.includes('tải file mẫu Excel tại đây') || instruction.includes('file mẫu Excel tại đây');
                  const hasEnglishLink = instruction.includes('template here') && !instruction.includes('ensure there');
                  const hasDownloadLink = hasVietnameseLink || hasEnglishLink;
                  
                  if (hasDownloadLink) {
                    const linkText = hasVietnameseLink ? 'tại đây' : 'here';
                    const parts = instruction.split(linkText);
                    
                    return (
                      <li key={index}>
                        {parts[0]}
                        {config.downloadTemplate ? (
                          <button
                            onClick={config.downloadTemplate}
                            className="font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                          >
                            {linkText}
                          </button>
                        ) : (
                          <a
                            href={config.templateUrl}
                            download={config.templateFileName}
                            className="font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                          >
                            {linkText}
                          </a>
                        )}
                        {parts[1]}
                      </li>
                    );
                  }
                  
                  return (
                    <li key={index}>
                      {instruction}
                    </li>
                  );
                })
              ) : (
                <>
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
                </>
              )}
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
    // Server-side processing only
    if (!state.serverValidation?.summary) return null;

    const displayRows = getDisplayRows();
    const summary = state.serverValidation.summary;
    const errors = state.serverValidation.errors || [];
    const warnings = state.serverValidation.warnings || [];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="p-4 text-center rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.total || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('import.totalRecords')}
            </div>
          </div>

          <div className="p-4 text-center rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {summary.valid || 0}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              {t('import.validRecords')}
            </div>
          </div>

          <div className="p-4 text-center rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {errors.length || 0}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              {t('import.error')}
            </div>
          </div>

          <div className="p-4 text-center rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {warnings.length || 0}
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
              onClick={() => {
                setShowOnlyErrors(!showOnlyErrors);
                setPreviewPage(1); // Reset to first page when filter changes
              }}
              className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${showOnlyErrors
                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
            >
              {showOnlyErrors ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
              {t('import.showOnlyErrors')}
            </button>

            <button
              onClick={() => {
                setShowAllRows(!showAllRows);
                setPreviewPage(1); // Reset to first page when view changes
              }}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-md dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {showAllRows ? t('import.showLess') : t('import.showAll')}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {(() => {
                const range = getCurrentRowRange();
                return t('common:pagination.showing', {
                  start: Math.max(range.start || 0, 0),
                  end: Math.max(range.end || 0, 0),
                  total: Math.max(range.total || 0, 0)
                });
              })()}
            </div>

            {/* Pagination Controls */}
            {!showAllRows && getTotalPages() > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPreviewPage(Math.max(1, (previewPage || 1) - 1))}
                  disabled={(previewPage || 1) <= 1}
                  className="px-2 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
                >
                  {t('common:pagination.previous')}
                </button>
                <span className="px-2 py-1 text-sm text-gray-700 dark:text-gray-300">
                  {previewPage || 1} / {getTotalPages() || 1}
                </span>
                <button
                  onClick={() => setPreviewPage(Math.min(getTotalPages() || 1, (previewPage || 1) + 1))}
                  disabled={(previewPage || 1) >= (getTotalPages() || 1)}
                  className="px-2 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
                >
                  {t('common:pagination.next')}
                </button>
              </div>
            )}
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
                  // Handle server-side data structure
                  // Check both hasErrors and _hasError for compatibility
                  // Also check Trạng thái field for grading validation
                  const hasErrors = item.hasErrors || item._hasError || (item['Trạng thái'] && item['Trạng thái'].includes('❌'));
                  const hasWarnings = item.hasWarnings || (item._warnings && item._warnings.length > 0);

                  // Calculate proper row number for pagination
                  let rowNumber = 1;
                  if (showAllRows) {
                    // For show all rows, use sequential numbering
                    rowNumber = (index || 0) + 1;
                  } else {
                    // For paginated view, calculate based on page and position
                    const range = getCurrentRowRange();
                    rowNumber = (range.start || 1) + (index || 0);
                  }

                  return (
                    <tr
                      key={index}
                      className={`transition-colors ${hasErrors
                        ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                        : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      <td className="px-4 py-3 font-mono text-sm text-gray-500 dark:text-gray-400">
                        {rowNumber}
                      </td>
                      {config.columns.map(col => (
                        <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {renderCellValue(item[col.key], col.type)}
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
                {errors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="font-mono text-xs bg-red-100 dark:bg-red-900/30 px-1 rounded mr-2 mt-0.5">
                      {error.row || (index + 1)}
                    </span>
                    <span>{error.message}</span>
                  </li>
                ))}
                {/* {errors.length > 10 && (
                  <li className="italic text-red-600 dark:text-red-400">
                    {t('import.andMoreErrors', { count: errors.length - 10 })}
                  </li>
                )} */}
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
          </div>
        </div>
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="py-12 text-center">
      <RefreshCw className="w-16 h-16 mx-auto mb-4 text-doan-500 animate-spin" />
      <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
        {t('import.importing')}
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
    // Server-side results only
    const result = state.serverResult;
    if (!result) return null;

    // Server-side result structure
    const total = (result.importedCount || 0) + (result.skippedCount || 0) + (result.failedCount || 0);
    const success = result.importedCount || 0;
    const failed = result.failedCount || 0;
    const skipped = result.skippedCount || 0;
    const errors = result.errors || [];
    const warnings: string[] = []; // Server result doesn't have warnings field

    const isSuccess = failed === 0;
    const isPartialSuccess = success > 0 && failed > 0;

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
          {t('import.importComplete')}
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
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className={`inline-block w-full max-w-4xl p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg ${className}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {config.entityName === 'participants' ? t('ctxh:participant.addStudentForm') :
               config.entityName === 'grading' ? t('ctxh:participant.gradeFromFileForm') :
               config.title || t(`${config.entityName}:import.title`)}
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
                    disabled={!state.serverValidation?.isValid && !state.options.skipErrors}
                    className="px-4 py-2 text-white transition-colors rounded-md bg-doan-500 hover:bg-doan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('import.startImport')}
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

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default ImportModal;
