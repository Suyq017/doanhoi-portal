import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CreateUserRequest, User as ApiUser } from '../../../shared';
import { Organization as SharedOrganization } from '../../../shared/types/organization';
import { roleService, type Role } from '../../permissions/services/roleService';
import { organizationService } from '../../../shared/services/organizationService';
import { userService } from '../../../shared/services/userService';

import { useOrganizationList } from '../../../shared/hooks/queries';
import { useAllDepartmentsQuery } from '../../../shared/hooks/queries/useDepartmentQueries';
import { useAllClassesQuery } from '../../../shared/hooks/queries/useClassQueries';
import SearchableCombobox from '../../../shared/components/SearchableCombobox';
import RolesOrganizationManager from './RolesOrganizationManager';
import OrganizationManager from './OrganizationManager';
import { RoleAssignment } from '../hooks/useGrantRoles';

// Extended Organization type with level for role assignment components
interface Organization extends Omit<SharedOrganization, 'code'> {
  code: string; // Make code required
  level: number;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserRequest) => Promise<void>;
  user: ApiUser | null;
  loading?: boolean;
  showSuccess?: (message: string) => void;
  showError?: (message: string) => void;
  onRefreshData?: () => Promise<void>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  loading = false,
  showSuccess,
  showError,
  onRefreshData,
}) => {
  const { t } = useTranslation(['users', 'common']);

  const [formData, setFormData] = useState<CreateUserRequest>({
    code: '',
    familyName: '',
    givenName: '',
    email: '',
    phone: '',
    password: '',
    userType: 'student',
    membershipStatus: 'none',
    organizationId: '',
    // New fields
    classId: '',
    managementDepartmentId: '',
    trainingDepartmentId: '',
    identityCard: '',
    birthDate: '',
    gender: undefined,
    admissionYear: '',
    curriculumYear: '',
    facultyCode: '',
    trainingSystem: '',
    trainingLevel: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const { data: allOrganizations = [] } = useOrganizationList();
  const { data: allDepartments = [] } = useAllDepartmentsQuery();
  const { data: allClasses = [] } = useAllClassesQuery();



  // Transform organizations with useMemo to prevent infinite loop
  const organizations = useMemo(() =>
    allOrganizations.map(org => ({
      ...org,
      code: org.code || '',
      level: 0
    })),
    [allOrganizations]
  );

  const [userDetail, setUserDetail] = useState<ApiUser | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  // Role assignment states
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load full user details when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadUserDetail();
      loadRoles();
    }
  }, [isOpen, user]);

  const loadUserDetail = async () => {
    if (!user) return;

    try {
      setLoadingUserDetail(true);
      const detail = await userService.getUserById(user.id);
      setUserDetail(detail);
    } catch (error) {
      console.error('Error loading user detail:', error);
      // Fallback to original user data if API fails
      setUserDetail(user);
    } finally {
      setLoadingUserDetail(false);
    }
  };  // Populate form when user detail changes
  useEffect(() => {
    const currentUser = userDetail || user;
    if (currentUser && organizations.length > 0) {
      console.log('Populating form with user data:', currentUser);
      console.log('User organizations field:', currentUser.organizations);
      console.log('User userRoles field:', currentUser.userRoles);
      console.log('Available organizations:', organizations.length);

      const organizationId = getUserCurrentOrganizationId(currentUser);

      const newFormData = {
        code: currentUser.code,
        familyName: currentUser.familyName,
        givenName: currentUser.givenName,
        email: currentUser.email,
        phone: currentUser.phone,
        password: '', // Don't populate password for security
        userType: currentUser.userType,
        membershipStatus: currentUser.membershipStatus,
        organizationId,
        // New fields
        classId: currentUser.class?.id || '',
        managementDepartmentId: currentUser.managementDepartment?.id || '',
        trainingDepartmentId: currentUser.trainingDepartment?.id || '',
        identityCard: (currentUser as any).identityCard || '',
        birthDate: (currentUser as any).birthDate ? (currentUser as any).birthDate.split('T')[0] : '', // Convert to YYYY-MM-DD format
        gender: (currentUser as any).gender || undefined,
        admissionYear: (currentUser as any).admissionYear || '',
        curriculumYear: (currentUser as any).curriculumYear || '',
        facultyCode: currentUser.facultyCode || '',
        trainingSystem: (currentUser as any).trainingSystem || '',
        trainingLevel: (currentUser as any).trainingLevel || '',
        isActive: currentUser.isActive !== undefined ? currentUser.isActive : true,
      };

      setFormData(newFormData);
      setErrors({});

      // Set role assignments - don't create empty assignment if user has no roles
      const assignments = convertUserRolesToAssignments(currentUser);
      setRoleAssignments(assignments);

      // Set user organizations
      const userOrgs = getUserOrganizations(currentUser);
      setUserOrganizations(userOrgs);
    }
  }, [userDetail, user, organizations]);

  // Load roles when modal opens (organizations loaded automatically by React Query)
  useEffect(() => {
    if (isOpen) {
      loadRoles();
    }
  }, [isOpen]);

  // Handle organization membership update
  const handleOrganizationMembershipUpdate = async () => {
    if (!user) return;

    // Get original user organizations (from when modal was opened)
    const currentUser = userDetail || user;
    const originalUserOrgs = getUserOrganizations(currentUser);
    const originalOrgIds = originalUserOrgs.map(org => org.id);

    // Get currently selected organizations in the UI
    const selectedOrgIds = userOrganizations.map(org => org.id);

    // Find organizations to add and remove
    const orgsToAdd = selectedOrgIds.filter(id => !originalOrgIds.includes(id));
    const orgsToRemove = originalOrgIds.filter(id => !selectedOrgIds.includes(id));

    console.log('Organization membership changes:', {
      original: originalOrgIds,
      selected: selectedOrgIds,
      toAdd: orgsToAdd,
      toRemove: orgsToRemove
    });

    if (orgsToAdd.length === 0 && orgsToRemove.length === 0) {
      console.log('No organization membership changes needed');
      return;
    }

    try {
      // Keep track of all organizations that will be added (including parents)
      const allAddedOrgIds = new Set<string>();

      // Add user to new organizations (with parent organizations)
      for (const orgId of orgsToAdd) {
        const addedMemberships = await organizationService.addUserToOrganizationWithParents(orgId, user.id, 'member');
        console.log(`Added user to organization ${orgId} and ${addedMemberships.length - 1} parent organizations`);

        // Collect all organization IDs that were actually added
        addedMemberships.forEach(membership => {
          allAddedOrgIds.add(membership.organizationId);
        });
      }

      // Smart removal: Only remove user from organizations that are safe to remove
      const orgsToActuallyRemove = orgsToRemove.filter(orgId => !allAddedOrgIds.has(orgId));
      const safeToRemoveOrgs = await filterSafeToRemoveOrganizations(orgsToActuallyRemove, selectedOrgIds);

      for (const orgId of safeToRemoveOrgs) {
        await organizationService.removeUserFromOrganization(orgId, user.id);
        console.log(`Removed user from organization: ${orgId}`);
      }

      // Log organizations that were not removed for safety reasons
      const notRemovedOrgs = orgsToActuallyRemove.filter(orgId => !safeToRemoveOrgs.includes(orgId));
      if (notRemovedOrgs.length > 0) {
        const notRemovedOrgNames = organizations
          .filter(org => notRemovedOrgs.includes(org.id))
          .map(org => org.name);
        console.log(`Organizations not removed (still needed as parents): ${notRemovedOrgNames.join(', ')}`);
      }

      // Update UI state to reflect all organizations that were actually added
      if (allAddedOrgIds.size > 0) {
        const newlyAddedOrgs = organizations.filter(org =>
          allAddedOrgIds.has(org.id) && !userOrganizations.some(userOrg => userOrg.id === org.id)
        );

        if (newlyAddedOrgs.length > 0) {
          console.log(`Updating UI to include ${newlyAddedOrgs.length} additional organizations:`, newlyAddedOrgs.map(org => org.name));
          setUserOrganizations(prev => [...prev, ...newlyAddedOrgs]);
        }
      }

      console.log('Organization membership updated successfully');

      // Removed the success toast notification here to avoid duplicate notifications
      // The main success notification will be shown after all updates complete
    } catch (error) {
      console.error('Error updating organization membership:', error);
      if (showError) {
        showError(t('users:messages.updateOrganizationMembershipError', {
          defaultValue: 'Có lỗi xảy ra khi cập nhật thành viên tổ chức'
        }));
      }
      throw error; // Re-throw to prevent form submission success
    }
  };

  // Helper function to filter organizations that are safe to remove
  const filterSafeToRemoveOrganizations = async (
    orgsToRemove: string[],
    selectedOrgIds: string[]
  ): Promise<string[]> => {
    const safeToRemove: string[] = [];

    for (const orgId of orgsToRemove) {
      // Check if this organization is a parent of any selected organization
      const isParentOfSelected = await isParentOfAnyOrganization(orgId, selectedOrgIds);

      if (!isParentOfSelected) {
        // Safe to remove - this org is not a parent of any remaining selected org
        safeToRemove.push(orgId);
      } else {
        console.log(`Keeping organization ${orgId} as it's a parent of selected organizations`);
      }
    }

    return safeToRemove;
  };

  // Helper function to check if an organization is parent of any organization in the list
  const isParentOfAnyOrganization = async (parentOrgId: string, childOrgIds: string[]): Promise<boolean> => {
    for (const childOrgId of childOrgIds) {
      if (await isParentOfOrganization(parentOrgId, childOrgId)) {
        return true;
      }
    }
    return false;
  };

  // Helper function to check if orgA is parent (ancestor) of orgB
  const isParentOfOrganization = async (parentOrgId: string, childOrgId: string): Promise<boolean> => {
    const childOrg = organizations.find(org => org.id === childOrgId);
    if (!childOrg) return false;

    // Traverse up the parent chain
    let currentOrg = childOrg;
    while (currentOrg.parentId) {
      if (currentOrg.parentId === parentOrgId) {
        return true;
      }
      // Find parent organization
      const parentOrg = organizations.find(org => org.id === currentOrg.parentId);
      if (!parentOrg) break;
      currentOrg = parentOrg;
    }

    return false;
  };

  const getUserCurrentOrganizationId = (user: ApiUser): string => {
    // Get the organization ID from the first active role
    const activeRole = user.userRoles?.find(ur => ur.isActive && ur.role?.isActive);
    const orgId = activeRole?.organizationId || '';
    return orgId;
  };  // Helper function to convert user roles to role assignments
  // Now groups by role instead of organization (1 role - many organizations)
  const convertUserRolesToAssignments = (user: ApiUser): RoleAssignment[] => {
    const userRoles = user.userRoles?.filter(ur => ur.isActive && ur.role?.isActive) || [];

    // Group organizations by role
    const orgsByRole = userRoles.reduce((acc, ur) => {
      const roleId = ur.roleId;
      if (!acc[roleId]) {
        acc[roleId] = {
          organizations: [],
          hasGlobal: false
        };
      }

      if (ur.organizationId) {
        // Specific organization assignment
        acc[roleId].organizations.push(ur.organizationId);
      } else {
        // Global assignment (no specific organization)
        acc[roleId].hasGlobal = true;
      }

      return acc;
    }, {} as Record<string, { organizations: string[], hasGlobal: boolean }>);

    // Convert to RoleAssignment format
    const assignments: RoleAssignment[] = [];

    Object.entries(orgsByRole).forEach(([roleId, data]) => {
      if (data.hasGlobal) {
        // If has global assignment, create a separate global assignment
        assignments.push({
          id: `assignment-${assignments.length}`,
          roleIds: [roleId],
          organizationIds: [],
          isGlobal: true
        });
      }

      // If has specific organization assignments, create assignment for those
      if (data.organizations.length > 0) {
        const uniqueOrganizations = [...new Set(data.organizations)]; // Remove duplicates
        assignments.push({
          id: `assignment-${assignments.length}`,
          roleIds: [roleId],
          organizationIds: uniqueOrganizations,
          isGlobal: false
        });
      }
    });

    return assignments;
  };// Helper function to get user's organizations
  const getUserOrganizations = (user: ApiUser): Organization[] => {
    const organizationIds = new Set<string>();
    const organizationsMap = new Map<string, Organization>();

    // ONLY get organizations from direct user-organization relationships (user_organization table)
    // Do NOT include organizations from userRoles to avoid confusion
    const directOrgIds = user.organizations
      ?.filter(org => org.isActive && org.organization)
      .map(org => org.organizationId)
      .filter(Boolean) || [];

    directOrgIds.forEach(id => organizationIds.add(id));

    // Build map of available organizations for quick lookup
    organizations.forEach(org => {
      organizationsMap.set(org.id, org);
    });

    // Convert organization IDs to Organization objects, ensuring all have level property
    const userOrgs: Organization[] = [];
    organizationIds.forEach(orgId => {
      const org = organizationsMap.get(orgId);
      if (org && org.id && org.name) { // Ensure org has essential properties
        // Ensure the organization has all required properties including level
        const completeOrg: Organization = {
          ...org,
          code: org.code || org.id,
          level: org.level !== undefined ? org.level : 0 // Fallback level if not set
        };
        userOrgs.push(completeOrg);
      }
    });

    console.log('User organizations found (from user_organization only):', {
      fromDirectRelations: directOrgIds,
      finalOrganizations: userOrgs.map(org => ({ id: org.id, name: org.name, code: org.code }))
    });

    return userOrgs;
  };

  const loadRoles = async () => {
    try {
      const rolesData = await roleService.getAvailableRoles();
      console.log('Loaded roles for edit modal:', rolesData); // Debug log
      const activeRoles = rolesData.filter(role => role.isActive);
      console.log('Active roles:', activeRoles); // Debug log
      setRoles(activeRoles); // Only show active roles
    } catch (error) {
      console.error('Error loading roles:', error);
      // Fallback: try to get roles from main roles endpoint
      try {
        const fallbackRoles = await roleService.getRoles();
        console.log('Fallback roles:', fallbackRoles); // Debug log
        const activeRoles = fallbackRoles.data.filter(role => role.isActive);
        setRoles(activeRoles);
      } catch (fallbackError) {
        console.error('Fallback error loading roles:', fallbackError);
      }
    }
  };

  const calculateOrganizationLevel = (org: SharedOrganization, allOrgs: SharedOrganization[]): number => {
    if (!org.parentId) return 0;

    const parent = allOrgs.find(o => o.id === org.parentId);
    if (!parent) return 1;

    return 1 + calculateOrganizationLevel(parent, allOrgs);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = t('common:validation.required', { field: t('users:fields.code') });
    }

    if (!formData.familyName.trim()) {
      newErrors.familyName = t('common:validation.required', { field: t('users:fields.familyName') });
    }

    if (!formData.givenName.trim()) {
      newErrors.givenName = t('common:validation.required', { field: t('users:fields.givenName') });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }; const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Clean up the form data before sending
      const cleanedData = { ...formData };

      // Remove empty string values and convert to undefined/null
      if (!cleanedData.password || cleanedData.password.trim() === '') {
        delete cleanedData.password;
      }

      if (!cleanedData.organizationId || cleanedData.organizationId.trim() === '') {
        delete cleanedData.organizationId;
      }

      console.log('Sending cleaned data for edit:', cleanedData);

      // First update the basic user info
      await onSubmit(cleanedData);

      // Then handle role assignments separately
      const validRoleAssignments = roleAssignments.filter(assignment => assignment.roleIds.length > 0);

      if (validRoleAssignments.length > 0) {
        console.log('Updating role assignments:', validRoleAssignments);

        // Remove frontend-only properties before sending to backend
        const cleanedRoleAssignments = validRoleAssignments.map(assignment => ({
          roleIds: assignment.roleIds,
          organizationIds: assignment.organizationIds || [],
          isGlobal: assignment.isGlobal || false
        }));

        const grantRolesPayload = {
          userId: user.id,
          roleAssignments: cleanedRoleAssignments
        };

        console.log('Grant roles payload:', JSON.stringify(grantRolesPayload, null, 2));

        try {
          await roleService.grantRoles(grantRolesPayload);
          console.log('Role assignments updated successfully');
        } catch (roleError) {
          console.error('Error updating role assignments:', roleError);
          console.error('Failed payload:', grantRolesPayload);
          // If role assignment fails, we should inform the user
          if (showError) {
            showError(t('users:messages.updateRoleAssignmentsError', {
              defaultValue: 'Cập nhật thông tin cơ bản thành công nhưng gán vai trò thất bại. Vui lòng thử lại việc gán vai trò.'
            }));
          }
          throw roleError;
        }
      } else if (roleAssignments.length === 0) {
        // User explicitly removed all role assignments - use grantRoles with empty array
        console.log('User removed all role assignments - clearing via grantRoles API');

        const clearRolesPayload = {
          userId: user.id,
          roleAssignments: [] // Empty array will remove all roles (backend validation updated to allow this)
        };

        console.log('Clearing all roles via grantRoles API');
        await roleService.grantRoles(clearRolesPayload);
        console.log('All role assignments successfully cleared');
      }// Handle organization membership changes
      await handleOrganizationMembershipUpdate();

      // Reload user detail immediately after organization changes to get accurate data
      await loadUserDetail();

      // If we get here, everything succeeded
      console.log('User, role assignments, and organization membership updated successfully');      // Show success message and refresh data
      if (showSuccess) {
        showSuccess(t('users:messages.updateUserSuccess', {
          defaultValue: 'Cập nhật người dùng thành công'
        }));
      }

      // Refresh data to get updated user information
      if (onRefreshData) {
        await onRefreshData();
      }

      // Reload user detail to reflect changes in the modal
      await loadUserDetail();

      // Close modal
      handleClose();
    } catch (error) {
      console.error('Error updating user:', error);
      if (showError && !(error instanceof Error && error.message?.includes('gán vai trò'))) {
        showError(t('users:messages.updateUserError', {
          defaultValue: 'Có lỗi xảy ra khi cập nhật người dùng'
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      code: '',
      familyName: '',
      givenName: '',
      email: '',
      phone: '',
      password: '',
      userType: 'student',
      membershipStatus: 'none',
      organizationId: '',
      // Reset new fields
      classId: '',
      managementDepartmentId: '',
      trainingDepartmentId: '',
      identityCard: '',
      birthDate: '',
      gender: undefined,
      admissionYear: '',
      curriculumYear: '',
      facultyCode: '',
      trainingSystem: '',
      trainingLevel: '',
      isActive: true,
    });

    setRoleAssignments([]); // Reset to empty array instead of creating default assignment
    setUserOrganizations([]);
    setIsSubmitting(false);
    setErrors({});
    onClose();
  };

  // Helper function to generate new assignment
  const generateNewAssignment = (): RoleAssignment => ({
    id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    roleIds: [],
    organizationIds: [],
    isGlobal: false,
  });

  // Role assignment handlers
  const handleAddRoleAssignment = () => {
    const newAssignment = generateNewAssignment();
    setRoleAssignments(prev => [...prev, newAssignment]);
  };

  const handleRemoveRoleAssignment = (id: string) => {
    setRoleAssignments(prev => prev.filter(assignment => assignment.id !== id));
  };
  const handleUpdateRoleAssignment = (id: string, updates: Partial<RoleAssignment>) => {
    setRoleAssignments(prev =>
      prev.map(assignment =>
        assignment.id === id ? { ...assignment, ...updates } : assignment
      )
    );
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const modalContent = (<div
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4"
    style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
    onClick={handleOverlayClick}
  >
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('users:titles.edit')}
        </h2>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" disabled={loading || isSubmitting}
        >
          <X className="w-6 h-6" />
        </button>
      </div>        {/* Form */}
      {loadingUserDetail ? (
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('users:fields.code')} *
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.code
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder={t('users:placeholders.code')} disabled={loading || isSubmitting}
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.code}
              </p>
            )}
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users:fields.familyName')} *
              </label>
              <input
                type="text"
                name="familyName"
                value={formData.familyName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.familyName
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
                  }`}
                placeholder={t('users:placeholders.familyName')}
                disabled={loading}
              />
              {errors.familyName && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.familyName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users:fields.givenName')} *
              </label>
              <input
                type="text"
                name="givenName"
                value={formData.givenName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.givenName
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
                  }`}
                placeholder={t('users:placeholders.givenName')}
                disabled={loading}
              />
              {errors.givenName && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.givenName}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common:fields.email')} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.email
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder={t('users:placeholders.email')}
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common:fields.phone')} *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.phone
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder={t('users:placeholders.phone')}
              disabled={loading}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('users:labels.newPassword')}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder={t('users:placeholders.newPassword')}
              disabled={loading}
            />
          </div>

          {/* User Type and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users:fields.userType')}
              </label>
              <select
                name="userType"
                value={formData.userType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={loading}
              >
                <option value="student">{t('users:types.student')}</option>
                <option value="staff">{t('users:types.staff')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users:fields.membershipStatus')}
              </label>
              <select
                name="membershipStatus"
                value={formData.membershipStatus}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={loading}
              >
                <option value="none">{t('users:membershipStatus.none')}</option>
                <option value="doan_vien">{t('users:membershipStatus.doan_vien')}</option>
                <option value="hoi_vien">{t('users:membershipStatus.hoi_vien')}</option>
                <option value="both">{t('users:membershipStatus.both')}</option>
              </select>
            </div>
          </div>

          {/* New Additional Fields Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              {t('users:titles.personalInfo')}
            </h3>

            {/* Row 1: Class and Identity Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Class Combobox */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.className')}
                </label>
                <SearchableCombobox
                  options={allClasses.map(c => ({
                    value: c.id,
                    label: `${c.name}`,
                    searchText: `${c.name}`
                  }))}
                  value={formData.classId || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}
                  placeholder={t('users:placeholders.className')}
                  disabled={loading}
                />
              </div>

              {/* Identity Card */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.identityCard')}
                </label>
                <input
                  type="text"
                  name="identityCard"
                  value={formData.identityCard || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={t('users:placeholders.identityCard', { defaultValue: 'Nhập số CMND/CCCD' })}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Row 2: Management and Training Departments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Management Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.managementDepartmentCode')}
                </label>
                <SearchableCombobox
                  options={allDepartments.map(dept => ({
                    value: dept.id,
                    label: `${dept.name} (${dept.code})`,
                    searchText: `${dept.name} ${dept.code}`
                  }))}
                  value={formData.managementDepartmentId || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, managementDepartmentId: value }))}
                  placeholder={t('users:placeholders.managementDepartment')}
                  disabled={loading}
                />
              </div>

              {/* Training Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.trainingDepartmentCode')}
                </label>
                <SearchableCombobox
                  options={allDepartments.map(dept => ({
                    value: dept.id,
                    label: `${dept.name} (${dept.code})`,
                    searchText: `${dept.name} ${dept.code}`
                  }))}
                  value={formData.trainingDepartmentId || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, trainingDepartmentId: value }))}
                  placeholder={t('users:placeholders.trainingDepartment')}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Row 3: Birth Date and Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.birthDate')}
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Giới tính
                </label>
                <select
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                >
                  <option value="">{t('users:placeholders.gender')}</option>
                  <option value="NAM">{t('users:gender.male')}</option>
                  <option value="NU">{t('users:gender.female')}</option>
                </select>
              </div>
            </div>

            {/* Row 4: Academic Years and Faculty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Admission Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.admissionYear')}
                </label>
                <input
                  type="text"
                  name="admissionYear"
                  value={formData.admissionYear || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={t('users:placeholders.admissionYear', { defaultValue: 'Ví dụ: 2024' })}
                  disabled={loading}
                />
              </div>

              {/* Curriculum Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.curriculumYear')}
                </label>
                <input
                  type="text"
                  name="curriculumYear"
                  value={formData.curriculumYear || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={t('users:placeholders.curriculumYear', { defaultValue: 'Ví dụ: 2024' })}
                  disabled={loading}
                />
              </div>

              {/* Faculty Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.facultyCode')}
                </label>
                <input
                  type="text"
                  name="facultyCode"
                  value={formData.facultyCode || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={t('users:placeholders.facultyCode', { defaultValue: 'Ví dụ: CNTT' })}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Row 5: Training System, Level and Active Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Training System */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.trainingSystem')}
                </label>
                <input
                  type="text"
                  name="trainingSystem"
                  value={formData.trainingSystem || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={t('users:placeholders.trainingSystem', { defaultValue: 'Ví dụ: Chính quy, Liên thông, Từ xa...' })}
                  disabled={loading}
                />
              </div>

              {/* Training Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.trainingLevel')}
                </label>
                <input
                  type="text"
                  name="trainingLevel"
                  value={formData.trainingLevel || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={t('users:placeholders.trainingLevel', { defaultValue: 'Ví dụ: Đại học, Thạc sĩ, Tiến sĩ...' })}
                  disabled={loading}
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.isActive')}
                </label>
                <select
                  name="isActive"
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                >
                  <option value="true">{t('users:membershipStatus.active')}</option>
                  <option value="false">{t('users:membershipStatus.graduated')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Organization Management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('users:labels.memberOrganizations', { defaultValue: 'Tổ chức thành viên' })}
            </label>

            <OrganizationManager
              selectedOrganizations={userOrganizations}
              availableOrganizations={organizations}

              onOrganizationChange={async (selectedOrgs) => {
                // Just update the UI state immediately - don't make API calls here
                // API calls will be made when form is submitted
                console.log('Organization selection changed:', selectedOrgs.map(org => ({ id: org.id, name: org.name })));

                setUserOrganizations(selectedOrgs);
              }}
              disabled={loading}
            />

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('users:labels.memberOrganizationsDesc', {
                defaultValue: 'Hiển thị các tổ chức mà người dùng là thành viên (user_organization). Khác với vai trò tổ chức ở phần "Gán vai trò và tổ chức" bên dưới.'
              })}
            </p>
          </div>

          {/* Role Assignments Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('users:labels.roleAndOrganizationAssignment', { defaultValue: 'Gán vai trò và tổ chức' })}
            </label>            <RolesOrganizationManager
              assignments={roleAssignments}
              roles={roles}
              organizations={organizations}
              userOrganizations={userOrganizations}
              onUpdateAssignment={handleUpdateRoleAssignment}
              onRemoveAssignment={handleRemoveRoleAssignment}
              onAddAssignment={handleAddRoleAssignment} disabled={loading} />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button" onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading || isSubmitting}
            >
              {t('common:actions.cancel')}
            </button><button
              type="submit"
              disabled={loading || isSubmitting}
              className="px-4 py-2 bg-doan-600 text-white rounded-md hover:bg-doan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {(loading || isSubmitting) && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{(loading || isSubmitting) ? t('common:states.updating') : t('common:actions.update')}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
  );

  return createPortal(modalContent, document.body);
};

export default EditUserModal;
