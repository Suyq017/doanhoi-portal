/**
 * Unified Loading Components
 * 
 * A single source of truth for all loading states in the application.
 * Use these components instead of creating feature-specific loading components.
 */

import React from 'react';

// ========================================
// TYPES
// ========================================

export interface LoadingSpinnerProps {
    /** Size of the spinner */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Color variant */
    variant?: 'primary' | 'white' | 'gray';
    /** Additional CSS classes */
    className?: string;
}

export interface LoadingStateProps {
    /** Loading message to display */
    message?: string;
    /** Size of the spinner */
    size?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    className?: string;
}

export interface FullPageLoadingProps {
    /** Loading message to display */
    message?: string;
    /** Whether to show logo */
    showLogo?: boolean;
}

export interface CardLoadingProps {
    /** Loading message to display */
    message?: string;
    /** Height of the card */
    height?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    className?: string;
}

// ========================================
// SPINNER COMPONENT
// ========================================

const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
};

const variantClasses = {
    primary: 'border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400',
    white: 'border-gray-200/30 border-t-white',
    gray: 'border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-400',
};

/**
 * LoadingSpinner - Base spinner component
 * 
 * @example
 * // Basic usage
 * <LoadingSpinner />
 * 
 * // With size and color
 * <LoadingSpinner size="lg" variant="white" />
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    variant = 'primary',
    className = '',
}) => {
    return (
        <div
            className={`
        inline-block animate-spin rounded-full border-4
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
            role="status"
            aria-label="Loading"
        />
    );
};

// ========================================
// LOADING STATE COMPONENT
// ========================================

/**
 * LoadingState - Inline loading state with optional message
 * 
 * @example
 * // Basic usage
 * <LoadingState />
 * 
 * // With message
 * <LoadingState message="Đang tải dữ liệu..." />
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
    message,
    size = 'md',
    className = '',
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
            <LoadingSpinner size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'} />
            {message && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{message}</p>
            )}
        </div>
    );
};

// ========================================
// FULL PAGE LOADING COMPONENT
// ========================================

/**
 * FullPageLoading - Full screen loading overlay
 * Use for initial page load or route transitions
 * 
 * @example
 * // Basic usage
 * <FullPageLoading />
 * 
 * // With message
 * <FullPageLoading message="Đang kiểm tra quyền truy cập..." />
 */
export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
    message,
    showLogo = false,
}) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                {showLogo && (
                    <div className="relative mb-8">
                        {/* Animated background circle */}
                        <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900 opacity-20 animate-ping" />
                        <LoadingSpinner size="xl" />
                    </div>
                )}
                {!showLogo && <LoadingSpinner size="lg" />}
                {message && (
                    <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
                )}
            </div>
        </div>
    );
};

// ========================================
// CARD LOADING COMPONENT
// ========================================

const heightClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'min-h-[400px]',
};

/**
 * CardLoading - Loading state inside a card/container
 * 
 * @example
 * // Basic usage
 * <CardLoading />
 * 
 * // With custom height
 * <CardLoading height="lg" message="Đang tải..." />
 */
export const CardLoading: React.FC<CardLoadingProps> = ({
    message,
    height = 'md',
    className = '',
}) => {
    return (
        <div
            className={`
        bg-white dark:bg-gray-800 shadow-sm rounded-lg
        flex items-center justify-center
        ${heightClasses[height]}
        ${className}
      `}
        >
            <div className="text-center">
                <LoadingSpinner size="md" />
                {message && (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{message}</p>
                )}
            </div>
        </div>
    );
};

// ========================================
// CONTAINER LOADING COMPONENT
// ========================================

/**
 * ContainerLoading - Loading state for a content container
 * 
 * @example
 * <ContainerLoading message="Đang tải danh sách..." />
 */
export const ContainerLoading: React.FC<LoadingStateProps> = ({
    message,
    className = '',
}) => {
    return (
        <div className={`container mx-auto px-4 py-6 ${className}`}>
            <LoadingState message={message} size="lg" />
        </div>
    );
};

// ========================================
// BUTTON LOADING COMPONENT
// ========================================

export interface ButtonLoadingProps {
    /** Text to show while loading */
    text?: string;
    /** Size of spinner */
    size?: 'sm' | 'md';
}

/**
 * ButtonLoading - Loading indicator for buttons
 * 
 * @example
 * <button disabled={isLoading}>
 *   {isLoading ? <ButtonLoading text="Đang lưu..." /> : 'Lưu'}
 * </button>
 */
export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
    text = 'Đang xử lý...',
    size = 'sm',
}) => {
    return (
        <span className="inline-flex items-center">
            <LoadingSpinner size={size === 'sm' ? 'xs' : 'sm'} variant="white" className="mr-2" />
            {text}
        </span>
    );
};

// ========================================
// TABLE LOADING COMPONENT
// ========================================

export interface TableLoadingProps {
    /** Number of rows to show */
    rows?: number;
    /** Number of columns */
    columns?: number;
}

/**
 * TableLoading - Skeleton loading for tables
 * 
 * @example
 * <TableLoading rows={5} columns={4} />
 */
export const TableLoading: React.FC<TableLoadingProps> = ({
    rows = 5,
    columns = 4,
}) => {
    return (
        <div className="animate-pulse">
            {/* Header */}
            <div className="flex bg-gray-100 dark:bg-gray-700 p-3 rounded-t-lg">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded mx-2" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={rowIndex}
                    className="flex p-3 border-b border-gray-200 dark:border-gray-700"
                >
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div
                            key={colIndex}
                            className="flex-1 h-4 bg-gray-200 dark:bg-gray-600 rounded mx-2"
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

// ========================================
// DEFAULT EXPORTS
// ========================================

export default {
    LoadingSpinner,
    LoadingState,
    FullPageLoading,
    CardLoading,
    ContainerLoading,
    ButtonLoading,
    TableLoading,
};
