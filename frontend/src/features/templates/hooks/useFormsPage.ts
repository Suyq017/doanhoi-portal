import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, ListChecks } from 'lucide-react';
import type { TemplateSubmission } from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import type { UseFormsPageReturn, FormsPageTab, FormsPageState } from '../types';

export function useFormsPage(): UseFormsPageReturn {
    const { t } = useTranslation(['templates', 'common']);
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [editingSubmission, setEditingSubmission] = useState<TemplateSubmission | null>(null);
    const [returnTab, setReturnTab] = useState<string>('templates');
    const { toasts, showSuccess, showError, hideToast } = useToast();

    // Get active tab from URL
    const activeTab = searchParams.get('tab') || 'templates';

    const tabs: FormsPageTab[] = [
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
        setReturnTab('templates');
        setSearchParams({ tab: 'fill', templateId });
    };

    const handleBackToList = () => {
        setSelectedTemplateId(null);
        setEditingSubmission(null);
        setSearchParams({ tab: returnTab });
    };

    const handleSubmitSuccess = (message: string) => {
        setSelectedTemplateId(null);
        setEditingSubmission(null);
        setSearchParams({ tab: 'submissions' });
        // Hiển thị toast sau khi đã chuyển tab
        setTimeout(() => {
            showSuccess(message);
        }, 100);
    };

    const handleEditSubmission = (submission: TemplateSubmission) => {
        setEditingSubmission(submission);
        setSelectedTemplateId(submission.templateId);
        setReturnTab('submissions');
        setSearchParams({ tab: 'fill', templateId: submission.templateId, edit: submission.id });
    };

    const state: FormsPageState = {
        activeTab,
        selectedTemplateId,
        editingSubmission,
        returnTab,
    };

    return {
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
    };
}
