import React from 'react';
import { Calendar, Users } from 'lucide-react';
import { LoadingStateProps, FullPageLoadingProps, EmptyStateProps, ActivityNotFoundProps } from '../../types';

/**
 * Loading spinner component
 */
export const LoadingSpinner: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => {
    return (
        <div className={`inline-block animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400 ${className}`} />
    );
};

/**
 * Loading state for inline use
 */
export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => {
    return (
        <div className="text-center py-8">
            <LoadingSpinner className="h-6 w-6" />
            {message && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
            )}
        </div>
    );
};

/**
 * Full page loading state
 */
export const FullPageLoading: React.FC<FullPageLoadingProps> = ({ message }) => {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <LoadingSpinner className="h-12 w-12 mx-auto" />
                {message && (
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{message}</p>
                )}
            </div>
        </div>
    );
};

/**
 * Container loading state
 */
export const ContainerLoading: React.FC<LoadingStateProps> = ({ message }) => {
    return (
        <div className="container mx-auto px-4 py-6">
            <div className="text-center py-12">
                <LoadingSpinner />
                {message && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
                )}
            </div>
        </div>
    );
};

/**
 * Empty state component
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    message,
    action
}) => {
    return (
        <div className="text-center py-12">
            {icon && (
                <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
                    {icon}
                </div>
            )}
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
            {message && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
            )}
            {action && (
                <div className="mt-6">
                    {action}
                </div>
            )}
        </div>
    );
};

/**
 * Activity not found state
 */
export const ActivityNotFound: React.FC<ActivityNotFoundProps & {
    title: string;
    message: string;
    backLabel: string;
}> = ({ onBack, title, message, backLabel }) => {
    return (
        <div className="container mx-auto px-4 py-6">
            <EmptyState
                icon={<Calendar className="mx-auto h-12 w-12" />}
                title={title}
                message={message}
                action={
                    <button
                        onClick={onBack}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                        {backLabel}
                    </button>
                }
            />
        </div>
    );
};

/**
 * No participants state
 */
export const NoParticipantsState: React.FC<{ title: string; message: string }> = ({ title, message }) => {
    return (
        <div className="mt-8 text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h4 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
        </div>
    );
};
