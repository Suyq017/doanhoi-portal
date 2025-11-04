import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { userService, organizationService } from '../../../shared/services';
import { roleService } from '../../permissions/services/roleService';
import { User as ApiUser } from '../../../shared/types/user';
import { UserOrganization } from '../../../shared/types/organization';

export interface User {
    id: string;
    code: string;
    familyName: string;
    givenName: string;
    email: string;
    phone?: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
}

export interface Organization {
    id: string;
    name: string;
    code: string;
    parentId?: string;
    level: number;
}

export interface RoleAssignment {
    id: string;
    roleIds: string[]; // Changed from roleId to roleIds array
    organizationIds: string[]; // Changed from organizationId to organizationIds array
    isGlobal: boolean;
}

interface UseGrantRolesProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

export const useGrantRoles = ({ onSuccess, onError }: UseGrantRolesProps = {}) => {
    const { t } = useTranslation(['users', 'common']);

    // State management
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
    const [applyToUserOrgs, setApplyToUserOrgs] = useState(false); const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([
        {
            id: Date.now().toString(),
            roleIds: [],
            organizationIds: [],
            isGlobal: false,
        }
    ]);

    // Data loading states
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [loadingOrganizations, setLoadingOrganizations] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Error states
    const [errors, setErrors] = useState<Record<string, string>>({});    // Reset form
    const resetForm = useCallback(() => {
        setSelectedUser(null);
        setUserOrganizations([]);
        setApplyToUserOrgs(false); setRoleAssignments([
            {
                id: Date.now().toString(),
                roleIds: [],
                organizationIds: [],
                isGlobal: false,
            }
        ]);
        setErrors({});
    }, []);

    // Load users
    const loadUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const response = await userService.getUsers({ limit: 1000 });
            setUsers(response.users.map(user => ({
                id: user.id,
                code: user.code,
                familyName: user.familyName,
                givenName: user.givenName,
                email: user.email,
                phone: user.phone
            })));
        } catch (error) {
            console.error('Error loading users:', error);
            setUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    // Load roles
    const loadRoles = useCallback(async () => {
        setLoadingRoles(true);
        try {
            const rolesResponse = await roleService.getRoles();
            const roles = rolesResponse.data || rolesResponse;

            const mappedRoles = roles.map(role => ({
                id: role.id,
                name: role.name,
                description: role.description || ''
            }));

            setRoles(mappedRoles);
        } catch (error) {
            console.error('Error loading roles:', error);
            setRoles([]);
        } finally {
            setLoadingRoles(false);
        }
    }, []);    // Load organizations
    const loadOrganizations = useCallback(async () => {
        setLoadingOrganizations(true);
        try {
            const organizations = await organizationService.getOrganizations();
            setOrganizations(organizations.map(org => ({
                id: org.id,
                name: org.name,
                code: org.code || '',
                parentId: org.parentId,
                level: 0
            })));
        } catch (error) {
            console.error('Error loading organizations:', error);
            setOrganizations([]);
        } finally {
            setLoadingOrganizations(false);
        }
    }, []);// Load user organizations
    const loadUserOrganizations = useCallback(async (userId: string) => {
        try {
            // Get user with organizations relation
            const user: ApiUser = await userService.getUserById(userId);

            // Extract organizations from user data
            const userOrganizations: UserOrganization[] = user.organizations || [];

            setUserOrganizations(userOrganizations
                .filter((userOrg: UserOrganization) => userOrg.organization) // Filter out items without organization
                .map((userOrg: UserOrganization) => ({
                    id: userOrg.organization!.id,
                    name: userOrg.organization!.name,
                    code: userOrg.organization!.code || '',
                    parentId: userOrg.organization!.parentId,
                    level: 0
                })));
        } catch (error) {
            console.error('Error loading user organizations:', error);
            setUserOrganizations([]);
        }
    }, []);

    // Handle user selection
    const handleUserSelect = useCallback((user: User | null) => {
        setSelectedUser(user);
        if (user) {
            loadUserOrganizations(user.id);
        } else {
            setUserOrganizations([]);
            setApplyToUserOrgs(false);
        }
    }, [loadUserOrganizations]);    // Handle apply to user organizations
    const handleApplyToUserOrgs = useCallback((checked: boolean) => {
        setApplyToUserOrgs(checked);
        if (checked && userOrganizations.length > 0) {
            setRoleAssignments(prev =>
                prev.map(assignment => ({
                    ...assignment,
                    organizationIds: userOrganizations.map(org => org.id),
                    isGlobal: false,
                }))
            );
        } else {
            setRoleAssignments(prev =>
                prev.map(assignment => ({
                    ...assignment,
                    organizationIds: [],
                    isGlobal: false,
                }))
            );
        }
    }, [userOrganizations]);    // Role assignment management
    const addRoleAssignment = useCallback(() => {
        const newAssignment: RoleAssignment = {
            id: Date.now().toString(),
            roleIds: [],
            organizationIds: applyToUserOrgs && userOrganizations.length > 0
                ? userOrganizations.map(org => org.id)
                : [],
            isGlobal: false,
        };
        setRoleAssignments(prev => [...prev, newAssignment]);
    }, [applyToUserOrgs, userOrganizations]);

    const removeRoleAssignment = useCallback((id: string) => {
        setRoleAssignments(prev => prev.filter(assignment => assignment.id !== id));
    }, []); const updateRoleAssignment = useCallback((id: string, updates: Partial<RoleAssignment>) => {
        setRoleAssignments(prev => prev.map(assignment =>
            assignment.id === id ? { ...assignment, ...updates } : assignment
        ));
    }, []);

    // Form validation
    const validateForm = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};

        if (!selectedUser) {
            newErrors.user = t('users:grantRoles.noUserSelected');
        } if (roleAssignments.length === 0) {
            newErrors.roles = t('users:grantRoles.noRolesAdded');
        } else {
            const hasValidAssignment = roleAssignments.some(assignment => assignment.roleIds.length > 0);
            if (!hasValidAssignment) {
                newErrors.roles = t('users:grantRoles.noRolesAdded');
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [selectedUser, roleAssignments, t]);    // Submit grant roles
    const submitGrantRoles = useCallback(async (): Promise<boolean> => {
        if (!validateForm() || !selectedUser) return false;

        setSubmitting(true);
        try {
            // Convert role assignments to the new API format
            const formattedAssignments = roleAssignments
                .filter(assignment => assignment.roleIds.length > 0)
                .map(assignment => ({
                    roleIds: assignment.roleIds,
                    organizationIds: assignment.organizationIds,
                    isGlobal: assignment.isGlobal || assignment.organizationIds.length === 0
                }));

            const request = {
                userId: selectedUser.id,
                roleAssignments: formattedAssignments
            };

            console.log('Submitting grant roles request:', request);

            // Use the new grant roles API
            await roleService.grantRoles(request);

            onSuccess?.();
            resetForm();
            return true;
        } catch (error) {
            console.error('Error granting roles:', error);
            const errorMessage = t('users:messages.grantRolesError');
            onError?.(errorMessage);
            return false;
        } finally {
            setSubmitting(false);
        }
    }, [validateForm, selectedUser, roleAssignments, onSuccess, onError, resetForm, t]);

    return {
        // State
        selectedUser,
        userOrganizations,
        applyToUserOrgs,
        roleAssignments,
        users,
        roles,
        organizations,
        errors,

        // Loading states
        loadingUsers,
        loadingRoles,
        loadingOrganizations,
        submitting,

        // Actions
        handleUserSelect,
        handleApplyToUserOrgs,
        addRoleAssignment,
        removeRoleAssignment,
        updateRoleAssignment,
        submitGrantRoles,
        resetForm,
        loadUsers,
        loadRoles,
        loadOrganizations,
    };
};
