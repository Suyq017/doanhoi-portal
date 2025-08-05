import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RoleAssignmentItem } from '../../../shared';
import { Organization } from '../../../shared/types/organization';
import { roleService, type Role } from '../../permissions/services/roleService';
import { organizationService } from '../../../shared/services/organizationService';
import { userService } from '../../../shared/services/userService';
import RoleAssignmentManager from './RoleAssignmentManager';

interface UserRoleAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface AssignRoleRequest {
    userId: string;
    roleAssignments: {
        roleId: string;
        organizationId?: string;
        isActive: boolean;
    }[];
}

const UserRoleAssignmentModal: React.FC<UserRoleAssignmentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const { t } = useTranslation(['users', 'common']);

    // Generate unique ID for assignments
    const generateAssignmentId = () => `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const [selectedUserId, setSelectedUserId] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [loadingOrganizations, setLoadingOrganizations] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // UI state for role assignments
    const [roleAssignments, setRoleAssignments] = useState<RoleAssignmentItem[]>([
        {
            id: generateAssignmentId(),
            roleId: '',
            organizationId: '',
            isActive: true,
            isValid: false,
        }
    ]);

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load data when modal opens
    useEffect(() => {
        if (isOpen) {
            loadUsers();
            loadRoles();
            loadOrganizations();
        } else {
            // Reset form when modal closes
            resetForm();
        }
    }, [isOpen]);
    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const response = await userService.getUsers({ limit: 1000 }); // Get all users for selection
            setUsers(response.users);
        } catch (error) {
            console.error('Error loading users:', error);
            setUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    };

    const loadRoles = async () => {
        setLoadingRoles(true);
        try {
            const rolesData = await roleService.getAvailableRoles();
            setRoles(rolesData.filter(role => role.isActive));
        } catch (error) {
            console.error('Error loading roles:', error);
            try {
                const fallbackRoles = await roleService.getRoles();
                setRoles(fallbackRoles.data.filter(role => role.isActive));
            } catch (fallbackError) {
                console.error('Fallback error loading roles:', fallbackError);
                setRoles([]);
            }
        } finally {
            setLoadingRoles(false);
        }
    };

    const loadOrganizations = async () => {
        setLoadingOrganizations(true);
        try {
            const organizationsData = await organizationService.getOrganizations();
            setOrganizations(organizationsData);
        } catch (error) {
            console.error('Error loading organizations:', error);
            setOrganizations([]);
        } finally {
            setLoadingOrganizations(false);
        }
    };

    // Handle role assignments change
    const handleRoleAssignmentsChange = (assignments: RoleAssignmentItem[]) => {
        setRoleAssignments(assignments);
        // Clear errors when assignments change
        if (errors.roleAssignments) {
            setErrors(prev => ({ ...prev, roleAssignments: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!selectedUserId) {
            newErrors.userId = t('users:validation.selectUser');
        }

        // Validate role assignments
        const validAssignments = roleAssignments.filter(a => a.roleId && a.roleId.trim());
        if (validAssignments.length === 0) {
            newErrors.roleAssignments = t('users:validation.atLeastOneRole');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        try {
            // Prepare the role assignment data
            const validAssignments = roleAssignments
                .filter(assignment => assignment.roleId && assignment.roleId.trim())
                .map(assignment => ({
                    roleId: assignment.roleId,
                    organizationId: assignment.organizationId || undefined,
                    isActive: assignment.isActive ?? true,
                }));

            const assignmentData: AssignRoleRequest = {
                userId: selectedUserId,
                roleAssignments: validAssignments,
            };

            // Call API to assign roles
            await userService.assignUserRoles(selectedUserId, assignmentData.roleAssignments);

            // Reset form and close modal
            resetForm();
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error assigning roles:', error);
            setErrors({ submit: t('users:messages.assignRolesError') });
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedUserId('');
        setRoleAssignments([
            {
                id: generateAssignmentId(),
                roleId: '',
                organizationId: '',
                isActive: true,
                isValid: false,
            }
        ]);
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedUserId(e.target.value);
        if (errors.userId) {
            setErrors(prev => ({ ...prev, userId: '' }));
        }
    };

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4"
            style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={handleOverlayClick}
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <UserPlus className="w-6 h-6 text-doan-600" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('users:titles.assignRoles')}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={submitting}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* User Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('users:fields.selectUser')} *
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={handleUserChange}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.userId
                                    ? 'border-red-500 dark:border-red-500'
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}
                            disabled={submitting || loadingUsers}
                        >
                            <option value="">{t('users:placeholders.selectUser')}</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.familyName} {user.givenName} ({user.code}) - {user.email}
                                </option>
                            ))}
                        </select>
                        {loadingUsers && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {t('common:states.loading')}...
                            </p>
                        )}
                        {errors.userId && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {errors.userId}
                            </p>
                        )}
                    </div>

                    {/* Role Assignment Manager */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('users:fields.roleAssignments')} *
                        </label>
                        <RoleAssignmentManager
                            assignments={roleAssignments}
                            onAssignmentsChange={handleRoleAssignmentsChange}
                            roles={roles}
                            organizations={organizations}
                            loading={loadingRoles || loadingOrganizations}
                            disabled={submitting}
                            maxAssignments={10}
                        />
                        {errors.roleAssignments && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.roleAssignments}
                            </p>
                        )}
                    </div>

                    {/* Submit error */}
                    {errors.submit && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {errors.submit}
                            </p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex items-center justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            disabled={submitting}
                        >
                            {t('common:actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !selectedUserId}
                            className="px-4 py-2 bg-doan-600 text-white rounded-md hover:bg-doan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                        >
                            {submitting && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            <span>
                                {submitting
                                    ? t('common:states.assigning')
                                    : t('users:actions.assignRoles')
                                }
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default UserRoleAssignmentModal;
