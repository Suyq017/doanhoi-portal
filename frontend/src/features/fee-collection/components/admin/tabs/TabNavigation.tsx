import React from 'react';
import { DollarSign, Users, Settings, BarChart3, History } from 'lucide-react';

export interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  className = ''
}) => {
  // Predefined tabs for payment campaign admin
  const tabs: Tab[] = [
    {
      id: 'statistics',
      label: 'Theo dõi tiến độ thu phí',
      icon: BarChart3
    },
    {
      id: 'payment-history',
      label: 'Lịch sử thu phí',
      icon: History
    },
    {
      id: 'fee-levels',
      label: 'Mức Phí',
      icon: DollarSign
    },
    {
      id: 'member-assignments',
      label: 'Phân Công Thành Viên',
      icon: Users
    },
    {
      id: 'payos-config',
      label: 'Cấu Hình PayOS',
      icon: Settings
    }
  ];

  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <nav className="flex px-6 -mb-px space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
              } focus:outline-none focus:text-blue-600 focus:border-blue-500 dark:focus:text-blue-400`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`mr-2 h-5 w-5 ${
                  isActive
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'
                }`}
                aria-hidden="true"
              />
              {tab.label}
              {tab.badge && (
                <span
                  className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium ${
                    isActive
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default TabNavigation;
