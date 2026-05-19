import React, { useState, useRef } from 'react';
import {
    Upload,
    CheckCircle,
    XCircle,
    AlertTriangle,
    AlertCircle,
    FileText,
    RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    ImportModalConfig,
    ImportState,
    ImportStep
} from '@/shared/types/import';
import { Toast } from '@/shared/components';
import { useToast } from '@/shared/hooks/useToast';

interface SimpleImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: ImportModalConfig;
    className?: string;
}

/**
 * SimpleImportModal - Simplified import modal for Classes and Organizations
 * 
 * Key differences from ImportModal:
 * - Keeps import button disabled when validation errors exist
 * - Shows error/warning summary at bottom of preview
 * - Increased preview limit to 20 records per page
 */
const SimpleImportModal = ({
    isOpen,
    onClose,
    config,
    className = ''
}: SimpleImportModalProps) => {
    const { t } = useTranslation(['common', config.entityName]);
    const { showError, toasts, hideToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [state, setState] = useState<ImportState>({
        step: 'upload',
        selectedFile: null,

        // Server-side state (legacy)
        serverSession: null,
        serverValidation: null,
        serverResult: null,

        // Client-side state (new)
        clientData: null,
        clientValidation: null,
        clientResult: null,

        // Batch processing state
        batchProgress: null,
        sessionId: null,
        totalRecords: null,
        isBatchProcessing: false,

        options: {
            skipErrors: false,
            updateExisting: false,
            dryRun: false,
            batchSize: config.batchSize || 200
        },
        loading: false,
        dragActive: false
    });

    const [showAllRows, setShowAllRows] = useState(false);
    const [previewPage, setPreviewPage] = useState(1);
    const [previewLimit] = useState(20); // Tăng từ 10 lên 20 để hiển thị nhiều records hơn

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

    // File handling - support both client-side and server-side processing
    const handleFileSelect = async (file: File) => {
        if (!isValidFile(file)) return;

        setState(prev => ({
            ...prev,
            selectedFile: file,
            loading: true,
            sessionId: config.useClientSideProcessing ? `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null
        }));

        try {
            if (config.useClientSideProcessing) {
                await handleClientSideProcessing(file);
            } else {
                await handleServerSideProcessing(file);
            }
        } catch (error) {
            console.error('File processing failed:', error);
            showError(error instanceof Error ? error.message : 'File processing failed');
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    // Client-side processing handler
    const handleClientSideProcessing = async (file: File) => {
        if (!config.parseFile || !config.validateClientData) {
            throw new Error('Client-side processing functions not provided');
        }

        // Step 1: Parse file
        setState(prev => ({
            ...prev,
            batchProgress: {
                currentBatch: 0,
                totalBatches: 0,
                processedRecords: 0,
                totalRecords: 0,
                percentage: 0,
                currentOperation: 'parsing'
            }
        }));

        const parsedData = await config.parseFile(file, (progress) => {
            setState(prev => ({
                ...prev,
                batchProgress: prev.batchProgress ? {
                    ...prev.batchProgress,
                    percentage: progress,
                    currentOperation: 'parsing'
                } : null
            }));
        });

        // Step 2: Validate data
        setState(prev => ({
            ...prev,
            batchProgress: prev.batchProgress ? {
                ...prev.batchProgress,
                currentOperation: 'validating',
                totalRecords: parsedData.length
            } : null
        }));

        const validationResult = await config.validateClientData(parsedData);

        setState(prev => ({
            ...prev,
            clientData: parsedData,
            clientValidation: validationResult,
            totalRecords: parsedData.length,
            step: 'preview',
            loading: false,
            batchProgress: null
        }));
    };

    // Server-side processing handler (legacy)
    const handleServerSideProcessing = async (file: File) => {
        if (!config.uploadFile || !config.validateServerData) {
            throw new Error('Server-side processing functions not provided');
        }

        const serverSession = await config.uploadFile(file);
        const validationResult = await config.validateServerData(serverSession.sessionId);

        config.onValidationComplete?.(validationResult);

        setState(prev => ({
            ...prev,
            serverSession,
            serverValidation: validationResult,
            step: 'preview',
            loading: false
        }));
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
        setState(prev => ({ ...prev, step: 'importing', loading: true }));

        try {
            if (config.useClientSideProcessing) {
                await handleClientSideImport();
            } else {
                await handleServerSideImport();
            }
        } catch (error) {
            console.error('Import error:', error);
            config.onError?.(error as Error);
            setState(prev => ({ ...prev, step: 'preview', loading: false }));
        }
    };

    // Client-side import with batch processing
    const handleClientSideImport = async () => {
        if (!state.clientData || !state.clientValidation || !config.submitClientData) {
            throw new Error('Client data or submitClientData function not available');
        }

        const validData = state.clientValidation.data;
        const totalBatches = Math.ceil(validData.length / (config.batchSize || 200));

        setState(prev => ({
            ...prev,
            isBatchProcessing: true,
            batchProgress: {
                currentBatch: 0,
                totalBatches,
                processedRecords: 0,
                totalRecords: validData.length,
                percentage: 0,
                currentOperation: 'importing'
            }
        }));

        const result = await config.submitClientData(validData, (progress) => {
            setState(prev => ({
                ...prev,
                batchProgress: progress
            }));
        });

        setState(prev => ({
            ...prev,
            clientResult: result,
            step: 'result',
            loading: false,
            isBatchProcessing: false,
            batchProgress: null
        }));
    };

    // Server-side import (legacy)
    const handleServerSideImport = async () => {
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
    };

    // Custom close handler
    const handleClose = () => {
        const hasServerResult = state.serverResult !== null;
        const hasClientResult = state.clientResult !== null;
        const importWasExecuted = state.step === 'result' && (hasServerResult || hasClientResult);

        if (importWasExecuted) {
            const result = state.serverResult || state.clientResult;
            if (result) {
                config.onSuccess?.(result);
            }
        }

        onClose();
    };

    // Reset state
    const resetImport = () => {
        setState({
            step: 'upload',
            selectedFile: null,
            serverSession: null,
            serverValidation: null,
            serverResult: null,
            clientData: null,
            clientValidation: null,
            clientResult: null,
            batchProgress: null,
            sessionId: null,
            totalRecords: null,
            isBatchProcessing: false,
            options: {
                skipErrors: false,
                updateExisting: false,
                dryRun: false,
                batchSize: config.batchSize || 200
            },
            loading: false,
            dragActive: false
        });
        setShowAllRows(false);
        setPreviewPage(1);
    };

    // Utility functions
    const renderCellValue = (value: any, type: string): React.ReactNode => {
        if (value === null || value === undefined || value === '') {
            return <span className="italic text-gray-400">-</span>;
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
                return typeof value === 'number' ? value.toLocaleString('en-US', { useGrouping: false }) : value;
            default:
                return String(value);
        }
    };

    const getCellValue = (item: any, key: string): any => {
        if (!item || typeof item !== 'object') return undefined;
        if (item[key] !== undefined && item[key] !== null) return item[key];

        const fallbackKeyMap: Record<string, string[]> = {
            studentCode: ['student_code', 'studentId', 'student_id', 'code'],
            name: ['fullName', 'full_name', 'studentName', 'student_name'],
            email: ['studentEmail', 'student_email', 'mail']
        };

        const candidates = fallbackKeyMap[key] || [];
        for (const candidate of candidates) {
            if (item[candidate] !== undefined && item[candidate] !== null) {
                return item[candidate];
            }
        }

        return undefined;
    };

    const getDisplayRows = () => {
        const validation = state.clientValidation || state.serverValidation;
        if (!validation) return [];

        let rows: any[] = [];

        if (state.clientValidation) {
            if (Array.isArray(state.clientValidation.previewData) && state.clientValidation.previewData.length > 0) {
                rows = state.clientValidation.previewData.map((row: any, index: number) => {
                    const rowNumber = (typeof row._rowIndex === 'number' && row._rowIndex > 0)
                        ? row._rowIndex
                        : index + 1;

                    const rowErrors = (state.clientValidation?.errors || []).filter((error: any) => {
                        return typeof error === 'object' && typeof error.row === 'number' && error.row === rowNumber;
                    });

                    const rowWarnings = (state.clientValidation?.warnings || []).filter((warning: any) => {
                        return typeof warning === 'object' && typeof warning.row === 'number' && warning.row === rowNumber;
                    });

                    return {
                        ...row,
                        _rowIndex: rowNumber,
                        _errors: rowErrors,
                        _warnings: rowWarnings
                    };
                });
            } else if (state.clientData) {
                rows = state.clientData.map((row: any, index: number) => ({
                    ...row,
                    _rowIndex: index + 1
                }));
            }
        } else if (state.serverValidation) {
            rows = state.serverValidation.previewData || [];
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
        const validation = state.clientValidation || state.serverValidation;
        if (!validation) return 0;

        let totalRows = 0;
        if (state.clientValidation) {
            if (Array.isArray(state.clientValidation.previewData) && state.clientValidation.previewData.length > 0) {
                totalRows = state.clientValidation.previewData.length;
            } else {
                totalRows = (state.clientData || []).length;
            }
        } else if (state.serverValidation) {
            totalRows = (state.serverValidation.previewData || []).length;
        }

        return Math.ceil(totalRows / previewLimit);
    };

    const getCurrentRowRange = () => {
        const validation = state.clientValidation || state.serverValidation;
        if (!validation) return { start: 0, end: 0, total: 0 };

        let totalRows = 0;
        if (state.clientValidation) {
            if (Array.isArray(state.clientValidation.previewData) && state.clientValidation.previewData.length > 0) {
                totalRows = state.clientValidation.previewData.length;
            } else {
                totalRows = (state.clientData || []).length;
            }
        } else if (state.serverValidation) {
            totalRows = (state.serverValidation.previewData || []).length;
        }

        if (showAllRows) {
            return { start: 1, end: totalRows, total: totalRows };
        }

        const start = (previewPage - 1) * previewLimit + 1;
        const end = Math.min(previewPage * previewLimit, totalRows);

        return { start, end, total: totalRows };
    };

    // Render client-side progress
    const renderClientProgress = () => {
        if (!state.batchProgress) return null;

        return (
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {state.batchProgress.currentOperation === 'parsing'
                            ? t('import.progress.parsing')
                            : state.batchProgress.currentOperation === 'validating'
                                ? t('import.progress.validating')
                                : t('import.progress.importing')
                        }
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {state.batchProgress.percentage}%
                    </span>
                </div>

                <div className="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                    <div
                        className="h-2 transition-all duration-300 bg-blue-600 rounded-full"
                        style={{ width: `${state.batchProgress.percentage}%` }}
                    />
                </div>

                {state.batchProgress.currentBatch && state.batchProgress.totalBatches && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('import.progress.batch', {
                            current: state.batchProgress.currentBatch,
                            total: state.batchProgress.totalBatches,
                            records: state.batchProgress.processedRecords || 0,
                            totalRecords: state.batchProgress.totalRecords || 0
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Render steps
    const renderUploadStep = () => (
        <div className="space-y-6">
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

            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${state.dragActive
                    ? 'border-doan-400 bg-doan-50 dark:bg-doan-900/20 scale-105'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <Upload className={`mx-auto h-12 w-12 mb-4 transition-colors ${state.dragActive ? 'text-doan-500' : 'text-gray-400'}`} />

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

            {config.useClientSideProcessing && renderClientProgress()}
        </div>
    );

    const renderPreviewStep = () => {
        const validationData = state.clientValidation || state.serverValidation;
        if (!validationData) return null;

        const displayRows = getDisplayRows();
        const summary = validationData.summary;
        const errors = validationData.errors || [];
        const warnings = validationData.warnings || [];

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="p-4 text-center bg-gray-200 rounded-lg dark:bg-gray-800">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('import.totalRecords')}</div>
                    </div>

                    <div className="p-4 text-center bg-green-100 rounded-lg dark:bg-green-900/20">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.valid}</div>
                        <div className="text-sm text-green-600 dark:text-green-400">{t('import.validRecords')}</div>
                    </div>

                    <div className="p-4 text-center bg-red-100 rounded-lg dark:bg-red-900/20">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{errors.length}</div>
                        <div className="text-sm text-red-600 dark:text-red-400">{t('import.error')}</div>
                    </div>

                    <div className="p-4 text-center bg-yellow-100 rounded-lg dark:bg-yellow-900/20">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{warnings.length}</div>
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">{t('import.warnings')}</div>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => {
                                setShowAllRows(!showAllRows);
                                setPreviewPage(1);
                            }}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-md dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            {showAllRows ? t('import.showLess') : t('import.showAll')}
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left w-full sm:w-auto">
                            {(() => {
                                const range = getCurrentRowRange();
                                return t('common:pagination.showing', {
                                    start: range.start,
                                    end: range.end,
                                    total: range.total
                                });
                            })()}
                        </div>

                        {!showAllRows && getTotalPages() > 0 && (
                            <div className="flex items-center justify-center sm:justify-start space-x-2 w-full sm:w-auto">
                                <button
                                    onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                                    disabled={previewPage <= 1}
                                    className="px-2 py-1 text-xs sm:text-sm text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
                                >
                                    <span className="hidden sm:inline">{t('common:pagination.previous')}</span>
                                    <span className="sm:hidden">Trước</span>
                                </button>
                                <span className="px-2 py-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                    {previewPage} / {getTotalPages()}
                                </span>
                                <button
                                    onClick={() => setPreviewPage(Math.min(getTotalPages(), previewPage + 1))}
                                    disabled={previewPage >= getTotalPages()}
                                    className="px-2 py-1 text-xs sm:text-sm text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
                                >
                                    <span className="hidden sm:inline">{t('common:pagination.next')}</span>
                                    <span className="sm:hidden">Tiếp theo</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Table - Show all records with status */}
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
                                {displayRows.map((item: any, index: number) => {
                                    const rowNumber = item._rowIndex || (showAllRows ? index + 1 : getCurrentRowRange().start + index);
                                    const hasErrors = item.hasErrors || item._hasError || (item._errors && item._errors.length > 0);
                                    const hasWarnings = item.hasWarnings || (item._warnings && item._warnings.length > 0);

                                    return (
                                        <tr
                                            key={index}
                                            className={`transition-colors ${hasErrors
                                                ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                                                : hasWarnings
                                                    ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                                                    : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <td className="px-4 py-3 font-mono text-sm text-gray-500 dark:text-gray-400">
                                                {rowNumber}
                                            </td>
                                            {config.columns.map(col => (
                                                <td key={col.key} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                    {renderCellValue(getCellValue(item, col.key), col.type)}
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-center">
                                                {hasErrors ? (
                                                    <div className="flex items-center justify-center">
                                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                                    </div>
                                                ) : hasWarnings ? (
                                                    <div className="flex items-center justify-center">
                                                        <AlertCircle className="w-4 h-4 text-yellow-500" />
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
                                        {typeof error === 'object' && error.row && (
                                            <span className="font-mono text-xs bg-red-100 dark:bg-red-900/30 px-1 rounded mr-2 mt-0.5">
                                                {error.row}
                                            </span>
                                        )}
                                        <span>{typeof error === 'object' ? error.message : error}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Warning Details */}
                {warnings.length > 0 && (
                    <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
                        <h5 className="flex items-center mb-3 font-medium text-yellow-800 dark:text-yellow-200">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            {t('import.validationWarnings')} ({warnings.length})
                        </h5>
                        <div className="overflow-auto max-h-32">
                            <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                                {warnings.map((warning, index) => (
                                    <li key={index} className="flex items-start">
                                        {typeof warning === 'object' && warning.row && (
                                            <span className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded mr-2 mt-0.5">
                                                {warning.row}
                                            </span>
                                        )}
                                        <span>{typeof warning === 'object' ? warning.message : warning}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
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

            {config.useClientSideProcessing && state.batchProgress ? (
                <div className="max-w-md mx-auto">
                    {renderClientProgress()}
                </div>
            ) : (
                <div className="h-2 max-w-md mx-auto bg-gray-200 rounded-full dark:bg-gray-700">
                    <div className="h-2 rounded-full bg-doan-500 animate-pulse" style={{ width: '60%' }}></div>
                </div>
            )}
        </div>
    );

    const renderResultStep = () => {
        const result = state.clientResult || state.serverResult;
        if (!result) return null;

        let total: number, success: number, failed: number, skipped: number, errors: string[], warnings: string[];

        if (state.clientResult) {
            const summary = state.clientResult.sessionSummary;
            total = summary.totalProcessed || 0;
            success = summary.totalSuccessful || 0;
            failed = summary.totalFailed || 0;
            skipped = 0;
            errors = state.clientResult.errors || [];
            warnings = [];
        } else if (state.serverResult) {
            total = state.serverResult.importedCount + state.serverResult.skippedCount + state.serverResult.failedCount;
            success = state.serverResult.importedCount;
            failed = state.serverResult.failedCount;
            skipped = state.serverResult.skippedCount;
            errors = state.serverResult.errors || [];
            warnings = [];
        } else {
            total = success = failed = skipped = 0;
            errors = warnings = [];
        }

        const isSuccess = failed === 0 && success > 0;
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
                    {state.options.dryRun ? t('import.dryRunComplete') : t('import.importComplete')}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
                    <div className="p-4 bg-gray-200 rounded-lg dark:bg-gray-800">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{total}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('import.total')}</div>
                    </div>
                    <div className="p-4 bg-green-100 rounded-lg dark:bg-green-900/20">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{success}</div>
                        <div className="text-sm text-green-600 dark:text-green-400">{t('import.successful')}</div>
                    </div>
                    <div className="p-4 bg-red-100 rounded-lg dark:bg-red-900/20">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failed}</div>
                        <div className="text-sm text-red-600 dark:text-red-400">{t('import.failed')}</div>
                    </div>
                    <div className="p-4 bg-yellow-100 rounded-lg dark:bg-yellow-900/20">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{skipped}</div>
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">{t('import.skipped')}</div>
                    </div>
                </div>

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
                                        <li className="italic">{t('import.andMoreErrors', { count: errors.length - 5 })}</li>
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
                                        <li className="italic">{t('import.andMoreWarnings', { count: warnings.length - 5 })}</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80"
                    onClick={handleClose}
                />

                <div className={`inline-block w-full max-w-4xl p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg ${className}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {t(`${config.entityName}:import.title`)}
                        </h3>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>

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
                                        <div className={`w-8 h-0.5 transition-colors ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <div className="mb-6">
                        {state.step === 'upload' && renderUploadStep()}
                        {state.step === 'preview' && renderPreviewStep()}
                        {state.step === 'importing' && renderImportingStep()}
                        {state.step === 'result' && renderResultStep()}
                    </div>

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
                                        disabled={(() => {
                                            const validation = state.clientValidation || state.serverValidation;
                                            return !validation || (validation.errors && validation.errors.length > 0);
                                        })()}
                                        className="px-4 py-2 text-white transition-colors rounded-md bg-doan-500 hover:bg-doan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t('import.startImport')}
                                    </button>
                                </>
                            )}

                            {(state.step === 'upload' || state.step === 'result') && (
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    {state.step === 'result' ? t('common:actions.close') : t('common:actions.cancel')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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

export default SimpleImportModal;