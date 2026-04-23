import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFormsPage } from '../hooks';
import { Toast } from '@/shared/components';

// Tab components
import TemplateListTab from '../components/user/tabs/TemplateListTab';
import FormFillTab from '../components/user/tabs/FormFillTab';
import MySubmissionsTab from '../components/user/tabs/MySubmissionsTab';

// Forms Page Header Component
interface FormsPageHeaderProps {
  title: string;
  subtitle: string;
  tabs: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const FormsPageHeader: React.FC<FormsPageHeaderProps> = ({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>

      {/* Tab Navigation */}
      <nav className="flex px-4 sm:px-6 lg:px-8 -mb-px space-x-8" aria-label="Tabs">
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
            </button>
          );
        })}
      </nav>
    </div>
  );
};

// Main FormsPage Component
const FormsPage: React.FC = () => {
  const { t } = require('react-i18next').useTranslation(['templates', 'common']);
  const [searchParams] = useSearchParams();

  const {
    state,
    tabs,
    handleTabChange,
    handleSelectTemplate,
    handleBackToList,
    handleSubmitSuccess,
    handleEditSubmission,
    toasts,
    showSuccess,
    showError,
    hideToast,
  } = useFormsPage();

  const { activeTab, selectedTemplateId, editingSubmission } = state;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Header */}
      <FormsPageHeader
        title={t('templates:title')}
        subtitle={t('templates:subtitle')}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Tab Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'templates' && !selectedTemplateId && (
          <TemplateListTab onSelectTemplate={handleSelectTemplate} />
        )}
        {(activeTab === 'fill' || selectedTemplateId) && (
          <FormFillTab
            templateId={selectedTemplateId || searchParams.get('templateId')}
            onBack={handleBackToList}
            onSubmitSuccess={handleSubmitSuccess}
            editingSubmission={editingSubmission}
          />
        )}
        {activeTab === 'submissions' && (
          <MySubmissionsTab
            onEdit={handleEditSubmission}
            showSuccess={showSuccess}
            showError={showError}
          />
        )}
      </div>
    </div>
  );
};

export default FormsPage;
