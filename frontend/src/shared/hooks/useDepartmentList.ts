import { useState, useEffect, useCallback, useMemo } from 'react';
import { DepartmentQueryParams, CreateDepartmentRequest, UpdateDepartmentRequest } from '../types/department';
import { Department } from '../types/department';
import {
    useDepartmentListQuery,
    useCreateDepartmentMutation,
    useUpdateDepartmentMutation,
    useDeleteDepartmentMutation,
    useBulkDeleteDepartmentsMutation,
    useInvalidateDepartments,
} from './queries/useDepartmentQueries';

export interface UseDepartmentListOptions {
    initialLimit?: number;
}

export interface UseDepartmentListReturn {
    // Data
    departments: Department[];
    total: number;
    loading: boolean;
    error: string | null;

    // Pagination
    currentPage: number;
    limit: number;
    totalPages: number;

    // Filters
    searchTerm: string;
    filterStatus: string;

    // Actions
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    setFilterStatus: React.Dispatch<React.SetStateAction<string>>;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    loadDepartments: () => Promise<void>;
    refreshDepartments: () => Promise<void>;

    // CRUD Operations
    createDepartment: (departmentData: CreateDepartmentRequest) => Promise<void>;
    updateDepartment: (departmentId: string, departmentData: UpdateDepartmentRequest) => Promise<void>;
    deleteDepartment: (departmentId: string) => Promise<void>;
    bulkDeleteDepartments: (departmentIds: string[]) => Promise<void>;

    // UI States
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
}

export const useDepartmentList = (options: UseDepartmentListOptions = {}): UseDepartmentListReturn => {
    const { initialLimit = 10 } = options;

    // Local state for filters (UI state, not cached)
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(initialLimit);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Build query params from filters
    const queryParams = useMemo<DepartmentQueryParams>(() => ({
        page: currentPage,
        limit: limit,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== 'all' && { isActive: filterStatus === 'true' }),
    }), [currentPage, limit, searchTerm, filterStatus]);

    // ===================================
    // REACT QUERY: Replace manual state management
    // ===================================
    const {
        data: queryData,
        isLoading,
        error: queryError,
        refetch,
    } = useDepartmentListQuery(queryParams);

    const createMutation = useCreateDepartmentMutation();
    const updateMutation = useUpdateDepartmentMutation();
    const deleteMutation = useDeleteDepartmentMutation();
    const bulkDeleteMutation = useBulkDeleteDepartmentsMutation();
    const { invalidateLists } = useInvalidateDepartments();

    // Extract data from React Query response
    const departments = queryData?.departments ?? [];
    const total = queryData?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Convert React Query states to interface
    const loading = isLoading;
    const error = queryError ? (queryError as Error).message : null;

    // CRUD operations - Wrap mutations to match interface
    const createDepartment = useCallback(async (departmentData: CreateDepartmentRequest) => {
        return new Promise<void>((resolve, reject) => {
            createMutation.mutate(departmentData, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [createMutation]);

    const updateDepartment = useCallback(async (departmentId: string, departmentData: UpdateDepartmentRequest) => {
        return new Promise<void>((resolve, reject) => {
            updateMutation.mutate({ id: departmentId, data: departmentData }, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [updateMutation]);

    const deleteDepartment = useCallback(async (departmentId: string) => {
        return new Promise<void>((resolve, reject) => {
            deleteMutation.mutate(departmentId, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [deleteMutation]);

    const bulkDeleteDepartments = useCallback(async (departmentIds: string[]) => {
        return new Promise<void>((resolve, reject) => {
            bulkDeleteMutation.mutate(departmentIds, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [bulkDeleteMutation]);

    // Manual refresh
    const loadDepartments = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const refreshDepartments = useCallback(async () => {
        invalidateLists();
    }, [invalidateLists]);

    // Reset to page 1 when search term changes (debounced)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setCurrentPage(1);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus]);

    return {
        // Data
        departments,
        total,
        loading,
        error,

        // Pagination
        currentPage,
        limit,
        totalPages,

        // Filters
        searchTerm,
        filterStatus,

        // Actions
        setSearchTerm,
        setFilterStatus,
        setCurrentPage,
        loadDepartments,
        refreshDepartments,

        // CRUD Operations
        createDepartment,
        updateDepartment,
        deleteDepartment,
        bulkDeleteDepartments,

        // UI States
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isBulkDeleting: bulkDeleteMutation.isPending,
    };
};
