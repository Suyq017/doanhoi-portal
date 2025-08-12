import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Mail, Phone, Calendar, Building, Shield, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as ApiUser } from '../../../shared';
import { Organization as SharedOrganization } from '../../../shared/types/organization';
import { userService } from '../../../shared/services/userService';
import { organizationService } from '../../../shared/services/organizationService';

// Extended Organization type with level for consistency
interface Organization extends Omit<SharedOrganization, 'code'> {
  code: string; // Make code required
  level: number;
}

interface ViewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ApiUser | null;
}

const ViewUserModal: React.FC<ViewUserModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  const { t } = useTranslation(['users', 'common']);
  const [userDetail, setUserDetail] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  // Load full user details when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadUserDetail();
      loadOrganizations();
    }
  }, [isOpen, user]);

  const loadOrganizations = async () => {
    try {
      const organizationsData = await organizationService.getOrganizations();

      // Add level property and ensure code is a string for consistency
      const organizationsWithLevel = organizationsData.map(org => ({
        ...org,
        code: org.code || org.id, // Fallback to id if code is not available
        level: calculateOrganizationLevel(org, organizationsData)
      }));

      setOrganizations(organizationsWithLevel);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  // Helper function to calculate organization level
  const calculateOrganizationLevel = (org: SharedOrganization, allOrgs: SharedOrganization[]): number => {
    if (!org.parentId) return 0;

    const parent = allOrgs.find(o => o.id === org.parentId);
    if (!parent) return 1;

    return 1 + calculateOrganizationLevel(parent, allOrgs);
  };

  // Helper function to get user's organizations
  const getUserOrganizations = (user: ApiUser): Organization[] => {
    const organizationIds = new Set<string>();
    const organizationsMap = new Map<string, Organization>();

    // Get organizations from userRoles (roles assigned to specific organizations)
    const userRoleOrgIds = user.userRoles
      ?.filter(ur => ur.isActive && ur.organizationId)
      .map(ur => ur.organizationId!)
      .filter(Boolean) || [];

    userRoleOrgIds.forEach(id => organizationIds.add(id));

    // Get organizations from direct user-organization relationships
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

    return userOrgs;
  };
  const loadUserDetail = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Loading user detail for ID:', user.id); // Debug log
      const detail = await userService.getUserById(user.id);
      console.log('Loaded user detail:', detail); // Debug log
      setUserDetail(detail);

      // Update user organizations after loading user detail
      if (organizations.length > 0) {
        const userOrgs = getUserOrganizations(detail);
        setUserOrganizations(userOrgs);
      }
    } catch (error) {
      console.error('Error loading user detail:', error);
      // Fallback to original user data if API fails
      setUserDetail(user);
    } finally {
      setLoading(false);
    }
  };

  // Update user organizations when userDetail or organizations change
  useEffect(() => {
    if (userDetail && organizations.length > 0) {
      const userOrgs = getUserOrganizations(userDetail);
      setUserOrganizations(userOrgs);
    }
  }, [userDetail, organizations]);

  if (!isOpen) return null;

  // Use detailed user data if available, otherwise fallback to passed user
  const displayUser = userDetail || user;
  if (!displayUser) return null;

  // Get user roles from detailed user data
  const userRoles = displayUser.userRoles || [];

  const getUserTypeText = (type: string) => {
    return type === 'student' ? t('users:types.student') : t('users:types.staff');
  };

  const getMembershipStatusText = (status: string) => {
    switch (status) {
      case 'doan_vien': return t('users:membershipStatus.doan_vien');
      case 'hoi_vien': return t('users:membershipStatus.hoi_vien');
      case 'both': return t('users:membershipStatus.both');
      case 'none': return t('users:membershipStatus.none');
      default: return status;
    }
  };

  const getMembershipStatusColor = (status: string) => {
    switch (status) {
      case 'doan_vien': return 'bg-doan-100 text-doan-800';
      case 'hoi_vien': return 'bg-hsv-100 text-hsv-800';
      case 'both': return 'bg-green-100 text-green-800';
      case 'none': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <User className="w-5 h-5 mr-2" />
            {t('users:titles.view')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && !userDetail ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500">{t('common:states.loading')}</span>
            </div>
          ) : (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('users:fields.fullName')}
                  </label>              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {`${displayUser.familyName} ${displayUser.givenName}`}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('users:fields.code')}
                  </label>              <div className="text-lg text-gray-900 dark:text-white font-mono">
                    {displayUser.code}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {t('common:fields.email')}
                  </label>              <div className="text-gray-900 dark:text-white">
                    <a href={`mailto:${displayUser.email}`} className="text-blue-600 hover:text-blue-800 underline">
                      {displayUser.email}
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    {t('common:fields.phone')}
                  </label>              <div className="text-gray-900 dark:text-white">
                    <a href={`tel:${displayUser.phone}`} className="text-blue-600 hover:text-blue-800">
                      {displayUser.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* User Type and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('users:fields.userType')}
                  </label>              <div className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {getUserTypeText(displayUser.userType)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('users:fields.membershipStatus')}
                  </label>              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getMembershipStatusColor(displayUser.membershipStatus)}`}>
                    {getMembershipStatusText(displayUser.membershipStatus)}
                  </div>
                </div>              </div>              {/* User Organizations */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  {t('users:labels.userOrganizations')}
                </h3>

                {userOrganizations.length > 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">                      {userOrganizations
                      .sort((a, b) => a.level - b.level) // Sort by level: parent -> child -> grandchild
                      .map((org) => (
                        <span
                          key={org.id}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          <Building className="w-3 h-3 mr-1" />
                          {org.name}
                        </span>
                      ))
                    }
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('users:labels.noOrganizationsAssigned')}
                    </p>
                  </div>
                )}
              </div>

              {/* Organizational Info */}
              {(displayUser.managementDepartment || displayUser.trainingDepartment || displayUser.class) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    {t('users:labels.organizationalInfo')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {displayUser.managementDepartment && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('users:fields.managementDepartment')}
                        </label>
                        <div className="text-gray-900 dark:text-white">
                          {displayUser.managementDepartment.name}
                        </div>
                      </div>
                    )}

                    {displayUser.trainingDepartment && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('users:fields.trainingDepartment')}
                        </label>
                        <div className="text-gray-900 dark:text-white">
                          {displayUser.trainingDepartment.name}
                        </div>
                      </div>
                    )}

                    {displayUser.class && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('users:fields.class')}
                        </label>
                        <div className="text-gray-900 dark:text-white">
                          {displayUser.class.name}
                        </div>
                      </div>
                    )}
                  </div>            </div>
              )}              {/* User Roles & Permissions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  {t('users:labels.rolesAndPermissions')}
                </h3>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-500">{t('common:states.loading')}</span>
                  </div>
                ) : userRoles.length > 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {userRoles
                        .filter(userRole => userRole.isActive && userRole.role?.isActive)
                        .map((userRole) => (
                          <span
                            key={userRole.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {userRole.role.displayName}
                          </span>
                        ))
                      }
                      {/* Show inactive roles with different color */}
                      {userRoles
                        .filter(userRole => !userRole.isActive || !userRole.role?.isActive)
                        .map((userRole) => (
                          <span
                            key={userRole.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {userRole.role.displayName} ({t('users:labels.inactive')})
                          </span>
                        ))
                      }
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('users:labels.noRolesAssigned')}
                    </p>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {t('common:fields.createdAt')}
                  </label>              <div className="text-gray-900 dark:text-white">
                    {new Date(displayUser.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {t('common:fields.updatedAt')}
                  </label>              <div className="text-gray-900 dark:text-white">
                    {new Date(displayUser.updatedAt).toLocaleString('vi-VN')}              </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ViewUserModal;
