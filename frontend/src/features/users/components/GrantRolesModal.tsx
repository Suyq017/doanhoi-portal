import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UserSearchCombobox from './UserSearchCombobox';
import RolesOrganizationManager from './RolesOrganizationManager';
import { useGrantRoles } from '../hooks/useGrantRoles';

interface GrantRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const GrantRolesModal: React.FC<GrantRolesModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation(['users', 'common']); const {
    selectedUser,
    userOrganizations,
    applyToUserOrgs,
    roleAssignments,
    users,
    roles,
    organizations,
    errors,
    submitting,
    handleUserSelect,
    handleApplyToUserOrgs,
    addRoleAssignment,
    removeRoleAssignment,
    updateRoleAssignment,
    submitGrantRoles,
    resetForm,
    loadUsers,
    loadRoles,
    loadOrganizations, } = useGrantRoles({
      onSuccess: () => {
        onSuccess?.();
        onClose();
      },
      onError: (error) => {
        console.error('Error granting roles:', error);
      }
    });

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadRoles();
      loadOrganizations();
    }
  }, [isOpen, loadUsers, loadRoles, loadOrganizations]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitGrantRoles();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">{/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-doan-100 rounded-lg">
              <Shield className="w-6 h-6 text-doan-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('users.grantRoles.title')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">            {/* User Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('users.grantRoles.selectUser')}
              </label>
              <UserSearchCombobox
                selectedUser={selectedUser}
                onUserSelect={handleUserSelect}
                users={users}
                placeholder={t('users.grantRoles.userPlaceholder')}
              />
              {errors.user && (
                <p className="text-sm text-red-600">{errors.user}</p>
              )}
            </div>            {/* Apply to User Organizations Checkbox */}
            {selectedUser && userOrganizations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="applyToUserOrgs"
                    checked={applyToUserOrgs}
                    onChange={(e) => handleApplyToUserOrgs(e.target.checked)}
                    className="h-4 w-4 text-doan-600 focus:ring-doan-500 border-gray-300 rounded"
                  />
                  <label htmlFor="applyToUserOrgs" className="text-sm font-medium text-gray-700">
                    {t('users:grantRoles.applyToUserOrganizations')}
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Khi được chọn, vai trò sẽ được áp dụng cho tất cả tổ chức mà người dùng thuộc về.
                </p>
              </div>
            )}            {/* Role Assignments Section */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                {t('users:grantRoles.roleAssignments')}
              </label>

              {selectedUser ? (
                <RolesOrganizationManager
                  assignments={roleAssignments}
                  roles={roles}
                  organizations={organizations}
                  userOrganizations={userOrganizations}
                  applyToUserOrgs={applyToUserOrgs}
                  onUpdateAssignment={updateRoleAssignment}
                  onRemoveAssignment={removeRoleAssignment}
                  onAddAssignment={addRoleAssignment}
                  disabled={submitting}
                />
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Vui lòng chọn người dùng trước</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Chọn người dùng để bắt đầu cấp vai trò
                  </p>
                </div>
              )}

              {errors.roles && (
                <p className="text-sm text-red-600">{errors.roles}</p>
              )}
            </div>            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={!selectedUser || roleAssignments.length === 0 || submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-doan-600 border border-transparent rounded-md hover:bg-doan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? t('common.saving') : t('users.grantRoles.grantRoles')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GrantRolesModal;
