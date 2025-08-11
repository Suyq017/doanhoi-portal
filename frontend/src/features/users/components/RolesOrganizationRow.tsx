import React from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MultiSelectRoleCombobox from './MultiSelectRoleCombobox';
import MultiSelectOrganizationCombobox from './MultiSelectOrganizationCombobox';

/**
 * RolesOrganizationRow - Single row for role assignment
 * 
 * New Logic: 1 Role -> Multiple Organizations
 * - Each row represents exactly ONE role assigned to MULTIPLE organizations
 * - Role selection is limited to 1 role per row
 * - Organization selection allows multiple organizations
 */

export interface Organization {
    id: string;
    name: string;
    code: string;
    parentId?: string;
    level: number;
}

interface Role {
    id: string;
    name: string;
    displayName: string;
    description?: string;
}

interface RoleAssignment {
    id: string;
    roleIds: string[]; // Will contain exactly 1 role ID with new logic
    organizationIds: string[];
    isGlobal: boolean;
}

interface RolesOrganizationRowProps {
    assignment: RoleAssignment;
    roles: Role[];
    organizations: Organization[];
    userOrganizations: Organization[];
    onUpdate: (updates: Partial<RoleAssignment>) => void;
    onRemove: () => void;
    canRemove: boolean;
    disabled?: boolean;
}

const RolesOrganizationRow: React.FC<RolesOrganizationRowProps> = ({
    assignment,
    roles,
    organizations,
    userOrganizations,
    onUpdate,
    onRemove,
    canRemove,
    disabled = false,
}) => {
    const { t } = useTranslation(['users', 'common']);
    
    const handleRoleChange = (roleIds: string[]) => {
        // With the new format, each assignment should only have one role
        // If multiple roles are selected, only take the first one
        const singleRoleId = roleIds.length > 0 ? [roleIds[0]] : [];
        onUpdate({ roleIds: singleRoleId });
    };

    const handleOrganizationChange = (organizationIds: string[]) => {
        onUpdate({
            organizationIds,
            isGlobal: organizationIds.length === 0
        });
    };

    const availableOrganizations = organizations; return (
        <div className="relative p-5 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200">
            {/* Remove Button - Positioned absolutely in top-right */}
            {canRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={disabled}
                    className="absolute top-3 right-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    title={t('users:roleAssignmentRow.removeRow', { defaultValue: 'Xóa hàng này' })}
                >
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
            )}

            {/* Labels Row - Always aligned */}
            <div className="grid grid-cols-2 gap-6 pr-12 mb-2">                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {t('users:roleAssignmentRow.roleLabel', { defaultValue: 'Vai trò (chọn 1)' })}
            </label>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('users:roleAssignmentRow.organizationLabel', { defaultValue: 'Tổ chức' })}
                </label>
            </div>            {/* Content Row - Equal height with synchronized structure */}
            <div className="grid grid-cols-2 gap-6 pr-12 items-stretch" style={{ minHeight: '140px' }}>
                {/* Role Selection */}
                <div className="flex flex-col h-full">
                    <MultiSelectRoleCombobox
                        roles={roles}
                        selectedRoleIds={assignment.roleIds}
                        onRoleSelect={handleRoleChange}
                        disabled={disabled}
                        placeholder={t('users:roleAssignmentRow.selectRolePlaceholder', { defaultValue: 'Chọn vai trò...' })}
                    />
                </div>

                {/* Organization Selection */}                <div className="flex flex-col h-full">
                    <MultiSelectOrganizationCombobox
                        organizations={availableOrganizations}
                        selectedOrganizationIds={assignment.organizationIds}
                        onOrganizationSelect={handleOrganizationChange}
                        userOrganizations={userOrganizations}
                        disabled={disabled}
                        allowEmpty={true}
                        placeholder={t('users:roleAssignmentRow.selectOrganizationPlaceholder', { 
                            defaultValue: 'Chọn tổ chức hoặc để trống cho toàn hệ thống...' 
                        })}
                    />
                </div>
            </div>
        </div>
    );
};

export default RolesOrganizationRow;
