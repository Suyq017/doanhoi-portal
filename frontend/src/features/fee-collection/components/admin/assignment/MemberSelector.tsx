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
  username: string;
  fullName: string;
  email?: string;
  studentCode?: string;
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
      fetchOrganizationMembers(selectedOrgId);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = members.filter(member =>
        member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.studentCode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [searchTerm, members]);

  const fetchOrganizationMembers = async (orgId: string) => {
    try {
      setLoadingMembers(true);
      setError(null);

      const members = await organizationService.getOrganizationMembers(orgId);
      setMembers(members.map(userOrg => ({
        id: userOrg.user.id,
        username: userOrg.user.username,
        fullName: userOrg.user.fullName,
        email: userOrg.user.email,
        studentCode: userOrg.user.studentCode,
        organization: {
          id: userOrg.organization?.id || orgId,
          name: userOrg.organization?.name || 'Unknown Organization'
        }
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOrganizationSelect = (orgId: string) => {
    setSelectedOrgId(orgId);
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
                className="mr-2 p-1 hover:bg-gray-200 rounded"
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

            <Building className="w-5 h-5 text-gray-400 mr-3" />

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
                <p className="text-sm text-gray-500 mt-1">{org.description}</p>
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
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="text-sm font-medium text-gray-900">Chọn Tổ Chức</h3>
          <p className="text-xs text-gray-600 mt-1">
            Chọn tổ chức để xem danh sách thành viên
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {loadingOrgs ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : orgError ? (
            <div className="p-4 text-red-600 text-sm">
              Lỗi: {orgError}
            </div>
          ) : organizations.length === 0 ? (
            <div className="p-4 text-gray-500 text-sm text-center">
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
          <div className="bg-gray-50 px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Thành Viên</h3>
                <p className="text-xs text-gray-600 mt-1">
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
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm kiếm thành viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loadingMembers ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-red-600 text-sm">
                Lỗi: {error}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">
                  {searchTerm ? 'Không tìm thấy thành viên nào' : 'Tổ chức này chưa có thành viên'}
                </p>
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
                          <div className="font-medium text-gray-900 text-sm">
                            {member.fullName}
                          </div>
                          <div className="text-xs text-gray-500 space-x-2">
                            <span>@{member.username}</span>
                            {member.studentCode && (
                              <span>• {member.studentCode}</span>
                            )}
                            {member.email && (
                              <span>• {member.email}</span>
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

          {/* Selection Summary */}
          {selectedMemberIds.length > 0 && (
            <div className="bg-blue-50 border-t px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <div className="text-blue-900">
                  Đã chọn {getSelectedCountInFiltered()} / {filteredMembers.length} thành viên hiển thị
                </div>
                <div className="text-blue-700">
                  Tổng: {selectedMemberIds.length} thành viên
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
