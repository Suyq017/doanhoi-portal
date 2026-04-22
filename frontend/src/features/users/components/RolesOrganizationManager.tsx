import React from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RolesOrganizationRow, { Organization } from './RolesOrganizationRow';

/**
 * RolesOrganizationManager - Manages role assignments grouped by role
 * 
 * Logic: Each assignment row represents ONE role with MULTIPLE organizations
 * - 1 role can be assigned to multiple organizations
 * - Each row shows: [Single Role] -> [Multiple Organizations]
 * - If same role needs different organization sets, create separate rows
 */

interface Role {
    id: string;
    name: string;
    description?: string;
}

interface RoleAssignment {
    id: string;
    roleIds: string[]; // In practice, will only contain 1 role ID due to new grouping logic
    organizationIds: string[];
    isGlobal: boolean;
}

interface RolesOrganizationManagerProps {
    assignments: RoleAssignment[];
    roles: Role[];
    organizations: Organization[];
    userOrganizations: Organization[];
    onUpdateAssignment: (id: string, updates: Partial<RoleAssignment>) => void;
    onRemoveAssignment: (id: string) => void;
    onAddAssignment: () => void;
    disabled?: boolean;
}

const RolesOrganizationManager: React.FC<RolesOrganizationManagerProps> = ({
    assignments,
    roles,
    organizations,
    userOrganizations,
    onUpdateAssignment,
    onRemoveAssignment,
    onAddAssignment,
    disabled = false,
}) => {
    const { t } = useTranslation(['users', 'common']);

    return (<div className="space-y-6">
        {/* Assignment Rows */}            <div className="space-y-4">
            {assignments.map((assignment, index) => (
                <div key={assignment.id} className="relative">
                    {/* Row Number Badge */}
                    <div className="absolute -left-4 top-4 w-8 h-8 bg-gradient-to-r from-doan-500 to-doan-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10">
                        {index + 1}
                    </div>

                    <RolesOrganizationRow
                        assignment={assignment}
                        roles={roles}
                        organizations={organizations}
                        userOrganizations={userOrganizations}
                        onUpdate={(updates: Partial<RoleAssignment>) => onUpdateAssignment(assignment.id, updates)}
                        onRemove={() => onRemoveAssignment(assignment.id)}
                        canRemove={true}
                        disabled={disabled}
                    />
                </div>
            ))}
        </div>

        {/* Add Row Button */}
        <div className="flex justify-center pt-4">
            <button
                type="button"
                onClick={onAddAssignment}
                disabled={disabled}
                className="inline-flex items-center gap-3 px-6 py-3 border-2 border-dashed border-doan-300 shadow-sm text-sm font-semibold rounded-xl text-doan-700 bg-doan-50 hover:bg-doan-100 hover:border-doan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
            >
                <div className="p-1 bg-doan-200 rounded-full group-hover:bg-doan-300 transition-colors">
                    <Plus className="w-4 h-4" />
                </div>
                {t('users:grantRoles.addRoleRow', { defaultValue: 'Thêm vai trò khác' })}
            </button>
        </div>
    </div>
    );
};

export default RolesOrganizationManager;
