import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Edit, Trash2, Eye } from 'lucide-react';
import { Role } from '../services/roleService';
import { UseBulkSelectionReturn } from '../hooks';
import { canDeleteRole, canEditRole } from '../utils';

interface RolesTableProps {
    roles: Role[];
    loading: boolean;
    bulkSelection: UseBulkSelectionReturn;
    searchTerm: string;
    onView: (role: Role) => void;
    onEdit: (role: Role) => void;
    onDelete: (role: Role) => void;
    onClearSearch: () => void;
}

const RolesTable: React.FC<RolesTableProps> = ({
    roles,
    loading,
    bulkSelection,
    searchTerm,
    onView,
    onEdit,
    onDelete,
    onClearSearch
}) => {
    const { t } = useTranslation('permissions');
    const {
        selectedItems,
        isSelectAllChecked,
        handleSelectItem,
        handleSelectAll
    } = bulkSelection;

    const selectableRoles = roles.filter(role => !role.isSystemRole);

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full table-auto">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={isSelectAllChecked}
                                    onChange={(e) => handleSelectAll(e.target.checked, selectableRoles)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    disabled={selectableRoles.length === 0}
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {t('fields.name')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {t('fields.permissionCount')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {t('actions.title', 'Thao tác')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {roles.map((role) => (
                            <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(role.id)}
                                        onChange={(e) => handleSelectItem(role.id, e.target.checked)}
                                        disabled={role.isSystemRole}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Shield className="w-5 h-5 text-gray-400 mr-3" />
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {role.name}
                                            </div>
                                            {role.isSystemRole && (
                                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                                    {t('labels.systemRole')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-gray-900 dark:text-white">{role.name}</div>
                                    {role.description && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{role.description}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {t('labels.permissionCountLabel', '{{count}} quyền', { count: role.permissions?.length || 0 })}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => onView(role)}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title={t('actions.view')}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onEdit(role)}
                                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                                            title={t('actions.edit')}
                                            disabled={!canEditRole(role)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(role)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                            title={t('actions.delete')}
                                            disabled={!canDeleteRole(role)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {roles.length === 0 && !loading && (
                <div className="py-12 text-center">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />                    <div className="text-gray-500 dark:text-gray-400 mb-2">
                        {searchTerm ? (
                            <>
                                {t('messages.noSearchResults', 'Không tìm thấy vai trò nào cho "{{searchTerm}}"', { searchTerm })}
                            </>
                        ) : (
                            t('messages.noRoles')
                        )}
                    </div>
                    {searchTerm && (
                        <button
                            onClick={onClearSearch}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                            {t('actions.clearSearch', 'Xóa bộ lọc tìm kiếm')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default RolesTable;
