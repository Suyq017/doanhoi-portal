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
      alert(t('import.errors.invalidFileType'));
      return false;
    }
    
    if (file.size > config.maxFileSize) {
      alert(t('import.errors.fileTooLarge'));
      return false;
    }
    
    return true;
  };

  // File handling
  const handleFileSelect = async (file: File) => {
    if (!isValidFile(file)) return;
    
    setState(prev => ({ ...prev, selectedFile: file, loading: true }));
    
    try {
      const parsedData = await config.parseFile(file);
      const validationResult = await config.validateData(parsedData);
      
      config.onValidationComplete?.(validationResult);
      
      setState(prev => ({
        ...prev,
        importData: validationResult,
        step: 'preview',
        loading: false
      }));
    } catch (error) {
      console.error('File processing error:', error);
      alert(t('import.errors.parseFile'));
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

  // Import process
  const handleImport = async () => {
    if (!state.importData) return;
    
    setState(prev => ({ ...prev, step: 'importing', loading: true }));
    
    try {
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
  const renderCellValue = (value: any, type: string): React.ReactNode => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">-</span>;
    }

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
        return typeof value === 'number' ? value.toLocaleString() : value;
      default:
        return String(value);
    }
  };

  const getDisplayRows = () => {
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
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              {t(`${config.entityName}:import.instructions`)}
            </h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>
                {t(`${config.entityName}:import.step1`).includes(t(`${config.entityName}:import.templateLinkText`)) ? (
                  <>
                    {t(`${config.entityName}:import.step1`).split(t(`${config.entityName}:import.templateLinkText`))[0]}
                    <a 
                      href={config.templateUrl}
                      download={config.templateFileName}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200 underline font-medium"
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
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          state.dragActive 
            ? 'border-doan-400 bg-doan-50 dark:bg-doan-900/20 scale-105' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className={`mx-auto h-12 w-12 mb-4 transition-colors ${
          state.dragActive ? 'text-doan-500' : 'text-gray-400'
        }`} />
        
        <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {state.dragActive ? t('import.dropFileNow') : t('import.dropFile')}
        </p>
        
        <p className="text-gray-500 dark:text-gray-400 mb-4">
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
          className="inline-flex items-center px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    if (!state.importData) return null;

    const displayRows = getDisplayRows();
    const { summary } = state.importData;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.total}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('import.totalRecords')}
            </div>
          </div>
          
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {summary.valid}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              {t('import.validRecords')}
            </div>
          </div>
          
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {state.importData.errors.length}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              {t('import.errors')}
            </div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {state.importData.warnings.length}
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
              className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                showOnlyErrors
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {showOnlyErrors ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
              {t('import.showOnlyErrors')}
            </button>
            
            <button
              onClick={() => setShowAllRows(!showAllRows)}
              className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {showAllRows ? t('import.showLess') : t('import.showAll')}
              {!showAllRows && ` (${Math.min(config.previewRowCount || 10, state.importData.data.length)}/${state.importData.data.length})`}
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
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('common:fields.row')}
                  </th>
                  {config.columns.map(col => (
                    <th 
                      key={col.key} 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      style={col.width ? { width: col.width } : {}}
                    >
                      {col.label}
                      {col.required && <span className="text-red-500 ml-1">*</span>}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('common:fields.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayRows.map((item, index) => (
                  <tr 
                    key={index} 
                    className={`transition-colors ${
                      item._hasError 
                        ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20' 
                        : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {item._rowIndex + 1}
                    </td>
                    {config.columns.map(col => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {renderCellValue(item[col.key], col.type)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      {item._hasError ? (
                        <div className="flex items-center justify-center">
                          <AlertTriangle 
                            className="w-4 h-4 text-red-500" 
                          />
                        </div>
                      ) : item._warnings.length > 0 ? (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Error Details */}
        {state.importData.errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h5 className="font-medium text-red-800 dark:text-red-200 mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t('import.validationErrors')} ({state.importData.errors.length})
            </h5>
            <div className="max-h-32 overflow-auto">
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {state.importData.errors.slice(0, 10).map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="font-mono text-xs bg-red-100 dark:bg-red-900/30 px-1 rounded mr-2 mt-0.5">
                      {error.row}
                    </span>
                    <span className="font-medium mr-2">{error.column}:</span>
                    <span>{error.message}</span>
                  </li>
                ))}
                {state.importData.errors.length > 10 && (
                  <li className="text-red-600 dark:text-red-400 italic">
                    {t('import.andMoreErrors', { count: state.importData.errors.length - 10 })}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Import Options */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
    <div className="text-center py-12">
      <RefreshCw className="w-16 h-16 text-doan-500 animate-spin mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {state.options.dryRun ? t('import.validating') : t('import.importing')}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        {t('import.pleaseWait')}
      </p>
      <div className="max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className="bg-doan-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
      </div>
    </div>
  );

  const renderResultStep = () => {
    if (!state.importResult) return null;

    const { total, success, failed, skipped } = state.importResult;
    const isSuccess = failed === 0;
    const isPartialSuccess = success > 0 && failed > 0;

    return (
      <div className="text-center py-8">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
          isSuccess 
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

        <h3 className={`text-xl font-medium mb-2 ${
          isSuccess 
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

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {state.options.dryRun 
            ? t('import.dryRunComplete') 
            : t('import.importComplete')
          }
        </p>

        {/* Results Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('import.total')}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{success}</div>
            <div className="text-sm text-green-600 dark:text-green-400">{t('import.successful')}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failed}</div>
            <div className="text-sm text-red-600 dark:text-red-400">{t('import.failed')}</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{skipped}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">{t('import.skipped')}</div>
          </div>
        </div>

        {/* Error/Warning Details */}
        {(state.importResult.errors.length > 0 || state.importResult.warnings.length > 0) && (
          <div className="text-left space-y-4">
            {state.importResult.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">
                  {t('import.errors')} ({state.importResult.errors.length})
                </h5>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 max-h-32 overflow-auto">
                  {state.importResult.errors.slice(0, 5).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {state.importResult.errors.length > 5 && (
                    <li className="italic">
                      {t('import.andMoreErrors', { count: state.importResult.errors.length - 5 })}
                    </li>
                  )}
                </ul>
              </div>
            )}

            {state.importResult.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  {t('import.warnings')} ({state.importResult.warnings.length})
                </h5>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 max-h-32 overflow-auto">
                  {state.importResult.warnings.slice(0, 5).map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                  {state.importResult.warnings.length > 5 && (
                    <li className="italic">
                      {t('import.andMoreWarnings', { count: state.importResult.warnings.length - 5 })}
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
          <div className="flex items-center justify-center space-x-4 mb-8">
            {(['upload', 'preview', 'importing', 'result'] as ImportStep[]).map((stepName, index) => {
              const stepIndex = ['upload', 'preview', 'importing', 'result'].indexOf(state.step);
              const isActive = stepName === state.step;
              const isCompleted = index < stepIndex;
              
              return (
                <React.Fragment key={stepName}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-doan-500 text-white' 
                        : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className={`text-xs mt-1 ${
                      isActive 
                        ? 'text-doan-600 dark:text-doan-400 font-medium' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {t(`import.steps.${stepName}`)}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`w-8 h-0.5 transition-colors ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
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
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('common:actions.back')}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!state.importData?.isValid && !state.options.skipErrors}
                    className="px-4 py-2 bg-doan-500 text-white rounded-md hover:bg-doan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {state.options.dryRun ? t('import.validate') : t('import.startImport')}
                  </button>
                </>
              )}
              
              {(state.step === 'upload' || state.step === 'result') && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
