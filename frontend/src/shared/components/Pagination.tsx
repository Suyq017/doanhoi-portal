import React from 'react';
import { useTranslation } from 'react-i18next';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    showLimitSelector?: boolean;
    limitOptions?: number[];
    className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    total,
    limit,
    onPageChange,
    onLimitChange,
    showLimitSelector = false,
    limitOptions = [5, 10, 20, 50],
    className = '',
}) => {
    const { t } = useTranslation('common');
    
    // Always show if showLimitSelector is enabled, even with total = 0
    // This allows users to change limit when there's no data on current page
    if (total === 0 && !showLimitSelector) {
        return null;
    }

    return (
        <div className={`flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 lg:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 gap-4 lg:gap-0 ${className}`}>
            <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-2 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">
                {showLimitSelector && onLimitChange && (
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t('pagination.show')}</span>
                        <select
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-doan-500 focus:border-doan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            {limitOptions.map(option => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t('pagination.perPage')}</span>
                    </div>
                )}
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {total > 0 
                        ? `${t('pagination.showing')} ${(currentPage - 1) * limit + 1} - ${Math.min(currentPage * limit, total)} ${t('pagination.of')} ${total} ${t('pagination.items')}`
                        : `${t('pagination.showing')} 0 ${t('pagination.items')}`
                    }
                </div>
            </div>

            {/* Desktop Pagination */}
            {totalPages > 1 && (
                <div className="hidden lg:flex items-center space-x-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                >
                    {t('pagination.previous')}
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page and pages around current page
                    if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                        return (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`px-3 py-1 text-sm border rounded ${
                                    page === currentPage
                                        ? 'bg-doan-500 text-white border-doan-500'
                                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                }`}
                            >
                                {page}
                            </button>
                        );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                            <span key={page} className="px-2 text-gray-500">
                                ...
                            </span>
                        );
                    }
                    return null;
                })}
                
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                >
                    {t('pagination.next')}
                </button>
                </div>
            )}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
                <div className="lg:hidden w-full">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                    >
                        {t('pagination.previous')}
                    </button>
                    
                    <div className="flex items-center space-x-1">
                        {/* Show simplified pagination for mobile */}
                        {currentPage > 2 && (
                            <>
                                <button
                                    onClick={() => onPageChange(1)}
                                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    1
                                </button>
                                {currentPage > 3 && <span className="text-gray-500">...</span>}
                            </>
                        )}
                        
                        {currentPage > 1 && (
                            <button
                                onClick={() => onPageChange(currentPage - 1)}
                                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {currentPage - 1}
                            </button>
                        )}
                        
                        <button className="px-2 py-1 text-sm border rounded bg-doan-500 text-white border-doan-500">
                            {currentPage}
                        </button>
                        
                        {currentPage < totalPages && (
                            <button
                                onClick={() => onPageChange(currentPage + 1)}
                                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {currentPage + 1}
                            </button>
                        )}
                        
                        {currentPage < totalPages - 1 && (
                            <>
                                {currentPage < totalPages - 2 && <span className="text-gray-500">...</span>}
                                <button
                                    onClick={() => onPageChange(totalPages)}
                                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}
                    </div>
                    
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                    >
                        {t('pagination.next')}
                    </button>
                </div>
                
                {/* Mobile page info */}
                <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                    {t('pagination.page', { current: currentPage, total: totalPages })}
                </div>
                </div>
            )}
        </div>
    );
};

export default Pagination;