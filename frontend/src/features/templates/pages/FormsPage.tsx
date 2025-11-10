import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, ListChecks } from 'lucide-react';

// Tab components
import TemplateListTab from '../components/user/tabs/TemplateListTab';
import FormFillTab from '../components/user/tabs/FormFillTab';
import MySubmissionsTab from '../components/user/tabs/MySubmissionsTab';

const FormsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Get active tab from URL
  const activeTab = searchParams.get('tab') || 'templates';

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
    if (tabId === 'templates') {
      setSelectedTemplateId(null);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setSearchParams({ tab: 'fill', templateId });
  };

  const handleBackToList = () => {
    setSelectedTemplateId(null);
    setSearchParams({ tab: 'templates' });
  };

  const tabs = [
    {
      id: 'templates',
      label: 'Danh sách biểu mẫu',
      icon: FileText,
    },
    {
      id: 'submissions',
      label: 'Biểu mẫu của tôi',
      icon: ListChecks,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quản lý biểu mẫu
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Điền và quản lý các biểu mẫu của bạn
          </p>
        </div>

        {/* Tab Navigation */}
        <nav className="flex px-6 -mb-px space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(activeTab === 'templates' && !selectedTemplateId) && (
          <TemplateListTab onSelectTemplate={handleSelectTemplate} />
        )}
        {(activeTab === 'fill' || selectedTemplateId) && (
          <FormFillTab
            templateId={selectedTemplateId || searchParams.get('templateId')}
            onBack={handleBackToList}
          />
        )}
        {activeTab === 'submissions' && <MySubmissionsTab />}
      </div>
    </div>
  );
};

export default FormsPage;
