/**
 * DepartmentFilters - Filter controls for department list
 */

import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select, SelectOption } from '../../../shared';

export interface DepartmentFiltersProps {
  searchTerm: string;
  filterStatus: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export const DepartmentFilters: React.FC<DepartmentFiltersProps> = ({
  searchTerm,
  filterStatus,
  onSearchChange,
  onStatusChange,
}) => {
  const { t } = useTranslation(['departments', 'common']);

  const statusOptions: SelectOption[] = [
    { value: 'all', label: t('common:status.all') },
    { value: 'true', label: t('common:status.active') },
    { value: 'false', label: t('common:status.inactive') },
  ];

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            placeholder={t('departments:placeholders.search')}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Status Filter */}
        <div>
          <Select
            options={statusOptions}
            value={filterStatus}
            onChange={onStatusChange}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default DepartmentFilters;
