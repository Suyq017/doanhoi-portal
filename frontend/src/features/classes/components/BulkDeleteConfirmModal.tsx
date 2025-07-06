import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';

interface BulkDeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    classCount: number;
    loading?: boolean;
    classesWithStudents?: string[]; // Danh sách tên classes có students
}

const BulkDeleteConfirmModal: React.FC<BulkDeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    classCount,
    loading = false,
    classesWithStudents = []
}) => {
    const { t } = useTranslation(['classes', 'common']);

    if (!isOpen) return null;

    const hasClassesWithStudents = classesWithStudents.length > 0;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <AlertTriangle className="w-6 h-6 mr-3 text-red-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('classes:bulkDelete.title', { defaultValue: 'Xóa nhiều lớp học' })}
                        </h3>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {t('classes:bulkDelete.message', {
                            count: classCount,
                            defaultValue: `Bạn có chắc chắn muốn xóa ${classCount} lớp học đã chọn?`
                        })}
                    </p>

                    {hasClassesWithStudents && (
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2" />
                                <div>
                                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                        {t('classes:bulkDelete.hasStudentsWarning', { 
                                            defaultValue: 'Các lớp học sau có sinh viên và không thể xóa:' 
                                        })}
                                    </div>
                                    <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                        {classesWithStudents.join(', ')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-sm text-red-600 dark:text-red-400">
                        {t('common:messages.confirm.deleteWarning')}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end px-6 py-4 space-x-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                        {t('common:actions.cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading || hasClassesWithStudents}
                        className="flex items-center px-4 py-2 text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading && (
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {t('common:actions.delete')} ({classCount})
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BulkDeleteConfirmModal;
