import React from 'react';
import { User } from 'lucide-react';
import type { EmptyStateProps } from '../types/components.types';

/**
 * EmptyState Component
 * Displays an empty state with icon and message
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon,
    className = '',
}) => {
    return (
        <div className={`bg-white dark:bg-gray-800 shadow-sm rounded-lg ${className}`}>
            <div className="px-4 py-5 sm:p-6">
                <div className="text-center py-12">
                    {icon || <User className="mx-auto h-12 w-12 text-gray-400" />}
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmptyState;
