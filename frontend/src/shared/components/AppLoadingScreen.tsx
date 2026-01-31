import React from 'react';

/**
 * AppLoadingScreen - Main application loading screen
 * Displayed while the app is initializing
 */
export const AppLoadingScreen: React.FC = () => {

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="relative">
                {/* Animated spinner */}
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400"></div>

                {/* Pulsing background circle */}
                <div className="absolute top-0 left-0 w-16 h-16 rounded-full bg-doan-100 dark:bg-doan-900 opacity-20 animate-ping"></div>
            </div>
        </div>
    );
};

export default AppLoadingScreen;
