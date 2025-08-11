import React, { useState, useEffect } from 'react';
import { Shield, Plus, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { roleService, type Role } from '../../permissions/services/roleService';
import RoleBadge from './RoleBadge';

interface RoleManagerProps {
  userId?: string;
  selectedRoles: string[];
  onRolesChange: (roles: string[]) => void;
  readonly?: boolean;
  loading?: boolean;
}

const RoleManager: React.FC<RoleManagerProps> = ({
  userId,
  selectedRoles,
  onRolesChange,
  readonly = false,
  loading = false
}) => {
  const { t } = useTranslation(['users', 'common']);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');

  // Load available roles
  useEffect(() => {
    loadAvailableRoles();
  }, []);

  const loadAvailableRoles = async () => {
    try {
      setRolesLoading(true);
      const roles = await roleService.getAvailableRoles();
      setAvailableRoles(roles.filter(role => role.isActive));
    } catch (error) {
      console.error('Error loading available roles:', error);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    const newRoles = selectedRoles.includes(roleId) 
      ? selectedRoles.filter(id => id !== roleId)
      : [...selectedRoles, roleId];
    onRolesChange(newRoles);
  };

  const removeRole = (roleId: string) => {
    onRolesChange(selectedRoles.filter(id => id !== roleId));
  };

  // Filter roles based on search term
  const filteredAvailableRoles = availableRoles.filter(role => 
    !selectedRoles.includes(role.id) && 
    (role.displayName.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
     role.name.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
     (role.description && role.description.toLowerCase().includes(roleSearchTerm.toLowerCase())))
  );

  const selectedRoleObjects = availableRoles.filter(role => selectedRoles.includes(role.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          {t('users:labels.rolesAndPermissions')}
        </h3>
        {!readonly && (
          <button
            type="button"
            onClick={() => setShowRoleSelector(!showRoleSelector)}
            className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            disabled={loading || rolesLoading}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('users:labels.addRole')}
          </button>
        )}
      </div>

      {/* Selected Roles */}
      {selectedRoles.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('users:labels.assignedRoles')} ({selectedRoles.length}):
          </h4>
          <div className="space-y-2">
            {selectedRoleObjects.map(role => (
              <div key={role.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex-1">
                  <RoleBadge 
                    role={role} 
                    showPermissionCount={true}
                    size="md"
                  />
                </div>
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => removeRole(role.id)}
                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    disabled={loading}
                    title={t('users:labels.removeRole')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
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

      {/* Role Selector */}
      {showRoleSelector && !readonly && (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('users:labels.selectRoleToAssign')}:
            </h4>
            <div className="relative flex-1 max-w-xs ml-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder={t('users:labels.searchRoles', { defaultValue: 'Tìm kiếm vai trò...' })}
                value={roleSearchTerm}
                onChange={(e) => setRoleSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {rolesLoading ? (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>{t('users:labels.loadingRoles')}</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {filteredAvailableRoles.map(role => (
                <label key={role.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => handleRoleToggle(role.id)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <RoleBadge 
                      role={role} 
                      showPermissionCount={true}
                      size="sm"
                    />
                    {role.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {role.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
              {filteredAvailableRoles.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  {roleSearchTerm ? t('users:labels.noSuitableRoles', { defaultValue: 'Không tìm thấy vai trò phù hợp' }) : t('users:labels.allRolesAssigned')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleManager;
