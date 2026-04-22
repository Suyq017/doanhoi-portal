import React from 'react';
import { Plus } from 'lucide-react';
import {
    PageHeaderProps,
    ActivityManagementHeaderProps,
    CategoryManagementHeaderProps,
    LimitConfigManagementHeaderProps
} from '../../types';

/**
 * Base Page Header component
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    action
}) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && (
                <div className="mt-4 sm:mt-0">
                    {action}
                </div>
            )}
        </div>
    );
};

/**
 * Create Button component
 */
interface CreateButtonProps {
    onClick: () => void;
    label: string;
}

export const CreateButton: React.FC<CreateButtonProps> = ({ onClick, label }) => {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
        >
            <Plus className="mr-2 h-4 w-4" />
            {label}
        </button>
    );
};

/**
 * Activity Management Header
 */
export const ActivityManagementHeader: React.FC<ActivityManagementHeaderProps> = ({
    title,
    subtitle,
    canCreate,
    checkingPermissions,
    onCreateClick,
    createButtonLabel
}) => {
    return (
        <PageHeader
            title={title}
            subtitle={subtitle}
            action={
                !checkingPermissions && canCreate ? (
                    <CreateButton onClick={onCreateClick} label={createButtonLabel} />
                ) : null
            }
        />
    );
};

/**
 * Category Management Header
 */
export const CategoryManagementHeader: React.FC<CategoryManagementHeaderProps> = ({
    title,
    subtitle,
    canCreate,
    onCreateClick,
    createButtonLabel
}) => {
    return (
        <PageHeader
            title={title}
            subtitle={subtitle}
            action={
                canCreate ? (
                    <CreateButton onClick={onCreateClick} label={createButtonLabel} />
                ) : null
            }
        />
    );
};

/**
 * Limit Config Management Header
 */
export const LimitConfigManagementHeader: React.FC<LimitConfigManagementHeaderProps> = ({
    title,
    subtitle,
    onCreateClick,
    createButtonLabel
}) => {
    return (
        <PageHeader
            title={title}
            subtitle={subtitle}
            action={<CreateButton onClick={onCreateClick} label={createButtonLabel} />}
        />
    );
};
