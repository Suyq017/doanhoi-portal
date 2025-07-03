import React, { ReactNode, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OrganizationStats as StatsType } from '../../../shared/types/organization';
import OrganizationStats from './OrganizationStats';
import {
    Toast, AddDropdownButton, DropdownOption, ImportModal, ImportModalConfig,

} from '../../../shared';
import { Upload } from 'lucide-react';
import CreateOrganizationModal, { CreateOrganizationData } from '../components/CreateOrganizationModal';

interface OrganizationPageLayoutProps {
    title: string;
    subtitle?: string;
    stats: StatsType;
    children: ReactNode;
    loading?: boolean;
    error?: string | null;
    onRetry?: () => Promise<void>;
    importConfig?: ImportModalConfig<any>;
    // Dropdown button support
    showDropdownButton?: boolean;
    dropdownOptions?: DropdownOption[];
    dropdownLabel?: string;
    toasts?: Array<{
        id: string;
        type: 'success' | 'error' | 'info';
        message: string;
        duration?: number;
    }>;
    onCloseToast?: (id: string) => void;
}


const OrganizationPageLayout: React.FC<OrganizationPageLayoutProps> = ({
    title,
    subtitle,
    stats,
    children,
    loading = false,
    error = null,
    onRetry,
    importConfig,
    showDropdownButton = false,
    dropdownLabel,
    toasts = [],
    onCloseToast
}) => {
    const { t, i18n } = useTranslation(['organizations', 'common']);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
    };
    const handleCreateOrganization = async (data: CreateOrganizationData) => {
        console.log('Creating organization with data:', data);
        // if (!onCreateOrganization) {
        //     console.warn('onCreateOrganization callback not provided');
        //     return;
        // }

        // try {
        //     setIsCreating(true);
        //     await onCreateOrganization(data);
        //     setIsCreateModalOpen(false);
        //     onShowSuccess?.(t('organizations:create.success', { defaultValue: 'Tạo tổ chức thành công!' }));
        // } catch (error) {
        //     console.error('Error creating organization:', error);
        //     const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
        //     onShowError?.(t('organizations:create.error', { defaultValue: errorMessage }));
        // } finally {
        //     setIsCreating(false);
        // }
    };


    const addDropdownOptions: DropdownOption[] = [
        {
            key: 'single',
            label: t('organizations:addButton.manual'),
            icon: <Plus className="w-4 h-4" />,
            description: t('organizations:addButton.manualDesc'),
            onClick: () => setIsCreateModalOpen(true)
        },
        // Import classes from Excel option:
        {
            key: 'fromFile',
            label: t('organizations:addButton.fromFile'),
            icon: <Upload className="w-4 h-4" />,
            description: t('organizations:addButton.fromFileDesc'),
            onClick: () => setIsImportModalOpen(true)
        }
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            {subtitle || t('organizations:subtitle')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-doan-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">
                            {t('common:states.loading')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            {subtitle || t('organizations:subtitle')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="text-red-500 text-xl mb-4">⚠️</div>
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="mt-4 px-4 py-2 bg-doan-600 text-white rounded-lg hover:bg-doan-700"
                            >
                                {t('common:actions.retry')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6" key={i18n.language}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {title}
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        {subtitle || t('organizations:subtitle')}
                    </p>
                </div>
                {showDropdownButton && (
                    <div className="mt-4 sm:mt-0">
                        <AddDropdownButton
                            label={dropdownLabel || t('organizations:addButton.dropdown')}
                            options={addDropdownOptions}
                            loading={loading}
                        />
                    </div>
                )}
            </div>

            {/* Stats */}
            <OrganizationStats
                doanCount={stats.doanStats.total}
                hoiCount={stats.hoiStats.total}
                clbCount={stats.clbStats.total}
                totalMembers={stats.totalMembers}
            />


            {/* Main Content */}
            {children}

            {isCreateModalOpen && (
                <CreateOrganizationModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleCreateOrganization}
                    // loading={isCreating}
                    level={1}
                />
            )}

            {isImportModalOpen && importConfig && (
                <ImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    config={importConfig}
                />
            )}

            {/* Toasts */}
            {toasts && onCloseToast && toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    type={toast.type}
                    message={toast.message}
                    duration={toast.duration}
                    onClose={() => onCloseToast(toast.id)}
                />
            ))}
        </div>
    );
};

export default OrganizationPageLayout;