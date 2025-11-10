import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Building, Home, Menu, Sun, Moon, Building2, GraduationCap, Database, ChevronDown, ChevronRight, Shield, CreditCard, Heart, Calendar, BarChart, Settings, Upload, FileText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { LoginButton } from '../../features/auth';
import { usePermissions } from '../hooks/usePermissions';
import { useCtxhPermissions } from '../../features/ctxh/hooks';
import { AppLoadingScreen } from './AppLoadingScreen';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['dataManagement', 'ctxh']);
  const location = useLocation();
  const { t } = useTranslation('common');
  const permissions = usePermissions();
  const ctxhPermissions = useCtxhPermissions();

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
  // Filter navigation items based on permissions
  const getFilteredNavigation = () => {
    const baseNavigation = [
      {
        name: t('navigation.dashboard'),
        href: '/',
        icon: Home,
        requiredPermission: 'dashboard.access'
      },
      {
        name: t('navigation.users'),
        href: '/users',
        icon: Users,
        requiredPermission: 'users.access'
      },
      {
        name: t('navigation.organizations'),
        href: '/organizations',
        icon: Building,
        requiredPermission: 'organizations.access'
      },
      {
        name: t('navigation.dataManagement'),
        key: 'dataManagement',
        icon: Database,
        children: [
          {
            name: t('navigation.departments'),
            href: '/departments',
            icon: Building2,
            requiredPermission: 'departments.access'
          },
          {
            name: t('navigation.classes'),
            href: '/classes',
            icon: GraduationCap,
            requiredPermission: 'classes.access'
          },
        ]
      }, {
        name: t('navigation.permissions'),
        href: '/permissions',
        icon: Shield,
        requiredPermission: 'permissions.access'
      },
      {
        name: t('navigation.systemConfig'),
        href: '/system-config',
        icon: Settings,
        requiredPermission: 'system-config.access'
      },
      {
        name: t('navigation.ctxh'),
        key: 'ctxh',
        icon: Heart,
        requiredPermission: 'ctxh.access', // Only need access to show dropdown
        children: [
          {
            name: t('navigation.ctxhCategories'),
            href: '/ctxh/categories',
            icon: Database,
            requiredPermission: 'ctxh.categories.view'
          },
          {
            name: t('navigation.ctxhActivities'),
            href: '/ctxh/activities',
            icon: Calendar,
            requiredPermission: 'ctxh.activities.view'
          },
          {
            name: t('navigation.ctxhLimitConfig'),
            href: '/ctxh/limit-config',
            icon: Settings,
            requiredPermission: 'ctxh.config.manage'
          },
          {
            name: t('navigation.ctxhImportOldSystem'),
            href: '/ctxh/import-old-system',
            icon: Upload,
            requiredPermission: 'ctxh.import.old_system'
          }
        ]
      },
      {
        name: t('navigation.ctxhStudentReport'),
        href: '/student-reports',
        icon: BarChart,
        // requiredPermission: 'ctxh.reports.view'
      },
      {
        name: 'Biểu mẫu',
        href: '/forms',
        icon: FileText,
      },
      {
        name: 'Quản lý biểu mẫu',
        href: '/admin/templates',
        icon: Settings,
        // requiredPermission: 'templates.manage' // Tạm thời bỏ để test
      },
      {
        name: t('navigation.paymentAdmin'),
        href: '/admin/payment-campaigns',
        icon: CreditCard,
        requiredPermission: 'payment-campaigns.access'
      },
      {
        name: t('navigation.myPayments'),
        href: '/payment/my-campaigns',
        icon: CreditCard,
      }
    ];

    // If not authenticated, return empty navigation (pages will handle auth via AuthGuard)
    if (!permissions.isAuthenticated) {
      return [];
    }

    // If permissions are still loading, show all items temporarily
    if (permissions.permissionsLoading) {
      return baseNavigation;
    }    // Filter items based on permissions
    const filteredNavigation = baseNavigation.filter(item => {
      if ('requiredPermission' in item && item.requiredPermission) {
        // Special handling for CTXH report permission
        if (item.requiredPermission === 'ctxh.reports.view') {
          return ctxhPermissions.reports.view;
        }

        // Regular permission check
        const hasAccess = permissions.hasPermission(item.requiredPermission, permissions.currentOrganizationId);
        return hasAccess;
      }

      if ('children' in item && item.children) {
        // Check parent permission first (for showing dropdown)
        if ('requiredPermission' in item && item.requiredPermission) {
          // Special handling for CTXH access permission
          if (item.requiredPermission === 'ctxh.access') {
            const hasCtxhAccess = permissions.hasPermission('ctxh.access', permissions.currentOrganizationId);
            if (!hasCtxhAccess) {
              return false; // Don't show dropdown if no ctxh.access
            }
          } else {
            // Regular permission check for other parent menus
            const hasAccess = permissions.hasPermission(item.requiredPermission, permissions.currentOrganizationId);
            if (!hasAccess) {
              return false;
            }
          }
        }

        // Now check children permissions
        if (item.key === 'ctxh') {
          // Filter children based on CTXH permissions
          const accessibleChildren = item.children.filter(child => {
            if (child.requiredPermission) {
              if (child.requiredPermission === 'ctxh.categories.view') {
                return ctxhPermissions.categories.view;
              } else if (child.requiredPermission === 'ctxh.activities.view') {
                return ctxhPermissions.activities.view;
              } else if (child.requiredPermission === 'ctxh.config.manage') {
                return ctxhPermissions.config.manage;
              }
            }
            return false; // Default to false for CTXH items without permission
          });

          // Show dropdown only if has ctxh.access AND has accessible children
          const hasCtxhAccess = permissions.hasPermission('ctxh.access', permissions.currentOrganizationId);
          return hasCtxhAccess && accessibleChildren.length > 0;
        }

        // Regular permission check for other menus
        const accessibleChildren = item.children.filter(child => {
          if (child.requiredPermission) {
            const hasAccess = permissions.hasPermission(child.requiredPermission, permissions.currentOrganizationId);
            return hasAccess;
          }
          return true;
        });
        return accessibleChildren.length > 0;
      }

      return true;
    }).map(item => {
      if ('children' in item && item.children) {
        // Special handling for CTXH menu
        if (item.key === 'ctxh') {
          const filteredChildren = item.children.filter(child => {
            if (child.requiredPermission) {
              if (child.requiredPermission === 'ctxh.categories.view') {
                return ctxhPermissions.categories.view;
              } else if (child.requiredPermission === 'ctxh.activities.view') {
                return ctxhPermissions.activities.view;
              } else if (child.requiredPermission === 'ctxh.config.manage') {
                return ctxhPermissions.config.manage;
              } else if (child.requiredPermission === 'ctxh.import.old_system') {
                return permissions.hasPermission('ctxh.import.old_system', permissions.currentOrganizationId);
              }
            }
            return false; // Default to false for CTXH items without permission
          });

          return {
            ...item,
            children: filteredChildren
          };
        }

        // Regular permission check for other menus
        return {
          ...item,
          children: item.children.filter(child =>
            child.requiredPermission ? permissions.hasPermission(child.requiredPermission, permissions.currentOrganizationId) : true
          )
        };
      }
      return item;
    });

    return filteredNavigation;
  };
  const navigation = getFilteredNavigation();

  // Show loading if permissions are still loading
  if (permissions.permissionsLoading || ctxhPermissions.loading) {
    return <AppLoadingScreen />;
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const isParentActive = (children: any[]) => children.some(child => child.href && isActive(child.href));

  return (
    <div className={`min-h-screen bg-background ${isDarkMode ? 'dark' : ''}`} style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-doan-600 shadow-lg transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-white">
            <h1 className="text-lg font-bold text-white">
              {t('appName')}
            </h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-md lg:hidden hover:bg-white hover:bg-opacity-20 text-white"
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
                        ? 'bg-white bg-opacity-20 text-white border-l-2 border-white'
                        : 'text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white'
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
                                ? 'bg-white text-doan-500'
                                : 'text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white'
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
                    ? 'bg-white text-doan-500'
                    : 'text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white'
                    }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-doan-400">
            <div className="text-xs text-white text-opacity-60">
              {t('footer.copyright')}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all ${isSidebarOpen ? 'lg:ml-64' : ''}`} style={{ overflowX: 'hidden', maxWidth: '100%' }}>
        {/* Top bar */}
        <header className="bg-white border-b border-gray-300 shadow-sm dark:bg-gray-900 dark:border-gray-700" style={{ width: '100%', maxWidth: '100%' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ maxWidth: '100%' }}>
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
        <main className="p-6" style={{ width: '100%', overflowX: 'hidden', maxWidth: '100%' }}>
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
