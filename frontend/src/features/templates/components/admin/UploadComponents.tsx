import React from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, AlertCircle, ArrowLeft } from 'lucide-react';

// Upload Header
interface UploadHeaderProps {
    onBack: () => void;
}

export const UploadHeader: React.FC<UploadHeaderProps> = ({ onBack }) => {
    const { t } = useTranslation(['templates']);

    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onBack}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title={t('templates:actions.backToList')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {t('templates:upload.title')}
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            {t('templates:upload.subtitle')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// File Dropzone
interface FileDropzoneProps {
    dragActive: boolean;
    onDrag: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onFileSelect: (file: File) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
    dragActive,
    onDrag,
    onDrop,
    onFileSelect,
}) => {
    const { t } = useTranslation(['templates']);

    return (
        <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
        >
            <input
                type="file"
                id="file-upload"
                accept=".docx"
                onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) onFileSelect(selectedFile);
                }}
                className="hidden"
            />

            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="mb-2">
                <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                >
                    {t('templates:upload.clickToSelect')}
                </label>
                <span className="text-gray-600 dark:text-gray-400"> {t('templates:upload.orDragDrop')}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('templates:upload.onlyDocx')}
            </p>
        </div>
    );
};

// Upload Instructions
export const UploadInstructions: React.FC = () => {
    const { t } = useTranslation(['templates']);

    return (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-semibold mb-2">{t('templates:upload.instructionTitle')}:</p>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                        <li>{t('templates:upload.instructionFieldSyntax')}</li>
                        <li>{t('templates:upload.instructionExample')}</li>
                        <li>{t('templates:upload.instructionFieldName')}</li>
                        <li>{t('templates:upload.instructionAutoDetect')}</li>
                    </ul>

                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <p className="font-semibold mb-1">{t('templates:upload.convertTitle')}:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-1">
                            <li>{t('templates:upload.convertStep1')}</li>
                            <li>{t('templates:upload.convertStep2')}</li>
                            <li>{t('templates:upload.convertStep3')}</li>
                            <li>{t('templates:upload.convertStep4')}</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};
