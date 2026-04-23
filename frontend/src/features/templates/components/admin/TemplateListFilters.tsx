import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown } from 'lucide-react';
import type { StatusOption } from '../../types';

interface TemplateListFiltersProps {
    searchInput: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    statusOptions: StatusOption[];
    onStatusChange: (value: string) => void;
    statusDropdownOpen: boolean;
    onStatusDropdownOpenChange: (open: boolean) => void;
    statusDropdownRef: React.RefObject<HTMLDivElement>;
}

export const TemplateListFilters: React.FC<TemplateListFiltersProps> = ({
    searchInput,
    onSearchChange,
    statusFilter,
    statusOptions,
    onStatusChange,
    statusDropdownOpen,
    onStatusDropdownOpenChange,
    statusDropdownRef,
}) => {
    const { t } = useTranslation(['templates']);

    const getStatusLabel = (value: string) => {
        return statusOptions.find((opt) => opt.value === value)?.label || value;
    };

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {/* Search */}
                <div className="relative md:col-span-3">
                    <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                    <input
                        type="text"
                        placeholder={t('templates:placeholders.search')}
                        value={searchInput}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                </div>

                {/* Status Filter */}
                <div className="relative" ref={statusDropdownRef}>
                    <button
                        type="button"
                        onClick={() => onStatusDropdownOpenChange(!statusDropdownOpen)}
                        className="w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-2 focus:ring-doan-500 focus:border-transparent transition-colors text-sm flex items-center justify-between"
                    >
                        <span>{getStatusLabel(statusFilter)}</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {statusDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg dark:bg-gray-700 dark:border-gray-600">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => onStatusChange(option.value)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none ${statusFilter === option.value
                                            ? 'bg-doan-50 text-doan-700 dark:bg-doan-900 dark:text-doan-300 font-medium'
                                            : 'text-gray-900 dark:text-white'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Empty columns for grid layout */}
                <div></div>
                <div></div>
            </div>
        </div>
    );
};

export default TemplateListFilters;
