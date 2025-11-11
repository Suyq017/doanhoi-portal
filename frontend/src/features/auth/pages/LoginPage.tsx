import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Get the return URL from location state
  const from = location.state?.from?.pathname || '/';

  // Redirect if already authenticated
  React.useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [auth.isAuthenticated, navigate, from]);

  const handleSuccess = () => {
    navigate(from, { replace: true });
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-doan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-doan-900 shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('auth:form.title')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('auth:form.buttons.signInWithGoogle')}
            </p>
            <div className="mt-4">
              <img
                src="/assets/logo_doan_hoi_BK_1.png"
                alt={t('auth:form.logoAlt', { defaultValue: 'Đoàn Hội BK logo' })}
                className="mx-auto w-52 h-auto object-contain"
              />
            </div>
            
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Google Login Button */}
          <GoogleLoginButton onSuccess={handleSuccess} onError={handleError} />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
