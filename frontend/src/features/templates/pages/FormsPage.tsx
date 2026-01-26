import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TemplateSubmission } from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import Toast from '@/shared/components/Toast';

// Tab components
import TemplateListTab from '../components/user/tabs/TemplateListTab';
import FormFillTab from '../components/user/tabs/FormFillTab';
import MySubmissionsTab from '../components/user/tabs/MySubmissionsTab';

const FormsPage: React.FC = () => {
  const { t } = useTranslation(['templates', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<TemplateSubmission | null>(null);
  const [returnTab, setReturnTab] = useState<string>('templates'); // Tab để quay về
  const { toasts, showSuccess, showError, hideToast } = useToast();

  // Get active tab from URL
  const activeTab = searchParams.get('tab') || 'templates';

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
    // Reset state khi chuyển tab
    if (tabId === 'templates') {
      setSelectedTemplateId(null);
      setEditingSubmission(null);
    } else if (tabId === 'submissions') {
      setSelectedTemplateId(null);
      setEditingSubmission(null);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setReturnTab('templates'); // Đánh dấu quay về danh sách biểu mẫu
    setSearchParams({ tab: 'fill', templateId });
  };

  const handleBackToList = () => {
    setSelectedTemplateId(null);
    setEditingSubmission(null);
    setSearchParams({ tab: returnTab }); // Quay về tab được đánh dấu
  };

  const handleSubmitSuccess = (message: string) => {
    setSelectedTemplateId(null);
    setEditingSubmission(null);
    setSearchParams({ tab: 'submissions' }); // Luôn chuyển về "Biểu mẫu của tôi" sau khi submit
    // Hiển thị toast sau khi đã chuyển tab
    setTimeout(() => {
      showSuccess(message);
    }, 100);
  };

  const handleEditSubmission = (submission: TemplateSubmission) => {
    setEditingSubmission(submission);
    setSelectedTemplateId(submission.templateId);
    setReturnTab('submissions'); // Đánh dấu quay về biểu mẫu của tôi
    setSearchParams({ tab: 'fill', templateId: submission.templateId, edit: submission.id });
  };

  const tabs = [
    {
      id: 'templates',
      label: t('templates:tabs.templateList'),
      icon: FileText,
    },
    {
      id: 'submissions',
      label: t('templates:tabs.mySubmissions'),
      icon: ListChecks,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toasts - Fixed position at top-right */}
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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('templates:title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('templates:subtitle')}
          </p>
        </div>

        {/* Tab Navigation */}
        <nav className="flex px-4 sm:px-6 lg:px-8 -mb-px space-x-8" aria-label="Tabs">
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
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {(activeTab === 'templates' && !selectedTemplateId) && (
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
