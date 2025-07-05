import { useState, useEffect, useCallback } from 'react';
import { organizationService } from '../../../shared/services/organizationService';
import { User, UserQueryParams } from '../../../shared/types/user';

export interface UseOrganizationUserListReturn {
    users: User[];
    total: number;
    loading: boolean;
    error: string | null;
    currentPage: number;
    limit: number;
    totalPages: number;
    searchTerm: string;
    filterType: string;
    filterStatus: string;
    setSearchTerm: (term: string) => void;
    setFilterType: (type: string) => void;
    setFilterStatus: (status: string) => void;
    setCurrentPage: (page: number) => void;
    refreshUsers: () => Promise<void>;
}

export const useOrganizationUserList = (organizationId?: string): UseOrganizationUserListReturn => {
    // States
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const totalPages = Math.ceil(total / limit);

    const loadUsers = useCallback(async () => {
        if (!organizationId) return;

        try {
            setLoading(true);
            setError(null);

            // ✅ Sử dụng organization API để lấy members
            const userOrganizations = await organizationService.getOrganizationMembers(organizationId);

            // ✅ Transform UserOrganization[] thành User[]
            const transformedUsers: User[] = userOrganizations.map(userOrg => ({
                id: userOrg.user.id,
                code: userOrg.user.code,
                familyName: userOrg.user.familyName,
                givenName: userOrg.user.givenName,
                email: userOrg.user.email,
                phone: userOrg.user.phone,
                userType: userOrg.user.userType,
                membershipStatus: userOrg.user.membershipStatus,
                createdAt: userOrg.user.createdAt,
                updatedAt: userOrg.user.updatedAt,
                // Additional org context info
                organizationRole: userOrg.role,
                joinedAt: userOrg.joinedAt,
            }));

            // ✅ Apply client-side filtering and pagination
            let filteredUsers = transformedUsers;

            // Search filter
            if (searchTerm) {
                filteredUsers = filteredUsers.filter(user =>
                    user.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.familyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.givenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.email.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Type filter
            if (filterType !== 'all') {
                filteredUsers = filteredUsers.filter(user => user.userType === filterType);
            }

            // Status filter
            if (filterStatus !== 'all') {
                filteredUsers = filteredUsers.filter(user => user.membershipStatus === filterStatus);
            }

            // Pagination
            const startIndex = (currentPage - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

            setUsers(paginatedUsers);
            setTotal(filteredUsers.length);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error loading organization members';
            setError(errorMessage);
            console.error('Error loading organization members:', err);
        } finally {
            setLoading(false);
        }
    }, [organizationId, currentPage, limit, searchTerm, filterType, filterStatus]);

    const refreshUsers = useCallback(() => {
        return loadUsers();
    }, [loadUsers]);

    // Effects
    useEffect(() => {
        if (organizationId) {
            loadUsers();
        }
    }, [loadUsers, organizationId]);

    // Reset to first page when search term changes
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
        users,
        total,
        loading,
        error,
        currentPage,
        limit,
        totalPages,
        searchTerm,
        filterType,
        filterStatus,
        setSearchTerm,
        setFilterType,
        setFilterStatus,
        setCurrentPage,
        refreshUsers,
    };
};