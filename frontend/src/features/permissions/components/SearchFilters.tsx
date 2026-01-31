import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { UseSearchFiltersReturn } from '../hooks';

interface SearchFiltersProps {
    searchFilters: UseSearchFiltersReturn;
    currentPage: number;
    setCurrentPage: (page: number) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
    searchFilters,
}) => {
    const { t } = useTranslation('permissions');
    const {
        searchTerm,
        debouncedSearchTerm,
        searchInputRef,
        handleSearchChange,
        handleSearchFocus,
        handleClearSearch
    } = searchFilters;

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={t('placeholders.searchPlaceholder')}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={handleSearchFocus}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {/* Clear button */}
                {searchTerm && (
                    <button
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        type="button"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
                {/* Search indicator */}
                {searchTerm !== debouncedSearchTerm && !searchTerm && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-200 dark:border-gray-600 border-t-doan-500 dark:border-t-doan-400"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchFilters;
