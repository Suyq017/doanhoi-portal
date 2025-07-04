import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../shared';
import { UserActionButtons } from '../UserActions/UserActionButtons';

export interface UserTableProps {
    users: User[];
    loading?: boolean;
    onUserView?: (user: User) => void;
    onUserEdit?: (user: User) => void;
    onUserDelete?: (user: User) => void;
    showActions?: boolean;
    actionConfig?: {
        showView?: boolean;
        showEdit?: boolean;
        showDelete?: boolean;
    };
    emptyMessage?: string;
    className?: string;
}

export const UserTable: React.FC<UserTableProps> = ({
    users,
    loading = false,
    onUserView,
    onUserEdit,
    onUserDelete,
    showActions = true,
    actionConfig = { showView: true, showEdit: true, showDelete: true },
    emptyMessage,
    className = '',
}) => {
    const { t } = useTranslation(['users', 'common']);

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
    }

    return (
        <div className={`overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full table-auto">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
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
                            </th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                                {t('users:fields.created')}
                            </th>
                            {showActions && (
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                                    {t('common:fields.actions')}
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {users.map((user) => (
                            <tr
                                key={user.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
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
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                                {showActions && (
                                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                        <UserActionButtons
                                            user={user}
                                            onView={onUserView}
                                            onEdit={onUserEdit}
                                            onDelete={onUserDelete}
                                            {...actionConfig}
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