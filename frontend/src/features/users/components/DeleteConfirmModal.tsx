import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as ApiUser } from '../../../shared';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: ApiUser | null;
  loading?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  loading = false,
}) => {
  const { t } = useTranslation(['users', 'common']);
  
  if (!isOpen || !user) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
            {t('users:titles.delete')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('common:messages.confirm.delete')}
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {`${user.familyName} ${user.givenName}`}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.code} • {user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {t('common:messages.confirm.deleteWarning')}
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {t('users:messages.deleteWarningMessage')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            disabled={loading}
          >
            {t('common:actions.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common:states.deleting')}
              </span>
            ) : (
              t('common:actions.delete')
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DeleteConfirmModal;
