import React, { useState, useEffect } from 'react';
import { X, Shield, ChevronDown, ChevronRight, Users, Building, LayoutDashboard, Building2, GraduationCap, CreditCard, Check, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { roleService, type CreateRoleRequest, type Permission } from '../services/roleService';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (roleData: any) => Promise<void>;
}

// Custom hook for translated permission groups
const usePermissionGroups = () => {
  const { t } = useTranslation('permissions');

  return [
    {
      id: 'dashboard',
      name: t('permissions.categories.dashboard'),
      icon: LayoutDashboard,
      color: 'blue',
      description: t('permissions.categories.dashboard')
    },
    {
      id: 'users',
      name: t('permissions.categories.users'),
      icon: Users,
      color: 'green',
      description: t('permissions.categories.users')
    },
    {
      id: 'organizations',
      name: t('permissions.categories.organizations'),
      icon: Building,
      color: 'purple',
      description: t('permissions.categories.organizations')
    },
    {
      id: 'departments',
      name: t('permissions.categories.departments'),
      icon: Building2,
      color: 'orange',
      description: t('permissions.categories.departments')
    },
    {
      id: 'classes',
      name: t('permissions.categories.classes'),
      icon: GraduationCap,
      color: 'red',
      description: t('permissions.categories.classes')
    },
    {
      id: 'payments',
      name: t('permissions.categories.payments'),
      icon: CreditCard,
      color: 'teal',
      description: t('permissions.categories.payments')
    },
    {
      id: 'permissions',
      name: t('permissions.categories.permissions'),
      icon: Shield,
      color: 'indigo',
      description: t('permissions.categories.permissions')
    }
  ];
};

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation('permissions');
  const PERMISSION_GROUPS = usePermissionGroups();

  const [formData, setFormData] = useState<CreateRoleRequest>({
    name: '',
    displayName: '',
    description: '',
    permissionIds: [],
  });

  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadAvailablePermissions();
      // Reset form data
      setFormData({
        name: '',
        displayName: '',
        description: '',
        permissionIds: [],
      });
      setExpandedGroups(new Set());
    }
  }, [isOpen]);

  const loadAvailablePermissions = async () => {
    try {
      setLoading(true);
      const permissions = await roleService.getAvailablePermissions();
      setAvailablePermissions(permissions);
    } catch (error) {
      // Error loading from API, fallback to mock data
      // Mock data với permissions đầy đủ hơn
      setAvailablePermissions([
        // Dashboard permissions
        { id: '1', code: 'dashboard.access', name: 'Truy cập bảng điều khiển', category: 'dashboard', context: 'system', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },

        // Users permissions
        { id: '2', code: 'users.access', name: 'Truy cập trang người dùng', category: 'users', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
        { id: '3', code: 'users.create', name: 'Tạo người dùng mới', category: 'users', context: 'organization', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
        { id: '4', code: 'users.read', name: 'Xem thông tin người dùng', category: 'users', context: 'organization', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
        { id: '5', code: 'users.update', name: 'Cập nhật thông tin người dùng', category: 'users', context: 'organization', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
        { id: '6', code: 'users.delete', name: 'Xóa người dùng', category: 'users', context: 'organization', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },

        // Organizations permissions
        { id: '7', code: 'organizations.access', name: 'Truy cập trang tổ chức', category: 'organizations', context: 'system', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
        { id: '8', code: 'organizations.create', name: 'Tạo tổ chức mới', category: 'organizations', context: 'system', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
        { id: '9', code: 'organizations.read', name: 'Xem thông tin tổ chức', category: 'organizations', context: 'system', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
        { id: '10', code: 'organizations.update', name: 'Cập nhật thông tin tổ chức', category: 'organizations', context: 'system', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
        { id: '11', code: 'organizations.delete', name: 'Xóa tổ chức', category: 'organizations', context: 'system', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },

        // Departments permissions
        { id: '12', code: 'departments.access', name: 'Truy cập trang đơn vị', category: 'departments', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
        { id: '13', code: 'departments.create', name: 'Tạo đơn vị mới', category: 'departments', context: 'organization', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
        { id: '14', code: 'departments.read', name: 'Xem thông tin đơn vị', category: 'departments', context: 'organization', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
        { id: '15', code: 'departments.update', name: 'Cập nhật thông tin đơn vị', category: 'departments', context: 'organization', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
        { id: '16', code: 'departments.delete', name: 'Xóa đơn vị', category: 'departments', context: 'organization', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },        // Classes permissions
        { id: '17', code: 'classes.access', name: 'Truy cập trang lớp học', category: 'classes', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
        { id: '18', code: 'classes.create', name: 'Tạo lớp học mới', category: 'classes', context: 'organization', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
        { id: '19', code: 'classes.read', name: 'Xem thông tin lớp học', category: 'classes', context: 'organization', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
        { id: '20', code: 'classes.update', name: 'Cập nhật thông tin lớp học', category: 'classes', context: 'organization', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
        { id: '21', code: 'classes.delete', name: 'Xóa lớp học', category: 'classes', context: 'organization', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },

        // Payment campaigns permissions
        { id: '27', code: 'payment-campaigns.access', name: 'Truy cập trang quản lý đóng phí', category: 'payments', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
        { id: '28', code: 'payment-campaigns.create', name: 'Tạo chiến dịch đóng phí mới', category: 'payments', context: 'organization', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
        { id: '29', code: 'payment-campaigns.read', name: 'Xem thông tin chiến dịch đóng phí', category: 'payments', context: 'organization', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
        { id: '30', code: 'payment-campaigns.update', name: 'Cập nhật chiến dịch đóng phí', category: 'payments', context: 'organization', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
        { id: '31', code: 'payment-campaigns.delete', name: 'Xóa chiến dịch đóng phí', category: 'payments', context: 'organization', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },        // Permissions permissions
        { id: '32', code: 'permissions.access', name: 'Truy cập trang phân quyền', category: 'permissions', context: 'organization', isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
        { id: '33', code: 'permissions.create', name: 'Tạo vai trò mới', category: 'permissions', context: 'organization', isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
        { id: '34', code: 'permissions.read', name: 'Xem thông tin vai trò', category: 'permissions', context: 'organization', isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
        { id: '35', code: 'permissions.update', name: 'Cập nhật vai trò', category: 'permissions', context: 'organization', isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
        { id: '36', code: 'permissions.delete', name: 'Xóa vai trò', category: 'permissions', context: 'organization', isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const permission = availablePermissions.find(p => p.id === permissionId);
    if (!permission) return;

    setFormData(prev => {
      let newPermissionIds = checked
        ? [...prev.permissionIds, permissionId]
        : prev.permissionIds.filter(id => id !== permissionId);

      // If adding a non-access permission, automatically add the access permission for that category
      if (checked && !permission.code.endsWith('.access')) {
        const accessPermission = availablePermissions.find(p =>
          p.category === permission.category && p.code.endsWith('.access')
        );
        if (accessPermission && !newPermissionIds.includes(accessPermission.id)) {
          newPermissionIds.push(accessPermission.id);
        }
      }

      // If removing an access permission, show confirmation and remove all other permissions in that category
      if (!checked && permission.code.endsWith('.access')) {
        const categoryPermissions = availablePermissions.filter(p => p.category === permission.category);
        const hasOtherSelected = categoryPermissions.some(p =>
          p.id !== permissionId && newPermissionIds.includes(p.id)
        ); if (hasOtherSelected) {
          const shouldRemoveAll = window.confirm(
            t('messages.removeAccessPermissionConfirm', { category: permission.category })
          );
          if (shouldRemoveAll) {
            // Remove all permissions in this category
            newPermissionIds = newPermissionIds.filter(id =>
              !categoryPermissions.some(p => p.id === id)
            );
          } else {
            // Keep the access permission
            return prev;
          }
        }
      }

      return {
        ...prev,
        permissionIds: newPermissionIds
      };
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleGroupSelect = (groupId: string, selectAll: boolean) => {
    const groupPermissions = availablePermissions.filter(p => p.category === groupId);
    const groupPermissionIds = groupPermissions.map(p => p.id);

    setFormData(prev => {
      if (selectAll) {
        // Add all group permissions that aren't already selected
        const newIds = [...prev.permissionIds];
        groupPermissionIds.forEach(id => {
          if (!newIds.includes(id)) {
            newIds.push(id);
          }
        });
        return { ...prev, permissionIds: newIds };
      } else {
        // Remove all group permissions
        return {
          ...prev,
          permissionIds: prev.permissionIds.filter(id => !groupPermissionIds.includes(id))
        };
      }
    });
  };

  const getGroupPermissions = (groupId: string) => {
    return availablePermissions.filter(p => p.category === groupId);
  };

  const getGroupSelectionState = (groupId: string) => {
    const groupPermissions = getGroupPermissions(groupId);
    const selectedCount = groupPermissions.filter(p => formData.permissionIds.includes(p.id)).length;

    if (selectedCount === 0) return 'none';
    if (selectedCount === groupPermissions.length) return 'all';
    return 'partial';
  };
  const getColorClasses = (color: string) => {
    // Color classes for different permission groups
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          icon: 'text-blue-500 dark:text-blue-400'
        };
      case 'green':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-700 dark:text-green-300',
          icon: 'text-green-500 dark:text-green-400'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          border: 'border-purple-200 dark:border-purple-800',
          text: 'text-purple-700 dark:text-purple-300',
          icon: 'text-purple-500 dark:text-purple-400'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-300',
          icon: 'text-orange-500 dark:text-orange-400'
        };
      case 'red':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
          icon: 'text-red-500 dark:text-red-400'
        };
      case 'teal':
        return {
          bg: 'bg-teal-50 dark:bg-teal-900/20',
          border: 'border-teal-200 dark:border-teal-800',
          text: 'text-teal-700 dark:text-teal-300',
          icon: 'text-teal-500 dark:text-teal-400'
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
          border: 'border-indigo-200 dark:border-indigo-800',
          text: 'text-indigo-700 dark:text-indigo-300',
          icon: 'text-indigo-500 dark:text-indigo-400'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-700',
          border: 'border-gray-200 dark:border-gray-600',
          text: 'text-gray-700 dark:text-gray-300',
          icon: 'text-gray-500 dark:text-gray-400'
        };
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.displayName) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      // Error handling managed by parent component
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-7xl p-0 my-4 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-2xl rounded-xl max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center">
              <Shield className="w-6 h-6 mr-3 text-gray-600 dark:text-gray-400" />              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('titles.create')}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t('subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
              disabled={submitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(90vh-8rem)] scroll-smooth">
            <form id="create-role-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Two Column Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Left Column - Basic Information */}
                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">                    <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                    {t('labels.basicInfo')}
                  </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('fields.name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder={t('placeholders.name')}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-colors"
                          required
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('fields.displayName')} <span className="text-red-500">*</span>
                        </label>                        <input
                          type="text"
                          name="displayName"
                          value={formData.displayName}
                          onChange={handleInputChange}
                          placeholder={t('placeholders.displayName')}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-colors"
                          required
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('fields.description')}
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder={t('placeholders.description')}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-colors resize-none"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">                    <h4 className="text-base font-medium text-blue-900 dark:text-blue-200 mb-3 flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    {t('labels.roleSummary')}
                  </h4>
                    <div className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
                      <div className="flex justify-between items-center">
                        <span>{t('labels.totalSelectedPermissions')}:</span>
                        <span className="font-semibold bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-full">
                          {formData.permissionIds.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>{t('labels.selectedPermissionGroups')}:</span>
                        <span className="font-semibold bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-full">
                          {PERMISSION_GROUPS.filter(group => {
                            const groupPerms = getGroupPermissions(group.id);
                            return groupPerms.some(p => formData.permissionIds.includes(p.id));
                          }).length}/{PERMISSION_GROUPS.length}
                        </span>
                      </div>

                      {/* Selected groups preview */}
                      {formData.permissionIds.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2 block">
                            {t('labels.selectedGroups')}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {PERMISSION_GROUPS
                              .filter(group => {
                                const groupPerms = getGroupPermissions(group.id);
                                return groupPerms.some(p => formData.permissionIds.includes(p.id));
                              })
                              .map(group => (
                                <span
                                  key={group.id}
                                  className="text-xs bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full"
                                >
                                  {group.name.replace('Quản lý ', '')}
                                </span>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Permissions */}
                <div className="space-y-4">
                  {/* Permissions Section */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 h-full">
                    <div className="flex items-center justify-between mb-4">                      <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
                      <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                      {t('labels.permissionAccess')}
                    </h4>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('labels.selected')}: <span className="font-medium text-gray-900 dark:text-gray-100">{formData.permissionIds.length}</span> {t('labels.permissions')}
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t('labels.loadingPermissions')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {PERMISSION_GROUPS.map((group) => {
                          const groupPerms = getGroupPermissions(group.id);
                          const selectionState = getGroupSelectionState(group.id);
                          const colors = getColorClasses(group.color);
                          const Icon = group.icon;
                          const isExpanded = expandedGroups.has(group.id);

                          if (groupPerms.length === 0) return null;

                          return (
                            <div key={group.id} className={`border rounded-lg ${colors.border} ${colors.bg} overflow-hidden transition-all duration-200`}>
                              {/* Group Header */}
                              <div
                                className="flex items-center p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => toggleGroup(group.id)}
                              >
                                {/* Selection Indicator */}
                                <div className="flex-shrink-0 mr-3">
                                  {selectionState === 'all' && (
                                    <div className="w-5 h-5 bg-gray-600 rounded flex items-center justify-center">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                  {selectionState === 'partial' && (
                                    <div className="w-5 h-5 bg-gray-400 rounded flex items-center justify-center">
                                      <Minus className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                  {selectionState === 'none' && (
                                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-500 rounded"></div>
                                  )}
                                </div>

                                {/* Icon */}
                                <Icon className={`w-6 h-6 ${colors.icon} mr-3 flex-shrink-0`} />

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h5 className={`font-medium ${colors.text} text-base truncate`}>{group.name}</h5>
                                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">{group.description}</p>
                                    </div>

                                    {/* Right side controls */}
                                    <div className="flex items-center ml-4 space-x-3">
                                      {/* Count badge */}
                                      <span className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 flex-shrink-0 border border-gray-200 dark:border-gray-600">
                                        {groupPerms.filter(p => formData.permissionIds.includes(p.id)).length}/{groupPerms.length}
                                      </span>

                                      {/* Quick action buttons */}
                                      <div className="flex items-center space-x-2">
                                        {selectionState !== 'all' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleGroupSelect(group.id, true);
                                            }} className="text-sm px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex-shrink-0"
                                            disabled={submitting}
                                            title={t('labels.selectAllTooltip')}
                                          >
                                            {t('labels.selectAll')}
                                          </button>
                                        )}
                                        {selectionState !== 'none' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleGroupSelect(group.id, false);
                                            }}
                                            className="text-sm px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex-shrink-0"
                                            disabled={submitting}
                                            title={t('labels.deselectAllTooltip')}
                                          >
                                            {t('labels.deselectAll')}
                                          </button>
                                        )}
                                      </div>

                                      {/* Expand/Collapse icon */}
                                      <div className="flex-shrink-0">
                                        {isExpanded ? (
                                          <ChevronDown className="w-5 h-5 text-gray-400" />
                                        ) : (
                                          <ChevronRight className="w-5 h-5 text-gray-400" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>                              {/* Group Permissions */}
                              {isExpanded && (
                                <div className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                                  <div className="p-4 space-y-3">
                                    {/* Sort permissions: access first, then others */}
                                    {groupPerms
                                      .sort((a, b) => {
                                        // Access permissions first
                                        if (a.code.endsWith('.access') && !b.code.endsWith('.access')) return -1;
                                        if (!a.code.endsWith('.access') && b.code.endsWith('.access')) return 1;
                                        return a.sortOrder - b.sortOrder;
                                      })
                                      .map((permission, index) => {
                                        const isAccessPermission = permission.code.endsWith('.access');
                                        const isFirstNonAccess = !isAccessPermission &&
                                          index > 0 &&
                                          groupPerms[index - 1]?.code.endsWith('.access');

                                        return (
                                          <div key={permission.id}>
                                            {/* Divider line between access and other permissions */}
                                            {isFirstNonAccess && (
                                              <div className="relative my-4">
                                                <div className="border-t border-gray-200 dark:border-gray-600"></div>                                                <div className="absolute left-4 -top-2 bg-white dark:bg-gray-800 px-2 text-xs text-gray-500 dark:text-gray-400">
                                                  {t('labels.dependentPermissions')}
                                                </div>
                                              </div>
                                            )}

                                            <div className={`flex items-start p-3 rounded-lg transition-colors group relative ${isAccessPermission
                                              ? 'bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                                              : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 ml-6'
                                              }`}>
                                              {/* Hierarchical connector for child permissions */}
                                              {!isAccessPermission && (
                                                <div className="absolute -left-6 top-1/2 w-6 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                                              )}

                                              <input
                                                type="checkbox"
                                                id={`permission-${permission.id}`}
                                                checked={formData.permissionIds.includes(permission.id)}
                                                onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
                                                disabled={submitting}
                                              />

                                              <label
                                                htmlFor={`permission-${permission.id}`}
                                                className="ml-3 flex-1 cursor-pointer min-w-0"
                                              >
                                                <div className="flex items-start justify-between">
                                                  <div className="flex-1 min-w-0">
                                                    <div className={`font-medium text-sm leading-relaxed ${isAccessPermission
                                                      ? 'text-gray-900 dark:text-white'
                                                      : 'text-gray-700 dark:text-gray-300'
                                                      }`}>
                                                      {permission.name}                                                      {isAccessPermission && (
                                                        <span className="ml-2 text-xs bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                                                          {t('labels.basicPermission')}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className={`text-xs font-mono mt-1.5 ${isAccessPermission
                                                      ? 'text-gray-600 dark:text-gray-400'
                                                      : 'text-gray-500 dark:text-gray-500'
                                                      }`}>
                                                      {permission.code}
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center space-x-2 ml-3">
                                                    {permission.context === 'system' && (
                                                      <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md flex-shrink-0">
                                                        {t('labels.system')}
                                                      </span>
                                                    )}
                                                    {isAccessPermission && (
                                                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md flex-shrink-0">
                                                        {t('labels.required')}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </label>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
              disabled={submitting}            >
              {t('labels.cancel')}
            </button>
            <button
              type="submit"
              form="create-role-form"
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={submitting || loading}
            >
              {submitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('messages.loading')}
                </div>
              ) : (
                t('actions.create')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRoleModal;
