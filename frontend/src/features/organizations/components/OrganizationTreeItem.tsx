import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building, Users, ChevronRight, ChevronDown, Edit, Trash2, UserPlus, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Organization, OrganizationStats } from '../../../shared/types/organization';
import { getOrgTypeText, getOrgTypeColor } from '../utils/organizationUtils';
import { useAuth } from '../../auth/context/AuthContext';
import { useOrganizationPagePermissions } from '../hooks/useOrganizationPagePermissions';
import { ORGANIZATION_PERMISSIONS } from '../../../shared/constants/permissions';
import AddMemberModal from './AddMemberModal';
import EditOrganizationModal from './EditOrganizationModal';
import DeleteOrganizationModal from './DeleteOrganizationModal';

interface OrganizationTreeItemProps {
    org: Organization;
    level?: number;
    stats: OrganizationStats;
    onToggleExpand: (id: string) => void;
    renderChildren?: (org: Organization, level: number) => React.ReactNode;
    parent?: {
        type?: string;
        code?: string;
    };
    onMemberAdded?: () => void;
    onOrganizationUpdated?: (updatedOrg: Organization) => void;
    onMemberAddError?: (error: string) => void;
    onOrganizationDeleted?: () => void;
    onDeleteError?: (error: string) => void;
    onOrganizationUpdatedError?: (error: string) => void;
}

const OrganizationTreeItem: React.FC<OrganizationTreeItemProps> = ({
    org,
    level = 0,
    onToggleExpand,
    renderChildren,
    parent,
    onMemberAdded,
    onMemberAddError,
    onOrganizationUpdated,
    onOrganizationDeleted,
    onDeleteError,
    onOrganizationUpdatedError
}) => {
    const { t } = useTranslation(['organizations', 'common']);
    const { auth, hasPermission } = useAuth();
    const permissions = useOrganizationPagePermissions();
    const location = useLocation();
    const hasChildren = org.hasChildren ?? (org.children && org.children.length > 0); // Ưu tiên hasChildren từ API
    const paddingLeft = level * 24; const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Helper function kiểm tra user có trong user_organization không
    const isUserInOrganization = (organizationId: string): boolean => {
        if (!auth.user?.organizations) {
            return false;
        }

        const isMember = auth.user.organizations.some(userOrg =>
            userOrg.organizationId === organizationId && userOrg.isActive
        );
        return isMember;
    };

    // Helper functions kiểm tra quyền hành động dựa trên role và organization context
    const canAddMember = (): boolean => {
        // Super admin có thể thêm member ở bất kỳ tổ chức nào
        if (permissions.isSuperAdmin) return true;

        // Kiểm tra quyền add member cho tổ chức cụ thể này
        return hasPermission(ORGANIZATION_PERMISSIONS.ADD_MEMBER, org.id);
    };

    const canEditOrganization = (): boolean => {
        // Super admin có thể edit bất kỳ tổ chức nào
        if (permissions.isSuperAdmin) return true;

        // Kiểm tra quyền edit cho tổ chức cụ thể này
        return hasPermission(ORGANIZATION_PERMISSIONS.UPDATE, org.id);
    };

    const canDeleteOrganization = (): boolean => {
        // Super admin có thể delete bất kỳ tổ chức nào
        if (permissions.isSuperAdmin) return true;

        // Kiểm tra quyền delete cho tổ chức cụ thể này
        return hasPermission(ORGANIZATION_PERMISSIONS.DELETE, org.id);
    };

    const canViewMembers = (): boolean => {
        // Super admin có thể xem members ở bất kỳ tổ chức nào
        if (permissions.isSuperAdmin) return true;

        // User có thể xem members nếu có quyền view_member_count cho tổ chức này
        return hasPermission(ORGANIZATION_PERMISSIONS.VIEW_MEMBER_COUNT, org.id);
    };


    const handleDeleteSuccess = () => {
        if (onOrganizationDeleted) {
            onOrganizationDeleted();
        }
    };

    const handleDeleteError = (error: string) => {
        if (onDeleteError) {
            onDeleteError(error);
        }
    };

    const handleAddMemberSuccess = () => {
        if (onMemberAdded) {
            onMemberAdded();
        }
    };

    const handleAddMemberError = (error: string) => {
        if (onMemberAddError) {
            onMemberAddError(error);
        }
    }

    const handleUpdateSuccess = (updatedOrg: Organization) => {
        // Gọi callback nếu được cung cấp
        if (onOrganizationUpdated) {
            onOrganizationUpdated(updatedOrg);
        }
    };

    const handleUpdateError = (error: string) => {

        if (onOrganizationUpdatedError) {
            onOrganizationUpdatedError(error);
        }
    }

    const getStatCount = () => {
        switch (org.type) {
            case 'doan_truong':
                return org.memberCount;
            case 'doan_co_so':
                return org.memberCount;
            case 'chi_doan':
                return org.memberCount;
            case 'hoi_sinh_vien_truong':
                return org.memberCount;
            case 'lien_chi_hoi':
                return org.memberCount;
            case 'chi_hoi':
                return org.memberCount;
            case 'clb_truong':
                return org.memberCount;
            case 'clb_khoa':
                return org.memberCount;
            default:
                return 0;
        }
    }; const isInDetailPage = location.pathname.split('/').length === 4; // /organizations/type/code
    const isInSubDetailPage = location.pathname.split('/').length === 6; // /organizations/parentType/parentCode/type/code

    // Check xem organization hiện tại có phải là parent organization trong URL không
    const isCurrentParentOrganization = () => {
        const segments = location.pathname.split('/');

        // Trường hợp detail page: /organizations/type/code
        if (isInDetailPage) {
            const urlType = segments[2];
            const urlCode = segments[3];
            return org.type === urlType && org.code === urlCode;
        }

        // Trường hợp subdetail page: /organizations/parentType/parentCode/type/code  
        if (isInSubDetailPage) {
            const parentType = segments[2];
            const parentCode = segments[3];
            return org.type === parentType && org.code === parentCode;
        }

        return false;
    }; const createDetailPath = (type: string, code?: string) => {
        if (!code) return '#';

        // Trường hợp 1: Đang ở trang chính, chuyển sang trang detail
        if (location.pathname === '/organizations') {
            return `/organizations/${type}/${code}`;
        }

        // Trường hợp 2: Đang ở trang detail, chuyển sang trang subdetail
        if (isInDetailPage && parent) {
            return `/organizations/${parent.type}/${parent.code}/${type}/${code}`;
        }

        // Trường hợp 3: Đang ở trang subdetail, chuyển sang trang khác
        if (isInSubDetailPage && level >= 2) {
            // Lấy thông tin từ URL hiện tại
            const segments = location.pathname.split('/');
            const currentParentType = segments[2];
            const currentParentCode = segments[3];

            return `/organizations/${currentParentType}/${currentParentCode}/${type}/${code}`;
        }

        // Mặc định
        return `/organizations/${type}/${code}`;
    }; const shouldShowDetailLink = () => {
        // Không hiển thị eye icon nếu organization này là parent organization trong trang hiện tại
        if (isCurrentParentOrganization()) {
            return false;
        }

        // 1. User là super admin (có thể xem tất cả tổ chức)
        if (permissions.isSuperAdmin) {
            return true;
        }

        // 2. User có quyền access_children CHỈ cho tổ chức này cụ thể
        if (hasPermission(ORGANIZATION_PERMISSIONS.ACCESS_CHILDREN, org.id)) {
            return true;
        }

        // 3. User có trong user_organization của tổ chức này (là thành viên)
        const isMember = isUserInOrganization(org.id);
        if (isMember) {
            return true;
        }

        // 4. User thường không được xem icon con mắt nếu không có quyền cụ thể cho tổ chức này
        return false;
    };

    // Create path to organization members page
    const createMembersPath = (type: string, code?: string) => {
        if (!code) return '#';
        return `/organizations/${type}/${code}/members`;
    };    // Determine if Users icon should be clickable 
    const shouldMakeUsersClickable = () => {
        return !!org.code && canViewMembers(); // Check both org code existence and permission
    };    // Helper function để tạo tooltip cho eye icon dựa trên lý do có quyền
    const getEyeIconTooltip = (): string => {
        if (permissions.isSuperAdmin) {
            return t('organizations:tooltips.eye_icon_super_admin', {
                defaultValue: 'Xem chi tiết tổ chức (Quyền Super Admin)'
            });
        }

        // Chỉ kiểm tra quyền access_children cho tổ chức cụ thể này
        if (hasPermission(ORGANIZATION_PERMISSIONS.ACCESS_CHILDREN, org.id)) {
            return t('organizations:tooltips.eye_icon_access_children_specific', {
                defaultValue: 'Xem chi tiết tổ chức (Quyền truy cập tổ chức này)'
            });
        }

        if (isUserInOrganization(org.id)) {
            return t('organizations:tooltips.eye_icon_member', {
                defaultValue: 'Xem chi tiết tổ chức (Bạn là thành viên)'
            });
        }

        return t('common:actions.view_details', { defaultValue: 'Xem chi tiết' });
    }; return (
        <div key={org.id}>
            <div
                className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                style={{ paddingLeft: paddingLeft + 16 }}
            >
                <div className="flex items-center flex-1">
                    {hasChildren && level === 0 ? (
                        <button
                            onClick={() => onToggleExpand(org.id)}
                            className="mr-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            aria-label={org.isExpanded ? t('common:actions.collapse') : t('common:actions.expand')}
                        >
                            {org.isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </button>
                    ) : (
                        <div className="w-6 mr-2" />
                    )}

                    <Building className="w-5 h-5 text-gray-400 mr-3" />                    <div className="flex-1">
                        <div className="flex items-center space-x-3">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                {org.name}
                            </h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getOrgTypeColor(org.type)}`}>
                                {getOrgTypeText(org.type)}
                            </span>
                            {/* Badge cho organizations mà user thuộc về */}
                            {isUserInOrganization(org.id) && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    <span className="mr-1">👤</span>
                                    {t('organizations:member_badge', { defaultValue: 'Thành viên' })}
                                </span>
                            )}
                        </div>
                        {org.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {org.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-4">                    {shouldShowDetailLink() && (
                    <Link
                        to={createDetailPath(org.type, org.code)}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        aria-label={t('common:actions.view_details')}
                        title={getEyeIconTooltip()}
                    >
                        <Eye className="w-4 h-4" />
                    </Link>
                )}

                    {/* Users count - clickable if no detail link, otherwise static */}
                    {shouldMakeUsersClickable() ? (
                        <Link
                            to={createMembersPath(org.type, org.code)}
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors"
                            aria-label={t('organizations:actions.view_members', { defaultValue: 'Xem danh sách thành viên' })}
                        >
                            <Users className="w-4 h-4 mr-1" />
                            {getStatCount()}
                        </Link>
                    ) : (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Users className="w-4 h-4 mr-1" />
                            {getStatCount()}
                        </div>
                    )}

                    <div className="flex items-center space-x-2">
                        {canAddMember() ? (
                            <button
                                className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                aria-label={t('common:actions.add_member')}
                                onClick={() => setIsAddMemberModalOpen(true)}
                                title={t('organizations:actions.add_member', { defaultValue: 'Thêm thành viên' })}
                            >
                                <UserPlus className="w-4 h-4" />
                            </button>
                        ) : (
                            <div
                                className="p-1 text-gray-400 cursor-not-allowed"
                                title={t('organizations:messages.no_permission_add_member', { defaultValue: 'Bạn không có quyền thêm thành viên' })}
                            >
                                <UserPlus className="w-4 h-4" />
                            </div>
                        )}
                        {canEditOrganization() ? (
                            <button
                                className="p-1 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                                aria-label={t('common:actions.edit')}
                                onClick={() => setIsEditModalOpen(true)}
                                title={t('organizations:actions.edit', { defaultValue: 'Chỉnh sửa tổ chức' })}
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                        ) : (
                            <div
                                className="p-1 text-gray-400 cursor-not-allowed"
                                title={t('organizations:messages.no_permission_edit', { defaultValue: 'Bạn không có quyền chỉnh sửa tổ chức' })}
                            >
                                <Edit className="w-4 h-4" />
                            </div>
                        )}
                        {canDeleteOrganization() ? (
                            <button
                                className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                aria-label={t('common:actions.delete')}
                                onClick={() => setIsDeleteModalOpen(true)}
                                title={t('organizations:actions.delete', { defaultValue: 'Xóa tổ chức' })}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <div
                                className="p-1 text-gray-400 cursor-not-allowed"
                                title={t('organizations:messages.no_permission_delete', { defaultValue: 'Bạn không có quyền xóa tổ chức' })}
                            >
                                <Trash2 className="w-4 h-4" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AddMemberModal
                isOpen={isAddMemberModalOpen}
                onClose={() => setIsAddMemberModalOpen(false)}
                organizationCode={org.code || ''}
                organizationType={org.type}
                organizationName={org.name}
                onSuccess={handleAddMemberSuccess}
                onError={handleAddMemberError}

            />
            <EditOrganizationModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                organization={org}
                onSuccess={handleUpdateSuccess}
                onError={handleUpdateError}
                loading={false}
            />

            <DeleteOrganizationModal
                isOpen={isDeleteModalOpen}
                organization={org}
                onClose={() => setIsDeleteModalOpen(false)}
                onSuccess={handleDeleteSuccess}
                onError={handleDeleteError}
            />



            {org.isExpanded && org.children && renderChildren && (
                <div>
                    {org.children.map(child => renderChildren(child, level + 1))}
                </div>
            )}
        </div>
    );
};

export default OrganizationTreeItem;