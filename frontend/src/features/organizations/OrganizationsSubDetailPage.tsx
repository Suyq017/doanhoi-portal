import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';

const OrganizationsSubDetailPage: React.FC = () => {
    const { t } = useTranslation(['organizations', 'common']);
    const { type, code } = useParams<{ type: string; code: string }>();

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

    return (
        <OrganizationPageLayout
            title={getPageTitle()}
            subtitle={t('organizations:subtitle')}
            stats={stats}
            loading={loading}
            error={error}
            onRetry={fetchData}
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
        </OrganizationPageLayout>
    );
};

export default OrganizationsSubDetailPage;