import React from 'react';

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
    if (total === 0) {
        return null;
    }

    return (
        <div className={`flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`}>
            <div className="flex items-center space-x-4">
                {showLimitSelector && onLimitChange && (
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Hiển thị</span>
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
                        <span className="text-sm text-gray-700 dark:text-gray-300">mục/trang</span>
                    </div>
                )}
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Hiển thị {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} trong tổng số {total} mục
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                >
                    Trước
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
                    Sau
                </button>
            </div>
        </div>
    );
};

export default Pagination;