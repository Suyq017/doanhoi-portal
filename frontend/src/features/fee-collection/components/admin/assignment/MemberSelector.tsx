import React, { useState, useEffect } from 'react';
import { Search, Building, Users, ChevronDown, ChevronRight, UserCheck, User } from 'lucide-react';
import { useOrganizationTree } from '../../../../organizations/hooks/useOrganizationTree';
import { organizationService } from '@/shared/services/organizationService';

interface Organization {
  id: string;
  name: string;
  type: string;
  code?: string;
  description?: string;
  memberCount?: number;
  isExpanded?: boolean;
  children?: Organization[];
}

interface OrganizationMember {
  id: string;
  givenName: string;
  familyName: string;
  email?: string;
  code?: string;
  organization: {
    id: string;
    name: string;
  };
}

interface MemberSelectorProps {
  selectedMemberIds: string[];
  onMemberSelectionChange: (memberIds: string[]) => void;
  organizationId?: string; // Filter by specific organization
  disabled?: boolean;
}

const MemberSelector: React.FC<MemberSelectorProps> = ({
  selectedMemberIds,
  onMemberSelectionChange,
  organizationId,
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<OrganizationMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizationId || '');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const MEMBERS_PER_PAGE = 10;

  const {
    organizations,
    loading: loadingOrgs,
    error: orgError,
    fetchOrganizationTree,
    toggleOrgExpanded
  } = useOrganizationTree();

  useEffect(() => {
    fetchOrganizationTree();
  }, [fetchOrganizationTree]);

  useEffect(() => {
    if (selectedOrgId) {
      setCurrentPage(1); // Reset to first page when organization changes
      fetchOrganizationMembers(selectedOrgId, 1);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    // Search only works on current page members
    if (searchTerm.trim()) {
      const filtered = members.filter(member =>
        member.givenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.familyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [searchTerm, members]);

  const fetchOrganizationMembers = async (orgId: string, page: number = 1) => {
    try {
      setLoadingMembers(true);
      setError(null);

      const response = await organizationService.getOrganizationMembers(orgId, page, MEMBERS_PER_PAGE);
      const membersList = response.members.map(userOrg => ({
        id: userOrg.user.id,
        familyName: userOrg.user.familyName,
        givenName: userOrg.user.givenName,
        email: userOrg.user.email,
        code: userOrg.user.code,
        organization: {
          id: userOrg.organization?.id || orgId,
          name: userOrg.organization?.name || 'Unknown Organization'
        }
      }));
      
      setMembers(membersList);
      setTotalPages(response.totalPages);
      setTotalMembers(response.total);
      setCurrentPage(response.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
      setMembers([]);
      setTotalPages(1);
      setTotalMembers(0);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOrganizationSelect = (orgId: string) => {
    if (orgId !== selectedOrgId) {
      setSelectedOrgId(orgId);
      setSearchTerm(''); // Clear search when changing organization
      setCurrentPage(1); // Reset to first page
      setMembers([]); // Clear current members
      setFilteredMembers([]); // Clear filtered members
      setTotalPages(1);
      setTotalMembers(0);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && selectedOrgId && !loadingMembers) {
      setCurrentPage(newPage);
      fetchOrganizationMembers(selectedOrgId, newPage);
      setSearchTerm(''); // Clear search when changing page
    }
  };

  const handleMemberToggle = (memberId: string) => {
    if (disabled) return;

    const newSelection = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter(id => id !== memberId)
      : [...selectedMemberIds, memberId];

    onMemberSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (disabled) return;

    const allMemberIds = filteredMembers.map(member => member.id);
    const allSelected = allMemberIds.every(id => selectedMemberIds.includes(id));

    if (allSelected) {
      // Deselect all filtered members
      const newSelection = selectedMemberIds.filter(id => !allMemberIds.includes(id));
      onMemberSelectionChange(newSelection);
    } else {
      // Select all filtered members
      const newSelection = [...new Set([...selectedMemberIds, ...allMemberIds])];
      onMemberSelectionChange(newSelection);
    }
  };

  const getSelectedCountInFiltered = () => {
    return filteredMembers.filter(member => selectedMemberIds.includes(member.id)).length;
  };

  const renderOrganizationNode = (org: Organization, level: number = 0) => {
    const hasChildren = org.children && org.children.length > 0;
    const paddingLeft = level * 24;
    const isSelected = selectedOrgId === org.id;

    return (
      <div key={org.id}>
        <div
          className={`flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
            isSelected ? 'bg-blue-50 border-blue-200' : ''
          }`}
          style={{ paddingLeft: paddingLeft + 16 }}
          onClick={() => handleOrganizationSelect(org.id)}
        >
          <div className="flex items-center flex-1">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOrgExpanded(org.id);
                }}
                className="p-1 mr-2 rounded hover:bg-gray-200"
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

            <Building className="w-5 h-5 mr-3 text-gray-400" />

            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                  {org.name}
                </h3>
                {org.memberCount !== undefined && (
                  <span className="text-xs text-gray-500">
                    ({org.memberCount} thành viên)
                  </span>
                )}
              </div>
              {org.description && (
                <p className="mt-1 text-sm text-gray-500">{org.description}</p>
              )}
            </div>
          </div>
        </div>

        {org.isExpanded && org.children && (
          <div>
            {org.children.map(child => renderOrganizationNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Organization Tree */}
      <div className="border rounded-lg">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">Chọn Tổ Chức</h3>
          <p className="mt-1 text-xs text-gray-600">
            Chọn tổ chức để xem danh sách thành viên
          </p>
        </div>

        <div className="overflow-y-auto max-h-64">
          {loadingOrgs ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-b-2 border-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : orgError ? (
            <div className="p-4 text-sm text-red-600">
              Lỗi: {orgError}
            </div>
          ) : organizations.length === 0 ? (
            <div className="p-4 text-sm text-center text-gray-500">
              Không có tổ chức nào
            </div>
          ) : (
            organizations.map(org => renderOrganizationNode(org))
          )}
        </div>
      </div>

      {/* Member List */}
      {selectedOrgId && (
        <div className="border rounded-lg">
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Thành Viên</h3>
                <p className="mt-1 text-xs text-gray-600">
                  Chọn thành viên để phân công đóng phí
                </p>
              </div>
              {filteredMembers.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  disabled={disabled}
                  className={`text-sm px-3 py-1 rounded ${
                    disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {getSelectedCountInFiltered() === filteredMembers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative mt-3">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm thành viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-96">
            {loadingMembers ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-b-2 border-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-600">
                Lỗi: {error}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-500">
                  {searchTerm 
                    ? `Không tìm thấy thành viên nào trong trang ${currentPage}` 
                    : totalMembers > 0 
                      ? `Trang ${currentPage} không có thành viên nào`
                      : 'Tổ chức này chưa có thành viên'
                  }
                </p>
                {searchTerm && totalMembers > MEMBERS_PER_PAGE && (
                  <p className="mt-2 text-xs text-gray-400">
                    Thử tìm kiếm ở các trang khác hoặc xóa từ khóa tìm kiếm
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredMembers.map(member => {
                  const isSelected = selectedMemberIds.includes(member.id);
                  
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer ${
                        isSelected ? 'bg-blue-50' : ''
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleMemberToggle(member.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <UserCheck className="w-3 h-3 text-white" />}
                        </div>

                        <User className="w-8 h-8 text-gray-400" />

                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.givenName} {member.familyName}
                          </div>
                          <div className="space-x-2 text-xs text-gray-500">
                            {member.code && (
                              <span>• {member.code}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages && (
            <div className="px-4 py-3 border-t bg-gray-50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-gray-700">
                  Hiển thị {Math.min((currentPage - 1) * MEMBERS_PER_PAGE + 1, totalMembers)} - {Math.min(currentPage * MEMBERS_PER_PAGE, totalMembers)} 
                  {' '}trong tổng số {totalMembers} thành viên
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loadingMembers}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === 1 || loadingMembers
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    ← Trước
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loadingMembers}
                        className={`px-3 py-1 text-sm rounded ${
                          pageNum === currentPage
                            ? 'bg-blue-600 text-white'
                            : loadingMembers
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loadingMembers}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === totalPages || loadingMembers
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Sau →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selection Summary */}
          {selectedMemberIds.length > 0 && (
            <div className="px-4 py-3 border-t bg-blue-50">
              <div className="flex items-center justify-between text-sm">
                <div className="text-blue-900">
                  Đã chọn {getSelectedCountInFiltered()} / {filteredMembers.length} thành viên
                  {searchTerm ? ' (trong kết quả tìm kiếm)' : ` (trang ${currentPage})`}
                </div>
                <div className="text-blue-700">
                  Tổng đã chọn: {selectedMemberIds.length} thành viên
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberSelector;
