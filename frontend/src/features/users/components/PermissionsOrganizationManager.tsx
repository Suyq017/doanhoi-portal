import React from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PermissionsOrganizationRow, {
    Permission,
    Organization,
    PermissionAssignment
} from './PermissionsOrganizationRow';

interface PermissionsOrganizationManagerProps {
    assignments: PermissionAssignment[];
    permissions: Permission[];
    organizations: Organization[];
    onUpdateAssignment: (id: string, updates: Partial<PermissionAssignment>) => void;
    onRemoveAssignment: (id: string) => void;
    onAddAssignment: () => void;
    disabled?: boolean;
    className?: string;
}

const PermissionsOrganizationManager: React.FC<PermissionsOrganizationManagerProps> = ({
    assignments,
    permissions,
    organizations,
    onUpdateAssignment,
    onRemoveAssignment,
    onAddAssignment,
    disabled = false,
    className = '',
}) => {
    const { t } = useTranslation(['users']);

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Permission Assignments */}      <div className="space-y-3">
                {assignments.map((assignment) => (
                    <PermissionsOrganizationRow
                        key={assignment.id}
                        assignment={assignment}
                        permissions={permissions}
                        organizations={organizations}
                        onUpdate={(updates) => onUpdateAssignment(assignment.id, updates)}
                        onRemove={() => onRemoveAssignment(assignment.id)}
                        canRemove={assignments.length > 1}
                        disabled={disabled}
                    />
                ))}
            </div>

            {/* Add Permission Button */}
            <button
                onClick={onAddAssignment}
                disabled={disabled}
                className="inline-flex items-center px-4 py-2 border border-doan-300 text-doan-600 rounded-md hover:bg-doan-50 dark:hover:bg-doan-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Plus className="w-4 h-4 mr-2" />
                {t('users:grantPermissions.addPermissionRow')}
            </button>

            {/* Info Text */}
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                <p className="mb-1 font-medium">💡 Hướng dẫn:</p>
                <ul className="space-y-1 list-disc list-inside">
                    <li>
                        <strong>Quyền:</strong> Bắt buộc chọn cho mỗi dòng
                    </li>
                    <li>
                        <strong>Tổ chức (tùy chọn):</strong> Để trống để cấp quyền toàn hệ thống
                    </li>
                    <li>
                        Có tổ chức: Quyền chỉ áp dụng trong tổ chức đó
                    </li>
                    <li>
                        Không có tổ chức: Quyền áp dụng trên toàn hệ thống
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default PermissionsOrganizationManager;
