import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserQueryParams, CreateUserRequest, UpdateUserRequest } from '../types/user'
import { User } from '../types/user';
import {
    useUserListQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
    useInvalidateUsers,
} from './queries/useUserQueries';

export interface UseUserListOptions {
    initialLimit?: number;
    organizationId?: string;
    autoLoad?: boolean;
}

export interface UseUserListReturn {
    // Data
    users: User[];
    total: number;
    loading: boolean;
    error: string | null;

    // Pagination
    currentPage: number;
    limit: number;
    totalPages: number;

    // Filters
    searchTerm: string;
    filterType: string;
    filterStatus: string;

    // Actions
    setSearchTerm: (term: string) => void;
    setFilterType: (type: string) => void;
    setFilterStatus: (status: string) => void;
    setCurrentPage: (page: number) => void;
    loadUsers: () => Promise<void>;
    refreshUsers: () => Promise<void>;

    // CRUD Operations
    createUser: (userData: CreateUserRequest) => Promise<void>;
    updateUser: (userId: string, userData: UpdateUserRequest) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;

    // UI States
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
}

export const useUserList = (options: UseUserListOptions = {}): UseUserListReturn => {
    const { initialLimit = 10, organizationId } = options;

    // Local state for filters (không cache, chỉ là UI state)
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(initialLimit);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Build query params from filters
    const queryParams = useMemo<UserQueryParams>(() => ({
        page: currentPage,
        limit: limit,
        ...(searchTerm && { search: searchTerm }),
        ...(filterType !== 'all' && { userType: filterType as 'student' | 'staff' }),
        ...(filterStatus !== 'all' && { membershipStatus: filterStatus as any }),
        ...(organizationId && { organizationId }),
    }), [currentPage, limit, searchTerm, filterType, filterStatus, organizationId]);

    // ===================================
    // REACT QUERY: Replace manual state management
    // ===================================
    const {
        data: queryData,
        isLoading,
        error: queryError,
        refetch,
    } = useUserListQuery(queryParams);

    const createMutation = useCreateUserMutation();
    const updateMutation = useUpdateUserMutation();
    const deleteMutation = useDeleteUserMutation();
    const { invalidateLists } = useInvalidateUsers();

    // Extract data from React Query response
    const users = queryData?.users ?? [];
    const total = queryData?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Convert React Query states to old interface
    const loading = isLoading;
    const error = queryError ? (queryError as Error).message : null;

    // CRUD operations - Wrap mutations to match old interface
    const createUser = useCallback(async (userData: CreateUserRequest) => {
        return new Promise<void>((resolve, reject) => {
            createMutation.mutate(userData, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [createMutation]);

    const updateUser = useCallback(async (userId: string, userData: UpdateUserRequest) => {
        return new Promise<void>((resolve, reject) => {
            updateMutation.mutate({ id: userId, data: userData }, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [updateMutation]);

    const deleteUser = useCallback(async (userId: string) => {
        return new Promise<void>((resolve, reject) => {
            deleteMutation.mutate(userId, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
            });
        });
    }, [deleteMutation]);

    // Manual refresh - Trigger refetch
    const loadUsers = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const refreshUsers = useCallback(async () => {
        invalidateLists();
    }, [invalidateLists]);

    // Reset to first page when search term changes (debounced)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setCurrentPage(1);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterType, filterStatus]);
    return {
        // Data
        users,
        total,
        loading,
        error,

        // Pagination
        currentPage,
        limit,
        totalPages,

        // Filters
        searchTerm,
        filterType,
        filterStatus,

        // Actions
        setSearchTerm,
        setFilterType,
        setFilterStatus,
        setCurrentPage,
        loadUsers,
        refreshUsers,

        // CRUD Operations
        createUser,
        updateUser,
        deleteUser,

        // UI States
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}