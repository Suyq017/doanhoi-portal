import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllTemplates, deleteTemplate } from '@/shared/services/template.service';
import { useToast } from '@/shared/hooks/useToast';
import { usePermissions } from '@/shared/hooks/usePermissions';
import type { UseTemplateListPageReturn, StatusOption, TemplateListFilters } from '../types';

export function useTemplateListPage(): UseTemplateListPageReturn {
    const { t } = useTranslation(['templates', 'common']);
    const location = useLocation();
    const queryClient = useQueryClient();
    const { toasts, confirmDialog, showSuccess, showError, showConfirm, hideToast } = useToast();
    const { canManageTemplates } = usePermissions();

    // Filter states
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchInput, setSearchInput] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

    const toastShownRef = useRef(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setCurrentPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchInput]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setStatusDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Show toast from navigation state
    useEffect(() => {
        const state = location.state as { showSuccessToast?: boolean; message?: string; successMessage?: string };
        if (state && !toastShownRef.current) {
            if (state.showSuccessToast && state.message) {
                toastShownRef.current = true;
                showSuccess(state.message);
                window.history.replaceState({}, document.title);
            } else if (state.successMessage) {
                toastShownRef.current = true;
                showSuccess(state.successMessage);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, showSuccess]);

    // Status options
    const statusOptions: StatusOption[] = [
        { value: 'all', label: t('templates:filter.all') },
        { value: 'active', label: t('templates:filter.active') },
        { value: 'inactive', label: t('templates:filter.inactive') },
        { value: 'processing', label: t('templates:filter.processing') },
        { value: 'error', label: t('templates:filter.error') },
    ];

    // Query
    const { data, isLoading, error } = useQuery({
        queryKey: ['templates', statusFilter, debouncedSearch, currentPage, limit],
        queryFn: () => getAllTemplates({
            status: statusFilter === 'all' ? undefined : statusFilter,
            search: debouncedSearch || undefined,
            page: currentPage,
            limit,
        }),
        placeholderData: (previousData) => previousData,
        staleTime: 5 * 60 * 1000,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            queryClient.invalidateQueries({ queryKey: ['templates-active'] });
            showSuccess(t('templates:messages.deleteSuccess'));
        },
        onError: (err: any) => {
            const errorMessage = err?.response?.data?.message;
            if (errorMessage === 'TEMPLATE_HAS_SUBMISSIONS') {
                showError(t('templates:errors.templateHasSubmissions'));
            } else {
                showError(errorMessage || t('templates:messages.deleteError'));
            }
        },
    });

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await showConfirm(
            t('templates:actions.delete'),
            t('templates:messages.deleteConfirm', { name })
        );
        if (confirmed) {
            deleteMutation.mutate(id);
        }
    };

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        setStatusDropdownOpen(false);
        setCurrentPage(1);
    };

    const filters: TemplateListFilters = {
        statusFilter,
        searchInput,
        debouncedSearch,
        currentPage,
        limit,
    };

    return {
        // Data
        templates: data?.data || [],
        total: data?.total || 0,
        totalPages: data?.totalPages || 0,
        isLoading,
        error: error as Error | null,

        // Filters
        filters,
        statusOptions,

        // Actions
        setSearchInput,
        setStatusFilter: handleStatusFilterChange,
        setCurrentPage,
        setLimit: (newLimit: number) => {
            setLimit(newLimit);
            setCurrentPage(1);
        },
        handleDelete,

        // UI State
        statusDropdownOpen,
        setStatusDropdownOpen,

        // Permissions
        permissions: {
            canManageTemplates: canManageTemplates(),
        },

        // Toast & Dialog
        toasts,
        hideToast,
        confirmDialog,
    };
}
