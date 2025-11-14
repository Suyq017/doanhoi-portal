import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens, setUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('auth');

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple executions
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refresh_token');
        const errorParam = searchParams.get('error');

        if (errorParam) {
          console.error('OAuth error:', errorParam);
          setError(t('form.error.googleLoginFailed'));
          setIsProcessing(false);
          return;
        }

        if (token && refreshToken) {
          // Set tokens first
          setTokens(token, refreshToken);
          
          // Get user profile
          const backendUrl = import.meta.env.VITE_BACKEND_API_URL;
          const response = await fetch(`${backendUrl}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            
            // Delay navigation to ensure state updates
            setTimeout(() => {
              navigate('/portal');
            }, 100);
          } else {
            throw new Error('Failed to get user profile');
          }
        } else {
          setError(t('form.error.googleLoginFailed'));
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(t('form.error.googleLoginFailed'));
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, []); // Empty dependency array to run only once

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 border-2 border-doan-900 rounded-lg shadow-lg p-6 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-red-600 dark:text-red-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </div>
            
            {/* Error Title */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('form.error.loginFailed')}
            </h2>
            
            {/* Error Message */}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            
            {/* Back to Login Button */}
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-doan-500 hover:bg-doan-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {t('form.buttons.backToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-b-2 rounded-full animate-spin border-doan-500"></div>
        <p className="text-gray-600 dark:text-gray-400">{t('form.processing')}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
