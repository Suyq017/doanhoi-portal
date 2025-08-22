import React, { ReactNode, useState } from 'react';
import { Plus, Upload, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OrganizationStats as StatsType } from '../../../shared/types/organization';
import OrganizationStats from './OrganizationStats';
import {
    Toast, AddDropdownButton, DropdownOption, ImportModal, ImportModalConfig,

} from '../../../shared';
import { ExportModal, useExport, USER_EXPORT_FIELDS } from '../../../shared/components/export';
import MemberStats, { MemberStatsProps } from './MemberStats';
import CreateOrganizationModal, { CreateOrganizationData } from '../components/CreateOrganizationModal';
import { organizationService } from '../../../shared/services/organizationService';

interface OrganizationPageLayoutProps {
    organizations?: any[];
    title: string | ReactNode;
    subtitle?: string;
    stats: StatsType;
    memberStats?: MemberStatsProps;
    showMemberStats?: boolean;
    children: ReactNode;
    loading?: boolean;
    error?: string | null; onRetry?: () => Promise<void>;
    importConfig?: ImportModalConfig;
    // Dropdown button support
    showDropdownButton?: boolean;
    dropdownOptions?: DropdownOption[];
    dropdownLabel?: string;
    // Flag to hide manual add option (for members page)
    hideMnualAddOption?: boolean;
    toasts?: Array<{
        id: string;
        type: 'success' | 'error' | 'info';
        message: string;
        duration?: number;
    }>;
    onCloseToast?: (id: string) => void; level: number;
    onRefreshData?: () => void;
    onShowSuccess?: (message: string) => void;
    onShowError?: (message: string) => void;
    onImportModalClose?: () => void; // Add callback for import modal close
    // Export support
    organizationId?: string;
    organizationName?: string;
    type?: string;
}

const OrganizationPageLayout: React.FC<OrganizationPageLayoutProps> = ({
    organizations,
    title,
    subtitle,
    stats,
    memberStats,
    showMemberStats = false,
    children,
    loading = false,
    error = null,
    onRetry,
    importConfig,
    showDropdownButton = false,
    dropdownLabel,
    hideMnualAddOption = false,
    toasts = [],
    onCloseToast, level,
    onRefreshData,
    onShowSuccess,
    onShowError,
    onImportModalClose,
    type,
    organizationId,
    organizationName
}) => {
    const { t, i18n } = useTranslation(['organizations', 'common']);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Export functionality
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const { exportData } = useExport({
        organizationId,
        organizationName,
        onSuccess: (fileName) => {
            onShowSuccess?.(`Xuất file thành công: ${fileName}`);
            setIsExportModalOpen(false);
        },
        onError: (error) => {
            onShowError?.(`Lỗi xuất file: ${error}`);
        },
    });

    const handleExport = async (fields: string[]) => {
        if (organizationId) {
            await exportData(fields, 'organization');
        }
    };

    const renderStats = () => {
        if (showMemberStats && memberStats) {
            return (
                <MemberStats
                    doanVienCount={memberStats.doanVienCount}
                    hoiVienCount={memberStats.hoiVienCount}
                    bothMemberCount={memberStats.bothMemberCount}
                    nonMemberCount={memberStats.nonMemberCount}
                    totalMembers={memberStats.totalMembers}
                    loading={memberStats.loading}
                />
            );
        }        // Default organization stats
        const currentOrgType = organizations?.length === 1 ? organizations[0].type : type;
        return (
            <OrganizationStats
                doanCount={stats.doanStats.total}
                hoiCount={stats.hoiStats.total}
                clbCount={stats.clbStats.total}
                totalMembers={stats.totalMembers}
                loading={loading}
                type={currentOrgType}
            />
        );
    }; const handleCreateOrganization = async (data: CreateOrganizationData) => {
        try {
            if (organizations?.length === 1) {
                data.parentId = organizations[0].id;
            } else {
                let parentOrg;
                if (data.type === 'clb_khoa' || data.type === 'clb_truong' || data.type === 'lien_chi_hoi') {
                    parentOrg = organizations?.find(org => org.type === 'hoi_sinh_vien_truong');
                    data.parentId = parentOrg?.id || '';
                } else {
                    parentOrg = organizations?.find(org => org.type === 'doan_truong');
                    data.parentId = parentOrg?.id || '';
                }
            }

            await organizationService.createOrganization(data);
            setIsCreateModalOpen(false);

            // Hiển thị thông báo thành công trước
            const successMessage = t('organizations:create.success', {
                defaultValue: 'Tạo tổ chức thành công!'
            });

            if (onShowSuccess) {
                onShowSuccess(successMessage);
            }

            // Delay refresh để toast có thời gian hiển thị
            if (onRefreshData) {
                setTimeout(async () => {
                    await onRefreshData();
                }, 2000); // 2 seconds delay to show toast
            }

        } catch (error) {
            console.error('Error creating organization:', error);

            // Hiển thị lỗi cho user
            const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo tổ chức';
            if (onShowError) {
                onShowError(errorMessage);
            } else {
                alert(errorMessage);
            }
        }
    };
    const addDropdownOptions: DropdownOption[] = [
        // Only show manual add option if not hidden
        ...(hideMnualAddOption ? [] : [{
            key: 'single',
            label: t('organizations:addButton.manual'),
            icon: <Plus className="w-4 h-4" />,
            description: t('organizations:addButton.manualDesc'),
            onClick: () => setIsCreateModalOpen(true)
        }]),
        // Import classes from Excel option:
        {
            key: 'fromFile',
            label: t('organizations:addButton.fromFile'),
            icon: <Upload className="w-4 h-4" />,
            description: t('organizations:addButton.fromFileDesc'),
            onClick: () => setIsImportModalOpen(true)
        },
        // Export option for level 3
        ...(level === 3 && organizationId ? [{
            key: 'export',
            label: t('organizations:addButton.export', { defaultValue: 'Xuất dữ liệu' }),
            icon: <Download className="w-4 h-4" />,
            description: t('organizations:addButton.exportDesc', { defaultValue: 'Xuất danh sách thành viên ra file Excel' }),
            onClick: () => setIsExportModalOpen(true)
        }] : [])
    ];

    const filteredDropdownOptions = (type === 'clb_khoa' || type === 'clb_truong' || level === 3)
        ? addDropdownOptions.filter(opt => opt.key === 'fromFile' || opt.key === 'export')
        : addDropdownOptions;

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
                        <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
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
                        <div className="mb-4 text-xl text-red-500">⚠️</div>
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="px-4 py-2 mt-4 text-white rounded-lg bg-doan-600 hover:bg-doan-700"
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
                            options={filteredDropdownOptions}
                            loading={loading}
                        />
                    </div>
                )}
            </div>

            {renderStats()}


            {/* Main Content */}
            {children}

            {isCreateModalOpen && (
                <CreateOrganizationModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleCreateOrganization}
                    // loading={isCreating}
                    level={level}
                    type={type}
                />
            )}            {isImportModalOpen && importConfig && (
                <ImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => {
                        setIsImportModalOpen(false);
                        // Call the custom close handler if provided
                        onImportModalClose?.();
                    }}
                    config={importConfig}
                />
            )}

            {/* Export Modal */}
            {organizationId && (
                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    onExport={handleExport}
                    title={`Xuất danh sách thành viên${organizationName ? ` - ${organizationName}` : ''}`}
                    description="Chọn các trường dữ liệu bạn muốn xuất ra file Excel"
                    availableFields={USER_EXPORT_FIELDS}
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