import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { roleService, type Role } from '../services/roleService';

export interface UseRoleListParams {
    searchTerm: string;
    statusFilter: boolean | '';
    page: number;
    limit: number;
}

export interface UseRoleListReturn {
    // Data state
    roles: Role[];
    total: number;
    totalPages: number;
    loading: boolean;
    error: string | null;

    // Actions
    loadRoles: () => Promise<void>;
    refreshRoles: () => Promise<void>;
    createRole: (roleData: any) => Promise<void>;
    updateRole: (roleId: string, roleData: any) => Promise<void>;
    deleteRole: (roleId: string) => Promise<void>;
    bulkDeleteRoles: (roleIds: string[]) => Promise<any>;
    seedDefaults: () => Promise<void>;
}

export const useRoleList = ({
    searchTerm,
    statusFilter,
    page,
    limit
}: UseRoleListParams): UseRoleListReturn => {
    const { t } = useTranslation('permissions');
    const [roles, setRoles] = useState<Role[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadRoles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let params: any = {
                page,
                limit,
            };

            // Only add search if it has value
            if (searchTerm && searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            // Only add isActive if it's a boolean (not empty string)
            if (statusFilter !== '') {
                params.isActive = statusFilter;
            }

            let response;
            try {
                response = await roleService.getRoles(params);
            } catch (err: any) {                // If error with isActive filter, try without it
                if (err.message.includes('400') && statusFilter !== '') {
                    const { isActive, ...paramsWithoutFilter } = params;
                    response = await roleService.getRoles(paramsWithoutFilter);

                    // Apply frontend filtering if backend doesn't support it
                    if (response && response.data) {
                        response.data = response.data.filter(role => role.isActive === statusFilter);
                        response.total = response.data.length;
                        response.totalPages = Math.ceil(response.data.length / params.limit);
                    }
                } else {
                    throw err;
                }
            }

            if (response && response.data) {
                setRoles(response.data);
                setTotal(response.total || 0);
                setTotalPages(response.totalPages || 1);
            } else {
                setRoles([]);
                setTotal(0);
                setTotalPages(1);
            }
        } catch (err: any) {
            // Error loading roles
            const errorMessage = err?.message || t('messages.loadRolesError');
            setError(`${errorMessage}. ${t('messages.tryAgain')}.`);
            setRoles([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [page, limit, searchTerm, statusFilter]);

    const refreshRoles = useCallback(async () => {
        await loadRoles();
    }, [loadRoles]);

    const createRole = useCallback(async (roleData: any) => {
        await roleService.createRole(roleData);
        await loadRoles();
    }, [loadRoles]);

    const updateRole = useCallback(async (roleId: string, roleData: any) => {
        await roleService.updateRole(roleId, roleData);
        await loadRoles();
    }, [loadRoles]);

    const deleteRole = useCallback(async (roleId: string) => {
        await roleService.deleteRole(roleId);
        await loadRoles();
    }, [loadRoles]);

    const bulkDeleteRoles = useCallback(async (roleIds: string[]) => {
        const result = await roleService.bulkDeleteRoles(roleIds);
        await loadRoles();
        return result;
    }, [loadRoles]);

    const seedDefaults = useCallback(async () => {
        await roleService.seedDefaults();
        await loadRoles();
    }, [loadRoles]);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    return {
        roles,
        total,
        totalPages,
        loading,
        error,
        loadRoles,
        refreshRoles,
        createRole,
        updateRole,
        deleteRole,
        bulkDeleteRoles,
        seedDefaults,
    };
};
