import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemberImport } from '../hooks/useMemberImport';
import * as XLSX from 'xlsx';

interface ImportMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    organizationId: string;
    organizationCode: string;
    organizationName: string;
    onSuccess: () => void;
    onError: (error: string) => void;
}

type ImportStep = 'upload' | 'validate' | 'preview' | 'import' | 'result';

const ImportMembersModal: React.FC<ImportMembersModalProps> = ({
    isOpen,
    onClose,
    organizationId,
    organizationCode,
    organizationName,
    onSuccess,
    onError
}) => {
    const { t } = useTranslation(['organizations', 'common']);
    const [file, setFile] = useState<File | null>(null);
    const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use member import hook
    const {
        loading,
        validating,
        previewData,
        importResult,
        parseAndValidate,
        executeImport,
        reset
    } = useMemberImport({
        organizationId,
        onSuccess,
        onError
    });

    // Download template Excel file
    const handleDownloadTemplate = useCallback(() => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Mã số sinh viên'], // Header
            ['2211234'], // Example 1
            ['2211235'], // Example 2
            ['2211236'], // Example 3
        ]);

        // Set column width
        ws['!cols'] = [{ wch: 20 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách thành viên');

        XLSX.writeFile(wb, `template_import_thanh_vien_${organizationCode}.xlsx`);
    }, [organizationCode]);

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Check file type
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ];

            if (!validTypes.includes(selectedFile.type)) {
                onError(t('organizations:import.invalidFileType'));
                return;
            }

            // Check file size (max 5MB)
            if (selectedFile.size > 5 * 1024 * 1024) {
                onError(t('organizations:import.fileTooLarge'));
                return;
            }

            setFile(selectedFile);
            setCurrentStep('upload');
        }
    };

    // Parse Excel file and extract user codes
    const parseExcelFile = (file: File): Promise<string[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });

                    // Skip header row and extract user codes
                    const userCodes: string[] = [];
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (row && row[0]) {
                            const code = String(row[0]).trim();
                            if (code) {
                                userCodes.push(code);
                            }
                        }
                    }

                    if (userCodes.length === 0) {
                        reject(new Error(t('organizations:import.noDataFound')));
                        return;
                    }

                    resolve(userCodes);
                } catch (error) {
                    reject(new Error(t('organizations:import.parseError')));
                }
            };

            reader.onerror = () => {
                reject(new Error(t('organizations:import.readError')));
            };

            reader.readAsBinaryString(file);
        });
    };

    // Handle validate step - parse file and validate data
    const handleValidate = async () => {
        if (!file) {
            onError(t('organizations:import.noFileSelected'));
            return;
        }

        try {
            setCurrentStep('validate');
            // Parse Excel file
            const userCodes = await parseExcelFile(file);

            // Validate data
            await parseAndValidate(userCodes);
            setCurrentStep('preview');
        } catch (error: any) {
            console.error('Error validating file:', error);
            onError(error.message || t('organizations:import.error'));
            setCurrentStep('upload');
        }
    };
    // Handle import with validated data
    const handleImport = async () => {
        if (previewData.length === 0) {
            onError('Không có dữ liệu để import');
            return;
        }

        try {
            setCurrentStep('import');
            await executeImport(previewData);
            setCurrentStep('result');
        } catch (error: any) {
            console.error('Error importing members:', error);
            setCurrentStep('preview');
        }
    };

    const handleClose = () => {
        setFile(null);
        setCurrentStep('upload');
        reset();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4"
            style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('organizations:members.importExcel')}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {organizationName}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={loading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Download Template Section */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    {t('organizations:import.templateTitle')}
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    {t('organizations:import.templateDescription')}
                                </p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    {t('organizations:import.downloadTemplate')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* File Upload Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('organizations:import.selectFile')}
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={loading || validating}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                disabled={loading || validating}
                            >
                                <Upload className="w-4 h-4" />
                                {t('organizations:import.chooseFile')}
                            </button>
                            {file && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>{file.name}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Validation Progress */}
                    {validating && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                    Đang kiểm tra dữ liệu...
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Validation Preview */}
                    {currentStep === 'preview' && previewData.length > 0 && (
                        <div className="space-y-3">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Tổng số</div>
                                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {previewData.length}
                                    </div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                    <div className="text-xs text-green-600 dark:text-green-400">Hợp lệ</div>
                                    <div className="text-xl font-semibold text-green-700 dark:text-green-300">
                                        {previewData.filter(d => d.isValid).length}
                                    </div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                    <div className="text-xs text-red-600 dark:text-red-400">Lỗi</div>
                                    <div className="text-xl font-semibold text-red-700 dark:text-red-300">
                                        {previewData.filter(d => !d.isValid).length}
                                    </div>
                                </div>
                            </div>

                            {/* Preview List */}
                            <div className="border border-gray-200 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto">
                                {previewData.map((data, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${!data.isValid ? 'bg-red-50 dark:bg-red-900/10' :
                                            data.warnings.length > 0 ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    {data.isValid ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                    )}
                                                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                                                        Dòng {data.row}: {data.studentCode}
                                                    </span>
                                                </div>
                                                {data.errors.length > 0 && (
                                                    <div className="mt-1 ml-6 space-y-1">
                                                        {data.errors.map((error, i) => (
                                                            <div key={i} className="text-xs text-red-600 dark:text-red-400">
                                                                • {error}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {data.warnings.length > 0 && (
                                                    <div className="mt-1 ml-6 space-y-1">
                                                        {data.warnings.map((warning, i) => (
                                                            <div key={i} className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {warning}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Import Results */}
                    {currentStep === 'result' && importResult && (
                        <div className="space-y-3">
                            {/* Success Summary */}
                            {importResult.success > 0 && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                    <div className="flex items-start space-x-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
                                                {t('organizations:import.successCount', { count: importResult.success })}
                                            </h4>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Failed Summary */}
                            {importResult.failed > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <div className="flex items-start space-x-3">
                                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                                                {t('organizations:import.failedCount', { count: importResult.failed })}
                                            </h4>
                                            {importResult.errors.length > 0 && (
                                                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                                    {importResult.errors.map((error, index) => (
                                                        <div key={index} className="text-xs text-red-700 dark:text-red-300">
                                                            • Dòng {error.row}: {error.code} - {error.message}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Instructions */}
                    {currentStep === 'upload' && !file && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <AlertCircle className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                    <p className="font-medium">{t('organizations:import.instructions')}:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                        <li>{t('organizations:import.instruction1')}</li>
                                        <li>{t('organizations:import.instruction2')}</li>
                                        <li>{t('organizations:import.instruction3')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        disabled={loading || validating}
                    >
                        {currentStep === 'result' ? t('common:actions.close') : t('common:actions.cancel')}
                    </button>

                    {/* Validate Button */}
                    {currentStep === 'upload' && file && (
                        <button
                            onClick={handleValidate}
                            disabled={!file || validating}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                        >
                            {validating && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            <span>{validating ? 'Đang kiểm tra...' : 'Kiểm tra dữ liệu'}</span>
                        </button>
                    )}

                    {/* Import Button */}
                    {currentStep === 'preview' && previewData.filter(d => d.isValid).length > 0 && (
                        <button
                            onClick={handleImport}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                        >
                            {loading && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            <Upload className="w-4 h-4" />
                            <span>
                                {loading ? t('common:states.processing') :
                                    `Import ${previewData.filter(d => d.isValid).length} thành viên`}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ImportMembersModal;
