import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSearchFiltersReturn {
    // Search state
    searchTerm: string;
    debouncedSearchTerm: string;
    searchInputRef: React.RefObject<HTMLInputElement>;

    // Filter state
    statusFilter: boolean | '';

    // Actions
    setSearchTerm: (term: string) => void;
    setStatusFilter: (filter: boolean | '') => void;
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSearchFocus: () => void;
    handleClearSearch: () => void;
    handleClearAllFilters: () => void;
}

export const useSearchFilters = (
    onFiltersChange?: () => void
): UseSearchFiltersReturn => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<boolean | ''>('');

    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounce search term
    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            onFiltersChange?.();
        }, 300);

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchTerm, onFiltersChange]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    }, []);

    const handleSearchFocus = useCallback(() => {
        // Maintain focus when component re-renders
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        // Keep focus on input after clearing
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 0);
    }, []);

    const handleClearAllFilters = useCallback(() => {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setStatusFilter('');
    }, []);

    return {
        searchTerm,
        debouncedSearchTerm,
        searchInputRef,
        statusFilter,
        setSearchTerm,
        setStatusFilter,
        handleSearchChange,
        handleSearchFocus,
        handleClearSearch,
        handleClearAllFilters,
    };
};
