import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, X } from 'lucide-react';
import { User } from '../../../shared';
import { UserActionButtons } from '../UserActions/UserActionButtons';

export interface UserTableProps {
    users: User[];
    loading?: boolean;
    onUserView?: (user: User) => void;
    onUserEdit?: (user: User) => void;
    onUserDelete?: (user: User) => void;
    onBulkDelete?: (userIds: string[]) => void;
    onBulkDeleteRequest?: (userIds: string[]) => void;
    showActions?: boolean;
    showSelection?: boolean;

    // New actions interface
    actions?: {
        showView?: boolean;
        showEdit?: boolean;
        showDelete?: boolean;
        showSelection?: boolean;
    };

    // Deprecated - keep for backward compatibility
    actionConfig?: {
        showView?: boolean;
        showEdit?: boolean;
        showDelete?: boolean;
    };

    emptyMessage?: string;
    className?: string;
    // Expose method to reset selection
    onSelectionReset?: () => void;
}

export interface UserTableRef {
    resetSelection: () => void;
}

export const UserTable: React.FC<UserTableProps> = ({
    users,
    loading = false,
    onUserView,
    onUserEdit,
    onUserDelete,
    onBulkDelete,
    onBulkDeleteRequest,
    showActions = true,
    showSelection = false,
    actions,
    actionConfig = { showView: true, showEdit: true, showDelete: true },
    emptyMessage,
    className = '',
}) => {
    const { t } = useTranslation(['users', 'common']);

    // Merge actions with actionConfig for backward compatibility
    const finalActions = {
        showView: actions?.showView ?? actionConfig?.showView ?? true,
        showEdit: actions?.showEdit ?? actionConfig?.showEdit ?? true,
        showDelete: actions?.showDelete ?? actionConfig?.showDelete ?? true,
        showSelection: actions?.showSelection ?? showSelection,
    };

    // Determine if we should show actions column
    const shouldShowActionsColumn = showActions && (finalActions.showView || finalActions.showEdit || finalActions.showDelete);

    // State for multi-selection
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // Helper functions for selection
    const isAllSelected = selectedUserIds.length > 0 && selectedUserIds.length === users.length;
    const isSomeSelected = selectedUserIds.length > 0;

    const handleSelectAll = useCallback(() => {
        if (isAllSelected) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(users.map(user => user.id));
        }
    }, [isAllSelected, users]);

    const handleSelectUser = useCallback((userId: string) => {
        setSelectedUserIds(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    }, []);
    const handleBulkDelete = useCallback(() => {
        if (selectedUserIds.length > 0) {
            if (onBulkDeleteRequest) {
                onBulkDeleteRequest(selectedUserIds);
            } else if (onBulkDelete) {
                onBulkDelete(selectedUserIds);
                setSelectedUserIds([]);
            }
        }
    }, [onBulkDelete, onBulkDeleteRequest, selectedUserIds]);

    // Reset selection when users change
    useEffect(() => {
        setSelectedUserIds([]);
    }, [users]);

    const getUserTypeText = (type: string) => {
        return type === 'student' ? t('users:types.student') : t('users:types.staff');
    };

    const getMembershipStatusText = (status: string) => {
        switch (status) {
            case 'doan_vien':
                return t('users:membershipStatus.doan_vien');
            case 'hoi_vien':
                return t('users:membershipStatus.hoi_vien');
            case 'both':
                return t('users:membershipStatus.both');
            case 'none':
                return t('users:membershipStatus.none');
            default:
                return status;
        }
    };

    const getMembershipStatusColor = (status: string) => {
        switch (status) {
            case 'doan_vien':
                return 'bg-doan-100 text-doan-800';
            case 'hoi_vien':
                return 'bg-hsv-100 text-hsv-800';
            case 'both':
                return 'bg-green-100 text-green-800';
            case 'none':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className={`overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 ${className}`}>
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
    } return (
        <div className={`overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 ${className}`}>            {/* Bulk Actions Toolbar */}
            {finalActions.showSelection && isSomeSelected && (
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-blue-50 dark:bg-blue-900/20 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {t('common:actions.select')} ({selectedUserIds.length})
                        </span>
                        <button
                            onClick={() => setSelectedUserIds([])}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/40"
                        >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {t('common:actions.delete')} ({selectedUserIds.length})
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full table-auto">
                    <thead className="bg-gray-50 dark:bg-gray-900">                        <tr>
                        {finalActions.showSelection && (
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 border-gray-300 rounded text-doan-600 focus:ring-doan-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </th>
                        )}
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                            {t('users:fields.info')}
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                            {t('users:fields.contact')}
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                            {t('users:fields.type')}
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                            {t('common:fields.status')}
                        </th>                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                            {t('users:fields.created')}
                        </th>
                        {shouldShowActionsColumn && (
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                                {t('common:fields.actions')}
                            </th>
                        )}
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {users.map((user) => (<tr
                            key={user.id}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${finalActions.showSelection && selectedUserIds.includes(user.id)
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : ''
                                }`}
                        >
                            {finalActions.showSelection && (
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedUserIds.includes(user.id)}
                                        onChange={() => handleSelectUser(user.id)}
                                        className="w-4 h-4 border-gray-300 rounded text-doan-600 focus:ring-doan-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {`${user.familyName} ${user.givenName}`}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {user.code}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                    <div className="text-sm text-gray-900 dark:text-white">
                                        {user.email}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {user.phone}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {getUserTypeText(user.userType)}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMembershipStatusColor(
                                        user.membershipStatus
                                    )}`}
                                >
                                    {getMembershipStatusText(user.membershipStatus)}
                                </span>
                            </td>                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            {shouldShowActionsColumn && (
                                <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                    <UserActionButtons
                                        user={user}
                                        onView={onUserView}
                                        onEdit={onUserEdit}
                                        onDelete={onUserDelete}
                                        showView={finalActions.showView}
                                        showEdit={finalActions.showEdit}
                                        showDelete={finalActions.showDelete}
                                    />
                                </td>
                            )}
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {users.length === 0 && (
                <div className="py-12 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                        {emptyMessage || t('common:messages.empty.noResults')}
                    </div>
                </div>
            )}
        </div>
    );
};