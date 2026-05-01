import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Combobox } from '../../../shared';
import { RoleAssignmentItem } from '../../../shared/types/user';
import { Organization } from '../../../shared/types/organization';
import { Role } from '../../permissions/services/roleService';

interface RoleAssignmentItemProps {
    assignment: RoleAssignmentItem;
    roles: Role[];
    organizations: Organization[];
    onUpdate: (id: string, field: keyof RoleAssignmentItem, value: string) => void;
    onRemove: (id: string) => void;
    canRemove: boolean;  // Prevent removing the last assignment
    loading?: boolean;
    disabled?: boolean;
}

const RoleAssignmentItemComponent: React.FC<RoleAssignmentItemProps> = ({
    assignment,
    roles,
    organizations,
    onUpdate,
    onRemove,
    canRemove,
    loading = false,
    disabled = false,
}) => {
    const { t } = useTranslation(['users', 'common']);

    const handleRoleSelect = (roleId: string) => {
        onUpdate(assignment.id, 'roleId', roleId);
    };

    const handleOrganizationSelect = (organizationId: string) => {
        onUpdate(assignment.id, 'organizationId', organizationId);
    };

    const handleRemove = () => {
        if (canRemove) {
            onRemove(assignment.id);
        }
    };

    return (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('users:labels.roleAssignment')}
                </h4>
                {canRemove && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={disabled || loading}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('common:actions.remove')}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Role Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('users:fields.role')} *
                    </label>
                    <Combobox
                        options={roles.map(role => ({
                            id: role.id,
                            label: role.name,
                            description: role.description || t('users:labels.permissionsCount', {
                                count: role.permissions?.length || 0,
                                defaultValue: `${role.permissions?.length || 0} quyền`
                            })
                        }))}
                        value={assignment.roleId}
                        placeholder={t('users:placeholders.selectRole')}
                        searchPlaceholder={t('users:labels.searchRolesPlaceholder', { defaultValue: 'Tìm kiếm vai trò...' })}
                        loading={loading}
                        disabled={disabled}
                        allowInput={true}
                        dropdownPortal={true}
                        onSelect={handleRoleSelect}
                        onClear={() => handleRoleSelect('')}
                    />
                    {assignment.error && assignment.error.includes('roleId') && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {assignment.error}
                        </p>
                    )}
                </div>

                {/* Organization Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('users:fields.organization')}
                    </label>
                    <Combobox
                        options={organizations.map(org => ({
                            id: org.id,
                            label: org.name,
                            description: org.description || org.code
                        }))}
                        value={assignment.organizationId || ''}
                        placeholder={t('users:placeholders.selectOrganization')}
                        searchPlaceholder={t('users:labels.searchOrganizationsPlaceholder', { defaultValue: 'Tìm kiếm tổ chức...' })}
                        loading={loading}
                        disabled={disabled}
                        allowInput={true}
                        dropdownPortal={true}
                        onSelect={handleOrganizationSelect}
                        onClear={() => handleOrganizationSelect('')}
                    />
                    {assignment.error && assignment.error.includes('organizationId') && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {assignment.error}
                        </p>
                    )}
                </div>
            </div>

            {/* Assignment Status/Info */}
            {assignment.roleId && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    {assignment.organizationId ? (
                        <span>
                            🎯 {t('users:messages.roleInOrganization')}
                        </span>
                    ) : (
                        <span>
                            🌍 {t('users:messages.globalRole')}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default RoleAssignmentItemComponent;
