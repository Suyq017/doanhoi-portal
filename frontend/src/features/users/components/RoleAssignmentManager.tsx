import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RoleAssignmentItem } from '../../../shared/types/user';
import { Organization } from '../../../shared/types/organization';
import { Role } from '../../permissions/services/roleService';
import RoleAssignmentItemComponent from './RoleAssignmentItem';

interface RoleAssignmentManagerProps {
    assignments: RoleAssignmentItem[];
    onAssignmentsChange: (assignments: RoleAssignmentItem[]) => void;
    roles: Role[];
    organizations: Organization[];
    loading?: boolean;
    disabled?: boolean;
    maxAssignments?: number;
}

const RoleAssignmentManager: React.FC<RoleAssignmentManagerProps> = ({
    assignments,
    onAssignmentsChange,
    roles,
    organizations,
    loading = false,
    disabled = false,
    maxAssignments = 10,
}) => {
    const { t } = useTranslation(['users', 'common']);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Generate unique ID for new assignments
    const generateAssignmentId = () => `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add new assignment
    const handleAddAssignment = useCallback(() => {
        if (assignments.length >= maxAssignments) {
            return;
        }

        const newAssignment: RoleAssignmentItem = {
            id: generateAssignmentId(),
            roleId: '',
            organizationId: '',
            isActive: true,
            isValid: false,
        };

        onAssignmentsChange([...assignments, newAssignment]);
    }, [assignments, maxAssignments, onAssignmentsChange]);

    // Remove assignment
    const handleRemoveAssignment = useCallback((id: string) => {
        const updatedAssignments = assignments.filter(assignment => assignment.id !== id);
        onAssignmentsChange(updatedAssignments);

        // Clear validation errors when removing assignments
        setValidationErrors([]);
    }, [assignments, onAssignmentsChange]);

    // Update assignment field
    const handleUpdateAssignment = useCallback((id: string, field: keyof RoleAssignmentItem, value: string) => {
        const updatedAssignments = assignments.map(assignment => {
            if (assignment.id === id) {
                const updated = { ...assignment, [field]: value };

                // Clear field-specific errors
                if (updated.error && updated.error.includes(field)) {
                    updated.error = '';
                }

                // Update validation status
                updated.isValid = !!(updated.roleId && updated.roleId.trim());

                return updated;
            }
            return assignment;
        });

        onAssignmentsChange(updatedAssignments);

        // Revalidate on change
        validateAssignments(updatedAssignments);
    }, [assignments, onAssignmentsChange]);

    // Validate assignments for duplicates and completeness
    const validateAssignments = useCallback((assignmentsToValidate: RoleAssignmentItem[]) => {
        const errors: string[] = [];
        const seen = new Set<string>();

        assignmentsToValidate.forEach((assignment, index) => {
            // Check for required fields
            if (!assignment.roleId || assignment.roleId.trim() === '') {
                errors.push(`${t('users:validation.assignmentRequiredRole', { index: index + 1 })}`);
            }

            // Check for duplicates
            if (assignment.roleId && assignment.roleId.trim()) {
                const key = `${assignment.roleId}-${assignment.organizationId || 'global'}`;
                if (seen.has(key)) {
                    errors.push(`${t('users:validation.duplicateAssignment', { index: index + 1 })}`);
                }
                seen.add(key);
            }
        });

        setValidationErrors(errors);
        return errors.length === 0;
    }, [t]);

    // Check if we can remove assignments (must have at least 1)
    const canRemove = assignments.length > 1;

    // Get assignment statistics
    const validAssignments = assignments.filter(a => a.isValid).length;
    const totalAssignments = assignments.length;

    return (
        <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {t('users:labels.roleAssignments')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('users:descriptions.roleAssignments')}
                    </p>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {validAssignments}/{totalAssignments} {t('users:labels.valid')}
                </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">
                        {t('common:validation.errors')}:
                    </h4>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        {validationErrors.map((error, index) => (
                            <li key={index}>• {error}</li>
                        ))}
                    </ul>
                </div>
            )}      {/* Assignment Items */}
            <div className="space-y-3">
                {assignments.map((assignment) => (
                    <RoleAssignmentItemComponent
                        key={assignment.id}
                        assignment={assignment}
                        roles={roles}
                        organizations={organizations}
                        onUpdate={handleUpdateAssignment}
                        onRemove={handleRemoveAssignment}
                        canRemove={canRemove}
                        loading={loading}
                        disabled={disabled}
                    />
                ))}
            </div>

            {/* Add Assignment Button */}
            {assignments.length < maxAssignments && (
                <button
                    type="button"
                    onClick={handleAddAssignment}
                    disabled={disabled || loading}
                    className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-doan-500 hover:text-doan-600 dark:hover:text-doan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('users:actions.addRoleAssignment')}
                </button>
            )}

            {/* Assignment Limit Warning */}
            {assignments.length >= maxAssignments && (
                <div className="text-sm text-amber-600 dark:text-amber-400 text-center">
                    {t('users:messages.maxAssignmentsReached', { max: maxAssignments })}
                </div>
            )}
        </div>
    );
};

export default RoleAssignmentManager;
