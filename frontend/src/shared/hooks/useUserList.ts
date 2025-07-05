import { useState, useEffect, useCallback } from 'react';
import { userService } from '../services';
import { UserQueryParams, CreateUserRequest, UpdateUserRequest } from '../types/user'
import { User } from '../types/user';
import { useTranslation } from 'react-i18next';

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
    const { initialLimit = 10, organizationId, autoLoad = true } = options;
    const { t } = useTranslation(['users', 'common']);

    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(initialLimit);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const totalPages = Math.ceil(total / limit);

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params: UserQueryParams = {
                page: currentPage,
                limit: limit,
                ...(searchTerm && { search: searchTerm }),
                ...(filterType !== 'all' && { userType: filterType as 'student' | 'staff' }),
                ...(filterStatus !== 'all' && { membershipStatus: filterStatus as any }),
                ...(organizationId && { organizationId }), // Filter by organization if provided
            };

            const response = await userService.getUsers(params);
            setUsers(response.users);
            setTotal(response.total);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('common:messages.error.load');
            setError(errorMessage);
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, searchTerm, filterType, filterStatus, organizationId, t])

    const refreshUsers = useCallback(() => {
        return loadUsers();
    }, [loadUsers]); const createUser = useCallback(async (userData: CreateUserRequest) => {
        try {
            setIsCreating(true);
            await userService.createUser(userData);
            await refreshUsers();
        } catch (error) {
            console.error('Error creating user:', error);
            throw error; // Re-throw to let UI handle the error
        } finally {
            setIsCreating(false);
        }
    }, [refreshUsers, t]); const updateUser = useCallback(async (userId: string, userData: UpdateUserRequest) => {
        try {
            setIsUpdating(true);
            await userService.updateUser(userId, userData);
            await refreshUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        } finally {
            setIsUpdating(false);
        }
    }, [refreshUsers, t]);

    const deleteUser = useCallback(async (userId: string) => {
        try {
            setIsDeleting(true);
            await userService.deleteUser(userId);
            await refreshUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        } finally {
            setIsDeleting(false);
        }
    }, [refreshUsers, t]);

    // Load users when page changes  
    useEffect(() => {
        if (autoLoad) {
            loadUsers();
        }
    }, [currentPage, autoLoad, loadUsers]);

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
        isCreating,
        isUpdating,
        isDeleting,
    };
}