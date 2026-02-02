/**
 * DepartmentPagination - Pagination component for department list
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

export interface DepartmentPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const DepartmentPagination: React.FC<DepartmentPaginationProps> = ({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
}) => {
  const { t } = useTranslation(['common']);

  if (total <= limit) return null;

  return (
    <div className="flex items-center justify-between px-6 py-3 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {t('common:pagination.showing', {
          start: (currentPage - 1) * limit + 1,
          end: Math.min(currentPage * limit, total),
          total: total,
        })}
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common:pagination.previous')}
        </button>
        <span className="px-3 py-1 text-sm">
          {t('common:pagination.page', {
            current: currentPage,
            total: totalPages,
          })}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common:pagination.next')}
        </button>
      </div>
    </div>
  );
};

export default DepartmentPagination;
