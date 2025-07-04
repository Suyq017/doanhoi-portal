import React from 'react';
import { Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Select, { SelectOption } from '../Select';

export interface UserTableFiltersProps {
    searchTerm: string;
    filterType: string;
    filterStatus: string;
    onSearchChange: (term: string) => void;
    onTypeChange: (type: string) => void;
    onStatusChange: (status: string) => void;
    showAdvancedFilters?: boolean;
}

export const UserTableFilters: React.FC<UserTableFiltersProps> = ({
    searchTerm,
    filterType,
    filterStatus,
    onSearchChange,
    onTypeChange,
    onStatusChange,
    showAdvancedFilters = true,
}) => {
    const { t } = useTranslation(['users', 'common']);

    const userTypeOptions: SelectOption[] = [
        { value: 'all', label: t('users:types.all') },
        { value: 'student', label: t('users:types.student') },
        { value: 'staff', label: t('users:types.staff') },
    ];

    const membershipStatusOptions: SelectOption[] = [
        { value: 'all', label: t('users:membershipStatus.all') },
        { value: 'doan_vien', label: t('users:membershipStatus.doan_vien') },
        { value: 'hoi_vien', label: t('users:membershipStatus.hoi_vien') },
        { value: 'both', label: t('users:membershipStatus.both') },
        { value: 'none', label: t('users:membershipStatus.none') },
    ];

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <div className={`grid grid-cols-1 gap-4 ${showAdvancedFilters ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
                {/* Search */}
                <div className="relative">
                    <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                    <input
                        type="text"
                        placeholder={t('users:placeholders.search')}
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                </div>

                {showAdvancedFilters && (
                    <>
                        {/* User Type Filter */}
                        <div>
                            <Select
                                options={userTypeOptions}
                                value={filterType}
                                onChange={onTypeChange}
                                className="w-full"
                            />
                        </div>

                        {/* Membership Status Filter */}
                        <div>
                            <Select
                                options={membershipStatusOptions}
                                value={filterStatus}
                                onChange={onStatusChange}
                                className="w-full"
                            />
                        </div>
                    </>
                )}

                {/* Filter Button - Optional, can be removed if not needed */}
                <div>
                    <button className="flex items-center justify-center w-full px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                        <Filter className="w-5 h-5 mr-2" />
                        {t('common:actions.filter')}
                    </button>
                </div>
            </div>
        </div>
    );
};