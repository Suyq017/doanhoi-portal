import React from 'react';
import { User } from '../../../shared';
import { UserTable, UserTableProps } from './UserTable';
import { UserTableFilters, UserTableFiltersProps } from './UserTableFilters';
import { UserTablePagination, UserTablePaginationProps } from './UserTablePagination';

export interface UserTableWithFilterProps {
    // Data props
    users: User[];
    loading?: boolean;
    error?: string | null;

    // Table props
    tableProps?: Partial<UserTableProps>;

    // Filter props
    filterProps: UserTableFiltersProps;

    // Pagination props
    paginationProps?: UserTablePaginationProps;

    // Permission props
    permissions?: {
        canView: boolean;
        canEdit: boolean;
        canDelete: boolean;
        showBulkActions: boolean;
    };

    // Layout
    spacing?: 'sm' | 'md' | 'lg';
    showFilters?: boolean;
    showPagination?: boolean;

    // Error handling
    onRetry?: () => void;
}

export const UserTableWithFilter: React.FC<UserTableWithFilterProps> = ({
    users,
    loading = false,
    error = null,
    tableProps = {},
    filterProps,
    paginationProps,
    permissions,
    spacing = 'md',
    showFilters = true,
    showPagination = true,
    onRetry,
}) => {
    const getSpacingClass = () => {
        switch (spacing) {
            case 'sm': return 'space-y-3';
            case 'lg': return 'space-y-8';
            default: return 'space-y-6';
        }
    };

    if (error) {
        return (
            <div className={getSpacingClass()}>
                {showFilters && <UserTableFilters {...filterProps} />}
                <div className="flex items-center justify-center min-h-[400px] bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
                    <div className="text-center">
                        <div className="mb-4 text-xl text-red-500">⚠️</div>
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="px-4 py-2 mt-4 text-white rounded-lg bg-doan-600 hover:bg-doan-700"
                            >
                                Thử lại
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={getSpacingClass()}>
            {/* Filters */}
            {showFilters && <UserTableFilters {...filterProps} />}            
            
            {/* Table */}
            <UserTable
                users={users}
                loading={loading}
                actions={{
                    showView: permissions?.canView ?? true,
                    showEdit: permissions?.canEdit ?? true,
                    showDelete: permissions?.canDelete ?? true,
                    showSelection: permissions?.showBulkActions ?? true,
                }}
                {...tableProps}
            />

            {/* Pagination */}
            {showPagination && paginationProps && (
                <UserTablePagination {...paginationProps} />
            )}
        </div>
    );
};