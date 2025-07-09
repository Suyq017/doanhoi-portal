import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';

const LoginButton: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const { auth, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
  };

  // If user is authenticated, show user menu
  if (auth.isAuthenticated && auth.user) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {auth.user.givenName} {auth.user.familyName}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="py-1">
              <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <div className="font-medium">{auth.user.givenName} {auth.user.familyName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{auth.user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('auth:buttons.logout')}
              </button>
            </div>
          </div>
        )}

        {/* Click outside to close dropdown */}
        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    );
  }

  // If user is not authenticated, show login button
  return (
    <>
      <button
        onClick={handleLoginClick}
        className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <LogIn className="w-5 h-5" />
        <span>{t('auth:buttons.login')}</span>
      </button>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default LoginButton;
