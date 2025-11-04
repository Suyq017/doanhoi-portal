import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClassQueryParams, CreateClassRequest, UpdateClassRequest } from '../types/class';
import { Class } from '../types/class';
import {
    useClassListQuery,
    useCreateClassMutation,
    useUpdateClassMutation,
    useDeleteClassMutation,
    useBulkDeleteClassesMutation,
    useInvalidateClasses,
} from './queries/useClassQueries';

export interface UseClassListOptions {
    initialLimit?: number;
}

export interface UseClassListReturn {
    // Data
    classes: Class[];
    total: number;
    loading: boolean;
    error: string | null;

    // Pagination
    currentPage: number;
    limit: number;
    totalPages: number;

    // Filters
    searchTerm: string;
    yearFilter: number | '';
    departmentFilter: string;
    statusFilter: boolean | '';

    // Actions
    setSearchTerm: (term: string) => void;
    setYearFilter: (year: number | '') => void;
    setDepartmentFilter: (dept: string) => void;
    setStatusFilter: (status: boolean | '') => void;
    setCurrentPage: (page: number) => void;
    loadClasses: () => Promise<void>;
    refreshClasses: () => Promise<void>;

    // CRUD Operations
    createClass: (classData: CreateClassRequest) => Promise<void>;
    updateClass: (classId: string, classData: UpdateClassRequest) => Promise<void>;
    deleteClass: (classId: string) => Promise<void>;
    bulkDeleteClasses: (classIds: string[]) => Promise<void>;

    // UI States
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
}

export const useClassList = (options: UseClassListOptions = {}): UseClassListReturn => {
    const { initialLimit = 10 } = options;

    // Local state for filters (UI state, not cached)
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(initialLimit);
    const [searchTerm, setSearchTerm] = useState('');
    const [yearFilter, setYearFilter] = useState<number | ''>('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<boolean | ''>('');

    // Build query params from filters
    const queryParams = useMemo<ClassQueryParams>(() => ({
        page: currentPage,
        limit: limit,
        ...(searchTerm && { search: searchTerm }),
        ...(yearFilter && { year: Number(yearFilter) }),
        ...(departmentFilter && { departmentId: departmentFilter }),
        ...(statusFilter !== '' && { isActive: Boolean(statusFilter) }),
    }), [currentPage, limit, searchTerm, yearFilter, departmentFilter, statusFilter]);

    // ===================================
    // REACT QUERY: Replace manual state management
    // ===================================
    const {
        data: queryData,
        isLoading,
        error: queryError,
        refetch,
    } = useClassListQuery(queryParams);

    const createMutation = useCreateClassMutation();
    const updateMutation = useUpdateClassMutation();
    const deleteMutation = useDeleteClassMutation();
    const bulkDeleteMutation = useBulkDeleteClassesMutation();
    const { invalidateLists } = useInvalidateClasses();

    // Extract data from React Query response
    const classes = queryData?.classes ?? [];
    const total = queryData?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Convert React Query states to interface
    const loading = isLoading;
    const error = queryError ? (queryError as Error).message : null;

    // CRUD operations - Wrap mutations to match interface
    const createClass = useCallback(async (classData: CreateClassRequest) => {
        return new Promise<void>((resolve, reject) => {
            createMutation.mutate(classData, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [createMutation]);

    const updateClass = useCallback(async (classId: string, classData: UpdateClassRequest) => {
        return new Promise<void>((resolve, reject) => {
            updateMutation.mutate({ id: classId, data: classData }, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [updateMutation]);

    const deleteClass = useCallback(async (classId: string) => {
        return new Promise<void>((resolve, reject) => {
            deleteMutation.mutate(classId, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [deleteMutation]);

    const bulkDeleteClasses = useCallback(async (classIds: string[]) => {
        return new Promise<void>((resolve, reject) => {
            bulkDeleteMutation.mutate(classIds, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [bulkDeleteMutation]);

    // Manual refresh
    const loadClasses = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const refreshClasses = useCallback(async () => {
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
    }, [yearFilter, departmentFilter, statusFilter]);

    return {
        // Data
        classes,
        total,
        loading,
        error,

        // Pagination
        currentPage,
        limit,
        totalPages,

        // Filters
        searchTerm,
        yearFilter,
        departmentFilter,
        statusFilter,

        // Actions
        setSearchTerm,
        setYearFilter,
        setDepartmentFilter,
        setStatusFilter,
        setCurrentPage,
        loadClasses,
        refreshClasses,

        // CRUD Operations
        createClass,
        updateClass,
        deleteClass,
        bulkDeleteClasses,

        // UI States
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isBulkDeleting: bulkDeleteMutation.isPending,
    };
};
