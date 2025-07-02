import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Upload } from 'lucide-react';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import CreateOrganizationModal, { CreateOrganizationData } from './components/CreateOrganizationModal';
import { ImportModal, DropdownOption } from '../../shared';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { organizationImportService } from '../../shared/services/organizationImportService';

const OrganizationsDetailPage: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const { type, code } = useParams<{ type: string; code: string }>();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
    isDetailPage: true
  });

  const renderOrganization = useCallback((org: Organization, level: number = 0) => {
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
        parent={{ type, code }}
      />
    );
  }, [
    stats,
    toggleOrgExpanded,
    handleMemberAdded,
    handleOrganizationUpdated,
    handleMemberAddError,
    handleOrganizationDeleted,
    handleDeleteError,
    type,
    code
  ]);

  const handleCreateOrganization = async (data: CreateOrganizationData) => {
    setIsCreating(true);
    try {
      // Call API to create organization
      await organizationImportService.createOrganization({
        code: data.code,
        name: data.name,
        type: data.type,
        description: data.description,
        parentId: `${type}-${code}`,
      });
      
      // Close modal
      setIsCreateModalOpen(false);
      
      // Refresh data after creation
      await fetchData();
    } catch (error) {
      console.error('Error creating organization:', error);
      // Handle error - could show toast
      handleMemberAddError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo tổ chức');
    } finally {
      setIsCreating(false);
    }
  };

  // Dropdown options for Level 2 (can add organizations or import members)
  const addDropdownOptions: DropdownOption[] = [
    {
      key: 'manual',
      label: t('organizations:addButton.addOrganization'),
      icon: <Plus className="w-4 h-4" />,
      description: t('organizations:addButton.addOrganizationDesc'),
      onClick: () => setIsCreateModalOpen(true)
    },
    {
      key: 'fromFile', 
      label: t('organizations:addButton.fromFile'),
      icon: <Upload className="w-4 h-4" />,
      description: t('organizations:addButton.fromFileDesc'),
      onClick: () => setIsImportModalOpen(true)
    }
  ];

  // Level 2 Import Modal Configuration - Real API Integration
  const level2ImportConfig = {
    templateUrl: `/organizations/members/import/template/2`,
    templateFileName: 'organization_level2_import_template.xlsx',
    columns: [
      { key: 'studentCode', label: 'Mã số sinh viên', required: true, type: 'text' as const },
      { key: 'classOrUnitCode', label: 'Mã lớp/đơn vị', required: true, type: 'text' as const }
    ],
    entityName: 'organizations',
    processingMode: 'server' as const,
    acceptedFileTypes: ['.xlsx', '.xls'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    // Download template function
    downloadTemplate: async () => {
      try {
        const blob = await organizationImportService.downloadTemplate(2);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'organization_level2_import_template.xlsx';
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
      const result = await organizationImportService.uploadImportFile(`${type}-${code}`, file, 2);
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
          classOrUnitCode: r.data.classOrUnitCode || '',
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
      showCreateButton={false}
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

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateOrganization}
        loading={isCreating}
        level={2}
        parentId={`${type}-${code}`}
      />

      {/* Import Modal - Level 2 */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        config={level2ImportConfig}
      />
    </OrganizationPageLayout>
  );
};

export default OrganizationsDetailPage;