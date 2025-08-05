import React from 'react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    total,
    limit,
    onPageChange
}) => {
    const { t } = useTranslation('common');

    if (total <= limit) {
        return null;
    }

    return (
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">            <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('pagination.showing')} {(currentPage - 1) * limit + 1} {t('pagination.to')} {Math.min(currentPage * limit, total)} {t('pagination.of')} {total} {t('pagination.results')}
        </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >                    {t('pagination.previous')}
                </button>
                <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                    {currentPage} / {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('pagination.next')}
                </button>
            </div>
        </div>
    );
};

export default Pagination;
