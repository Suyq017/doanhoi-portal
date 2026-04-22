import React, { ReactNode, useRef, useCallback, useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Building, Home, Menu, Sun, Moon, Building2, GraduationCap, Database, ChevronDown, ChevronRight, Shield, CreditCard, Heart, Calendar, BarChart, Settings, Upload, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { LoginButton } from '../../features/auth';
import { usePermissions } from '../hooks/usePermissions';
import { useCtxhPermissions } from '../../features/ctxh/hooks';
import { AppLoadingScreen } from './AppLoadingScreen';

interface LayoutProps {
  children: ReactNode;
}

const EXPANDED_MENUS_KEY = 'expandedMenus';
const SIDEBAR_SCROLL_KEY = 'sidebarScrollPosition';
const EXPANDED_SECTIONS_KEY = 'expandedSections';
const LAYOUT_LOADED_KEY = 'layoutInitiallyLoaded';

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  const isRestoringScroll = useRef(false);
  // Initialize from sessionStorage to persist across remounts
  const hasInitiallyLoaded = useRef(sessionStorage.getItem(LAYOUT_LOADED_KEY) === 'true');

  // Load expanded menus from localStorage, default to ['dataManagement', 'ctxh'] if not found
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_MENUS_KEY);
      return saved ? JSON.parse(saved) : ['dataManagement', 'ctxh'];
    } catch {
      return ['dataManagement', 'ctxh'];
    }
  });

  // Load expanded sections from localStorage, default to all expanded
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_SECTIONS_KEY);
      return saved ? JSON.parse(saved) : ['common', 'admin', 'student'];
    } catch {
      return ['common', 'admin', 'student'];
    }
  });

  const location = useLocation();
  const { t } = useTranslation('common');
  const permissions = usePermissions();
  const ctxhPermissions = useCtxhPermissions();

  // Track initial load completion using shared state
  useEffect(() => {
    if (!permissions.permissionsLoading && !ctxhPermissions.loading) {
      hasInitiallyLoaded.current = true;
      // Also set in sessionStorage to persist across Layout remounts
      sessionStorage.setItem(LAYOUT_LOADED_KEY, 'true');
    }
  }, [permissions.permissionsLoading, ctxhPermissions.loading]);

  // Restore scroll position after navigation - use useLayoutEffect for synchronous update
  useLayoutEffect(() => {
    const restoreScroll = () => {
      const savedScrollPosition = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
      if (savedScrollPosition && navRef.current) {
        isRestoringScroll.current = true;
        navRef.current.scrollTop = parseInt(savedScrollPosition, 10);
        // Reset flag after a short delay
        setTimeout(() => {
          isRestoringScroll.current = false;
        }, 100);
      }
    };

    // Restore immediately
    restoreScroll();

    // Also restore after a small delay to handle async renders
    const timeoutId = setTimeout(restoreScroll, 50);

    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  // Save scroll position on scroll (but not when restoring)
  const handleNavScroll = useCallback(() => {
    if (navRef.current && !isRestoringScroll.current) {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, navRef.current.scrollTop.toString());
    }
  }, []);

  // Save expanded menus to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(EXPANDED_MENUS_KEY, JSON.stringify(expandedMenus));
  }, [expandedMenus]);

  // Save expanded sections to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(EXPANDED_SECTIONS_KEY, JSON.stringify(expandedSections));
  }, [expandedSections]);

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

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionKey)
        ? prev.filter(key => key !== sectionKey)
        : [...prev, sectionKey]
    );
  };

  // Navigation sections
  type NavSection = 'common' | 'admin' | 'student';

  interface NavItem {
    name: string;
    href?: string;
    icon: any;
    key?: string;
    requiredPermission?: string;
    section: NavSection;
    children?: {
      name: string;
      href: string;
      icon: any;
      requiredPermission?: string;
    }[];
  }

  // Filter navigation items based on permissions
  const getFilteredNavigation = () => {
    const baseNavigation: NavItem[] = [
      // === COMMON SECTION ===
      {
        name: t('navigation.dashboard'),
        href: '/portal',
        icon: Home,
        requiredPermission: 'dashboard.access',
        section: 'common'
      },
      // === ADMIN SECTION ===
      {
        name: t('navigation.dataManagement'),
        key: 'dataManagement',
        icon: Database,
        section: 'admin',
        children: [
          {
            name: t('navigation.users'),
            href: '/portal/users',
            icon: Users,
            requiredPermission: 'users.access'
          },
          {
            name: t('navigation.organizations'),
            href: '/portal/organizations',
            icon: Building,
            requiredPermission: 'organizations.access'
          },
          {
            name: t('navigation.departments'),
            href: '/portal/departments',
            icon: Building2,
            requiredPermission: 'departments.access'
          },
          {
            name: t('navigation.classes'),
            href: '/portal/classes',
            icon: GraduationCap,
            requiredPermission: 'classes.access'
          },
        ]
      },
      {
        name: t('navigation.systemConfig'),
        key: 'systemConfig',
        icon: Settings,
        section: 'admin',
        children: [
          {
            name: t('navigation.permissions'),
            href: '/portal/permissions',
            icon: Shield,
            requiredPermission: 'permissions.access'
          },
          {
            name: t('navigation.systemConfig'),
            href: '/portal/system-config',
            icon: Settings,
            requiredPermission: 'system-config.access'
          },
        ]
      },
      {
        name: t('navigation.ctxh'),
        key: 'ctxh',
        icon: Heart,
        requiredPermission: 'ctxh.access',
        section: 'admin',
        children: [
          {
            name: t('navigation.ctxhCategories'),
            href: '/portal/ctxh/categories',
            icon: Database,
            requiredPermission: 'ctxh.categories.view'
          },
          {
            name: t('navigation.ctxhActivities'),
            href: '/portal/ctxh/activities',
            icon: Calendar,
            requiredPermission: 'ctxh.activities.view'
          },
          {
            name: t('navigation.ctxhLimitConfig'),
            href: '/portal/ctxh/limit-config',
            icon: Settings,
            requiredPermission: 'ctxh.config.manage'
          },
          {
            name: t('navigation.ctxhImportOldSystem'),
            href: '/portal/ctxh/import-old-system',
            icon: Upload,
            requiredPermission: 'ctxh.import.old_system'
          }
        ]
      },
      {
        name: t('navigation.templates'),
        href: '/portal/forms',
        icon: FileText,
        requiredPermission: 'templates.access',
        section: 'admin'
      },
      {
        name: t('navigation.templatesAdmin'),
        href: '/portal/admin/templates',
        icon: Settings,
        requiredPermission: 'templates.admin.access',
        section: 'admin'
      },
      {
        name: t('navigation.paymentAdmin'),
        href: '/portal/admin/payment-campaigns',
        icon: CreditCard,
        requiredPermission: 'payment-campaigns.access',
        section: 'admin'
      },
      // === STUDENT SECTION ===
      {
        name: t('navigation.ctxhStudentReport'),
        href: '/portal/student-reports',
        icon: BarChart,
        section: 'student'
      },
      {
        name: t('navigation.myPayments'),
        href: '/portal/payment/my-campaigns',
        icon: CreditCard,
        section: 'student'
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
              } else if (child.requiredPermission === 'ctxh.import.old_system') {
                return permissions.hasPermission('ctxh.import.old_system', permissions.currentOrganizationId);
              }
            }
            return false; // Default to false for CTXH items without permission
          });

          // Show dropdown only if has accessible children (ẩn nếu không có quyền xem bất kỳ mục con nào)
          return accessibleChildren.length > 0;
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

  // Show loading only on initial load, not on subsequent navigations
  const isInitialLoading = (permissions.permissionsLoading || ctxhPermissions.loading) && !hasInitiallyLoaded.current;
  if (isInitialLoading) {
    return <AppLoadingScreen />;
  }

  const isActive = (path: string) => {
    // Exact match for dashboard (root path)
    if (path === '/portal') {
      return location.pathname === '/portal';
    }
    // For other paths, check exact match or if it starts with the path followed by /
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };
  const isParentActive = (children: any[]) => children.some(child => child.href && isActive(child.href));

  return (
    <div className={`min-h-screen bg-background ${isDarkMode ? 'dark' : ''}`} style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-hsv-500 dark:bg-doan-500 shadow-lg transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex flex-col items-center justify-between p-4 border-b-2 border-white">
            <h1 className="text-lg font-bold text-white">
              {t('appName')}
            </h1>
            <div className="mt-4">
              <img
                src="/assets/logo_doan_hoi_BK_1.png"
                alt={t('auth:form.logoAlt', { defaultValue: 'Đoàn Hội BK logo' })}
                className="mx-auto w-52 h-auto object-contain"
              />
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-md lg:hidden hover:bg-white hover:bg-opacity-20 text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav
            ref={navRef}
            onScroll={handleNavScroll}
            className="flex-1 p-4 space-y-1 overflow-y-auto"
          >
            {/* Section render helper */}
            {(['common', 'admin', 'student'] as NavSection[]).map((section) => {
              const sectionItems = navigation.filter(item => item.section === section);
              if (sectionItems.length === 0) return null;

              const sectionLabels: Record<NavSection, string> = {
                common: t('navigation.sectionCommon'),
                admin: t('navigation.sectionAdmin'),
                student: t('navigation.sectionStudent')
              };

              const isSectionExpanded = expandedSections.includes(section);

              return (
                <div key={section} className="mb-2">
                  {/* Section Header - Clickable */}
                  <button
                    onClick={() => toggleSection(section)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-white text-opacity-70 uppercase tracking-wider hover:bg-white hover:bg-opacity-10 rounded-md transition-colors"
                  >
                    <span>{sectionLabels[section]}</span>
                    {isSectionExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* Section Items */}
                  {isSectionExpanded && (
                    <div className="space-y-1 mt-1">
                      {sectionItems.map((item) => {
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
                    </div>
                  )}
                </div>
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
