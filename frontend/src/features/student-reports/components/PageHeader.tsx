import React from 'react';
import type { PageHeaderProps } from '../types/components.types';

/**
 * PageHeader Component
 * Displays the page title and subtitle
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    className = '',
}) => {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${className}`}>
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {subtitle}
                </p>
            </div>
        </div>
    );
};

export default PageHeader;
