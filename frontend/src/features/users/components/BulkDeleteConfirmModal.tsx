import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';

interface BulkDeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    userCount: number;
    loading?: boolean;
}

const BulkDeleteConfirmModal: React.FC<BulkDeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    userCount,
    loading = false,
}) => {
    const { t } = useTranslation(['users', 'common']);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg dark:bg-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <AlertTriangle className="w-6 h-6 mr-3 text-red-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('users:bulkDelete.title', { defaultValue: 'Xóa nhiều người dùng' })}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('users:bulkDelete.message', {
                            count: userCount,
                            defaultValue: `Bạn có chắc chắn muốn xóa ${userCount} người dùng đã chọn? Hành động này không thể hoàn tác.`
                        })}
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
                        disabled={loading}
                        className="flex items-center px-4 py-2 text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading && (
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {t('common:actions.delete')} ({userCount})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDeleteConfirmModal;
