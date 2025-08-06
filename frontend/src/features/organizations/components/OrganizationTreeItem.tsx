import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building, Users, ChevronRight, ChevronDown, Edit, Trash2, UserPlus, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Organization, OrganizationStats } from '../../../shared/types/organization';
import { getOrgTypeText, getOrgTypeColor } from '../utils/organizationUtils';
import { useAuth } from '../../auth/context/AuthContext';
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
    const { auth } = useAuth();
    const location = useLocation();
    const hasChildren = org.children && org.children.length > 0;
    const paddingLeft = level * 24;

    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);    // Helper function kiểm tra user có trong user_organization không
    const isUserInOrganization = (organizationId: string): boolean => {
        if (!auth.user?.organizations) {
            console.log(`❌ No user organizations found for org ${org.name}. User:`, {
                userId: auth.user?.id,
                email: auth.user?.email,
                hasOrganizations: !!auth.user?.organizations,
                organizationsCount: auth.user?.organizations?.length || 0
            });
            return false;
        }

        const isMember = auth.user.organizations.some(userOrg =>
            userOrg.organizationId === organizationId && userOrg.isActive
        );

        console.log(`👁️ Eye icon for ${org.name}: ${isMember ? 'SHOW' : 'HIDE'}`);
        return isMember;
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
    };

    const createDetailPath = (type: string, code?: string) => {
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

        // ĐIỀU KIỆN: User có trong user_organization của tổ chức này
        return isUserInOrganization(org.id);
    };

    // Create path to organization members page
    const createMembersPath = (type: string, code?: string) => {
        if (!code) return '#';
        return `/organizations/${type}/${code}/members`;
    };    // Determine if Users icon should be clickable 
    const shouldMakeUsersClickable = () => {
        return !!org.code; // Always show users icon if org has code, make it clickable
    };

    return (
        <div key={org.id}>
            <div
                className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                style={{ paddingLeft: paddingLeft + 16 }}
            >
                <div className="flex items-center flex-1">
                    {hasChildren ? (
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
                        <button
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            aria-label={t('common:actions.add_member')}
                            onClick={() => setIsAddMemberModalOpen(true)}
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                            className="p-1 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                            aria-label={t('common:actions.edit')}
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            aria-label={t('common:actions.delete')}
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
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