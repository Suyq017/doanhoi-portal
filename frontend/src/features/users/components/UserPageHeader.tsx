/**
 * UserPageHeader - Page header component for users
 */

import React from 'react';
import { Plus, Upload, Download, Shield, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    AddDropdownButton,
    ConditionalRender,
    createPermissionBasedDropdownOptions,
    PermissionBasedDropdownOption,
} from '../../../shared';
import type { UserPagePermissions } from '../types';

export interface UserPageHeaderProps {
    onCreateClick: () => void;
    onImportClick: () => void;
    onExportClick: () => void;
    onGrantRolesClick?: () => void;
    onAssignRolesClick?: () => void;
    isCreating?: boolean;
    permissions: UserPagePermissions;
}

export const UserPageHeader: React.FC<UserPageHeaderProps> = ({
    onCreateClick,
    onImportClick,
    onExportClick,
    onGrantRolesClick,
    onAssignRolesClick,
    isCreating = false,
    permissions,
}) => {
    const { t } = useTranslation(['users', 'common']);

    // Build dropdown options based on permissions
    const getFilteredDropdownOptions = () => {
        const baseOptions: PermissionBasedDropdownOption[] = [
            {
                key: 'single',
                label: t('users:addButton.single', { defaultValue: t('common:actions.create') }),
                icon: <Plus className="w-4 h-4" />,
                description: t('users:addButton.singleDesc', { defaultValue: 'Tạo người dùng mới bằng form' }),
                onClick: onCreateClick,
                requiredPermission: 'canCreate',
            },
            {
                key: 'fromFile',
                label: t('users:addButton.fromFile', { defaultValue: 'Import từ file Excel' }),
                icon: <Upload className="w-4 h-4" />,
                description: t('users:addButton.fromFileDesc', { defaultValue: 'Import nhiều người dùng từ file Excel' }),
                onClick: onImportClick,
                requiredPermission: 'canCreate',
            },
            {
                key: 'export',
                label: t('users:addButton.export', { defaultValue: 'Xuất dữ liệu' }),
                icon: <Download className="w-4 h-4" />,
                description: t('users:addButton.exportDesc', { defaultValue: 'Xuất danh sách người dùng ra file Excel' }),
                onClick: onExportClick,
                requiredPermission: 'canExport',
            },
        ];

        return createPermissionBasedDropdownOptions(
            baseOptions,
            (permission: string) => {
                const permissionKey = permission as keyof UserPagePermissions;
                return permissions[permissionKey] === true;
            }
        );
    };

    const addDropdownOptions = getFilteredDropdownOptions();

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('users:title')}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {t('users:subtitle')}
                </p>
            </div>

            <div className="flex items-center mt-4 space-x-3 sm:mt-0">
                {/* Grant Roles Button - Temporarily Hidden */}
                {false && onGrantRolesClick && (
                    <button
                        onClick={onGrantRolesClick}
                        className="inline-flex items-center px-4 py-2 text-white transition-colors duration-200 rounded-md bg-doan-600 hover:bg-doan-700 focus:outline-none focus:ring-2 focus:ring-doan-500 focus:ring-offset-2"
                    >
                        <Shield className="w-5 h-5 mr-2" />
                        <span className="font-medium">
                            {t('users:actions.grantRoles', { defaultValue: 'Cấp vai trò' })}
                        </span>
                    </button>
                )}

                {/* Role Assignment Button - Temporarily Hidden */}
                <ConditionalRender condition={false && permissions.canManageRoles && !!onAssignRolesClick}>
                    <button
                        onClick={onAssignRolesClick}
                        className="inline-flex items-center px-4 py-2 transition-colors border rounded-md border-doan-600 text-doan-600 hover:bg-doan-50 dark:hover:bg-doan-900/20"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {t('users:actions.assignRoles')}
                    </button>
                </ConditionalRender>

                {/* Add User Dropdown */}
                <ConditionalRender condition={addDropdownOptions.length > 0}>
                    <AddDropdownButton
                        label={t('users:addButton.dropdown', { defaultValue: t('common:actions.create') })}
                        options={addDropdownOptions}
                        loading={isCreating}
                    />
                </ConditionalRender>
            </div>
        </div>
    );
};

export default UserPageHeader;
