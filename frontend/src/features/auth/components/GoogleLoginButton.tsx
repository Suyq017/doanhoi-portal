import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, onError }) => {
  const { t } = useTranslation(['auth', 'common']);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      // Redirect to backend Google OAuth endpoint
      const backendUrl = import.meta.env.VITE_BACKEND_API_URL;
      window.location.href = `${backendUrl}/auth/google`;
      // Call onSuccess callback if provided
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth:form.error.googleLoginFailed');
      onError?.(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="flex items-center justify-center w-full h-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800"
    >
      {isLoading ? (
        <div className="flex items-center">
          <div className="w-4 h-4 mr-2 border-b-2 border-gray-700 rounded-full animate-spin dark:border-gray-300"></div>
          {t('auth:form.buttons.signingInWithGoogle')}
        </div>
      ) : (
        <div className="flex items-center">
          <img
              src="\assets\google-color.svg"
              alt={t('auth:form.logoAlt', { defaultValue: 'Đoàn Hội BK logo' })}
              className="w-5 h-5 mr-2"
            />
          {t('auth:form.buttons.signInWithGoogle')}
        </div>
      )}
    </button>
  );
};

export default GoogleLoginButton;
