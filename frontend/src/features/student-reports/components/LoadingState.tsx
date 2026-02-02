import React from 'react';
import type { LoadingStateProps } from '../types/components.types';

/**
 * LoadingState Component
 * Displays a loading spinner
 */
export const LoadingState: React.FC<LoadingStateProps> = ({ className = '' }) => {
    return (
        <div className={`bg-white dark:bg-gray-800 shadow-sm rounded-lg ${className}`}>
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-doan-500 dark:border-t-doan-400 animate-spin"></div>
            </div>
        </div>
    );
};

export default LoadingState;
