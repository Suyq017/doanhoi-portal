import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Building, Home, Menu, Sun, Moon, Building2, GraduationCap, Database, ChevronDown, ChevronRight, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { LoginButton } from '../../features/auth';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['dataManagement']);
  const location = useLocation();
  const { t } = useTranslation('common');

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuKey)
        ? prev.filter(key => key !== menuKey)
        : [...prev, menuKey]
    );
  };

  const navigation = [
    { name: t('navigation.dashboard'), href: '/', icon: Home },
    { name: t('navigation.users'), href: '/users', icon: Users },
    { name: t('navigation.organizations'), href: '/organizations', icon: Building },
    {
      name: t('navigation.dataManagement'),
      key: 'dataManagement',
      icon: Database,
      children: [
        { name: t('navigation.departments'), href: '/departments', icon: Building2 },
        { name: t('navigation.classes'), href: '/classes', icon: GraduationCap },
      ]
    },
    { name: 'Quản lý đóng phí', href: '/admin/payment-campaigns', icon: CreditCard },
    { name: 'Đóng phí của tôi', href: '/payment/my-campaigns', icon: CreditCard },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const isParentActive = (children: any[]) => children.some(child => child.href && isActive(child.href));

  return (
    <div className={`min-h-screen bg-background ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-lg transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-lg font-bold text-transparent bg-gradient-to-r from-doan-500 to-hsv-500 bg-clip-text">
              {t('appName')}
            </h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-md lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;

              // If item has children (is a parent menu)
              if ('children' in item && item.children) {
                const isExpanded = expandedMenus.includes(item.key!);
                const hasActiveChild = isParentActive(item.children);

                return (
                  <div key={item.key}>
                    {/* Parent menu item */}
                    <button
                      onClick={() => toggleMenu(item.key!)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${hasActiveChild
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-l-2 border-doan-500'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {/* Child menu items */}
                    {isExpanded && (
                      <div className="mt-2 ml-8 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.name}
                              to={child.href}
                              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(child.href)
                                ? 'bg-doan-500 text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                              <ChildIcon className="w-4 h-4 mr-3" />
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Regular menu item
              return (
                <Link
                  key={item.name}
                  to={item.href!}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.href!)
                    ? 'bg-doan-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('footer.copyright')}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <LanguageSwitcher />
              <LoginButton />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
