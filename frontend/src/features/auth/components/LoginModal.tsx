import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle } from 'lucide-react';
import LoginForm from './LoginForm';
import GoogleLoginButton from './GoogleLoginButton';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation(['auth', 'common']);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSuccess = () => {
    setError(null);
    onClose();
    onSuccess?.();
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('auth:modal.title')}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </div>
              </div>
            )}

            {/* Login Form */}
            <LoginForm onSuccess={handleSuccess} onError={handleError} />

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
              <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 text-sm">
                {t('auth:form.or')}
              </span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            </div>

            {/* Google Login Button */}
            <GoogleLoginButton onSuccess={handleSuccess} onError={handleError} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LoginModal;
