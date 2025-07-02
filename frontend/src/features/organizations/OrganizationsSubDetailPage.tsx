import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Upload } from 'lucide-react';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import AddMemberModal from './components/AddMemberModal';
import { ImportModal, DropdownOption } from '../../shared';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { organizationImportService } from '../../shared/services/organizationImportService';

const OrganizationsSubDetailPage: React.FC = () => {
    const { t } = useTranslation(['organizations', 'common']);
    const { type, code } = useParams<{ type: string; code: string }>();
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

    const {
        organizations,
        stats,
        loading,
        error,
        toggleOrgExpanded,
        fetchData,
        handleMemberAdded,
        handleMemberAddError,
        handleOrganizationUpdated,
        handleOrganizationDeleted,
        handleDeleteError,
        toasts,
        hideToast,
        getPageTitle
    } = useOrganizationPage({
        type,
        code,
        isSubDetailPage: true
    });

    const renderOrganization = useCallback((org: Organization, level: number = 0) => {
        // For sub-detail page, we need the parent's params and the current params
        const parentParams = {
            type: window.location.pathname.split('/')[2],
            code: window.location.pathname.split('/')[3]
        };

        return (
            <OrganizationTreeItem
                key={org.id}
                org={org}
                level={level}
                stats={stats}
                onToggleExpand={toggleOrgExpanded}
                renderChildren={renderOrganization}
                onMemberAdded={handleMemberAdded}
                onOrganizationUpdated={handleOrganizationUpdated}
                onMemberAddError={handleMemberAddError}
                onOrganizationDeleted={handleOrganizationDeleted}
                onDeleteError={handleDeleteError}
                parent={parentParams}
            />
        );
    }, [
        stats,
        toggleOrgExpanded,
        handleMemberAdded,
        handleOrganizationUpdated,
        handleMemberAddError,
        handleOrganizationDeleted,
        handleDeleteError
    ]);

    // Dropdown options for Level 3 (can add members manually or from file)
    const addDropdownOptions: DropdownOption[] = [
        {
            key: 'manual',
            label: t('organizations:addButton.addMember'),
            icon: <Plus className="w-4 h-4" />,
            description: t('organizations:addButton.addMemberDesc'),
            onClick: () => setIsAddMemberModalOpen(true)
        },
        {
            key: 'fromFile', 
            label: t('organizations:addButton.fromFile'),
            icon: <Upload className="w-4 h-4" />,
            description: t('organizations:addButton.fromFileDesc'),
            onClick: () => setIsImportModalOpen(true)
        }
    ];

    // Level 3 Import Modal Configuration - Real API Integration
    const level3ImportConfig = {
        templateUrl: `/organizations/members/import/template/3`,
        templateFileName: 'organization_level3_import_template.xlsx', 
        columns: [
            { key: 'studentCode', label: 'Mã số sinh viên', required: true, type: 'text' as const }
        ],
        entityName: 'organizations',
        processingMode: 'server' as const,
        acceptedFileTypes: ['.xlsx', '.xls'],
        maxFileSize: 5 * 1024 * 1024, // 5MB
        // Download template function
        downloadTemplate: async () => {
            try {
                const blob = await organizationImportService.downloadTemplate(3);
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'organization_level3_import_template.xlsx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error downloading template:', error);
            }
        },
        // Real API functions
        uploadFile: async (file: File) => {
            const result = await organizationImportService.uploadImportFile(`${type}-${code}`, file, 3);
            return {
                sessionId: result.sessionId,
                fileName: file.name,
                totalRows: result.previewData.length,
                message: `Đã tải lên ${result.previewData.length} dòng dữ liệu`
            };
        },
        validateServerData: async (sessionId: string) => {
            const results = await organizationImportService.validateImportData(sessionId);
            const validCount = results.filter(r => r.isValid).length;
            const invalidCount = results.filter(r => !r.isValid).length;
            
            return {
                sessionId,
                isValid: invalidCount === 0,
                summary: {
                    total: results.length,
                    valid: validCount,
                    invalid: invalidCount,
                    duplicates: 0,
                    conflicts: 0
                },
                errors: results.filter(r => !r.isValid).flatMap(r => 
                    r.errors.map(error => ({
                        row: r.rowIndex,
                        column: 'studentCode',
                        message: error,
                        severity: 'error' as const
                    }))
                ),
                warnings: results.flatMap(r => 
                    r.warnings.map(warning => ({
                        row: r.rowIndex,
                        column: 'studentCode',
                        message: warning,
                        severity: 'warning' as const
                    }))
                ),
                previewData: results.slice(0, 5).map(r => ({
                    studentCode: r.data.studentCode,
                }))
            };
        },
        executeServerImport: async (sessionId: string, options?: any) => {
            const result = await organizationImportService.executeImport(sessionId, options?.skipErrors || false);
            return {
                sessionId,
                success: result.failed === 0,
                importedCount: result.successful,
                skippedCount: 0,
                failedCount: result.failed,
                errors: result.errors.map(error => `Dòng ${error.rowIndex}: ${error.error}`),
                message: `Import thành công ${result.successful}/${result.total} bản ghi`
            };
        }
    };

    return (
        <OrganizationPageLayout
            title={getPageTitle()}
            subtitle={t('organizations:subtitle')}
            stats={stats}
            loading={loading}
            error={error}
            onRetry={fetchData}
            showDropdownButton={true}
            dropdownOptions={addDropdownOptions}
            dropdownLabel={t('organizations:addButton.dropdown')}
            toasts={toasts
                .filter(toast => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
                .map(({ type, ...rest }) => ({
                    ...rest,
                    type: type as 'error' | 'success' | 'info'
                }))
            }
            onCloseToast={hideToast}
        >
            <OrganizationTreeContainer
                isEmpty={organizations.length === 0}
            >
                {organizations.map(org => renderOrganization(org))}
            </OrganizationTreeContainer>

            {/* Add Member Modal - Level 3 */}
            <AddMemberModal
                isOpen={isAddMemberModalOpen}
                onClose={() => setIsAddMemberModalOpen(false)}
                organizationCode={`${type}-${code}`}
                organizationName={getPageTitle()}
                onSuccess={handleMemberAdded}
                onError={handleMemberAddError}
            />

            {/* Import Modal - Level 3 */}
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                config={level3ImportConfig}
            />
        </OrganizationPageLayout>
    );
};

export default OrganizationsSubDetailPage;