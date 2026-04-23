import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Users, UserCheck } from 'lucide-react';
import { organizationService } from '@/shared/services/organizationService';
import SearchableCombobox from '@/shared/components/SearchableCombobox';

interface Organization {
  id: string;
  name: string;
  type: string;
  code?: string;
  displayName: string;
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
  const { t } = useTranslation('memberSelector');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<OrganizationMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizationId || '');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const MEMBERS_PER_PAGE = 10;

  // Load organization and its children on mount if organizationId is provided
  useEffect(() => {
    if (organizationId) {
      loadCampaignOrganizations(organizationId);
      setSelectedOrgId(organizationId); // Set default selected org
    }
  }, [organizationId]);

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

  const loadCampaignOrganizations = async (campaignOrgId: string) => {
    try {
      setLoadingOrganizations(true);
      setError(null);

      // Load the campaign organization first
      const mainOrg = await organizationService.getOrganizationById(campaignOrgId);

      // Create list with parent organization first
      const allOrgs: Organization[] = [
        {
          id: mainOrg.id,
          name: mainOrg.name,
          type: mainOrg.type,
          code: mainOrg.code,
          displayName: `${mainOrg.name} (${t('rootOrganization')})` // Mark as root organization
        }
      ];

      // Recursively load all children organizations (level 2, 3, etc.)
      const loadAllChildren = async (parentId: string, level: number = 1): Promise<void> => {
        try {
          const children = await organizationService.getOrganizationChildren(parentId);

          if (children && children.length > 0) {
            for (const org of children) {
              // Add current level organization
              allOrgs.push({
                id: org.id,
                name: org.name,
                type: org.type,
                code: org.code,
                displayName: `${'└─'.repeat(level)} ${org.name}` // Tree-like display based on level
              });

              // Recursively load children of this organization
              await loadAllChildren(org.id, level + 1);
            }
          }
        } catch (err) {
          console.warn(`Failed to load children for organization ${parentId}:`, err);
        }
      };

      // Start loading from the main organization
      await loadAllChildren(mainOrg.id);

      setOrganizations(allOrgs);
    } catch (err) {
      console.error('Error loading organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organization');
      setOrganizations([]);
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const fetchOrganizationMembers = async (orgId: string, page: number = 1) => {
    try {
      setLoadingMembers(true);
      setError(null);

      const response = await organizationService.getOrganizationMembers(orgId, page, MEMBERS_PER_PAGE);
      const membersList = response.members.map((userOrg: any) => ({
        id: userOrg.user?.id || userOrg.id,
        familyName: userOrg.user?.familyName || userOrg.familyName,
        givenName: userOrg.user?.givenName || userOrg.givenName,
        email: userOrg.user?.email || userOrg.email,
        code: userOrg.user?.code || userOrg.code,
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

  return (
    <div className="space-y-6">
      {/* Organization Selector - Combo Box */}
      <div className="border rounded-lg dark:border-gray-700">
        <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{t('selectOrganization')}</h4>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {t('selectOrganizationDescription')}
          </p>
        </div>

        <div className="p-4">
          <SearchableCombobox
            value={selectedOrgId}
            onChange={handleOrganizationSelect}
            options={organizations.map(org => ({
              value: org.id,
              label: org.displayName
            }))}
            placeholder={t('selectOrganizationPlaceholder')}
            disabled={loadingOrganizations}
            className="w-full"
          />
          {loadingOrganizations && (
            <p className="mt-2 text-xs text-gray-500">{t('loadingOrganizations')}</p>
          )}
        </div>
      </div>

      {/* Member List */}
      {selectedOrgId && (
        <div className="border rounded-lg dark:border-gray-700">
          <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">{t('membersList')}</h4>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {totalMembers} {t('membersCount')}
              </span>
            </div>

            {/* Search */}
            <div className="relative mt-3">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 pl-10 pr-4 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {/* Select All */}
            {filteredMembers.length > 0 && (
              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={disabled}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {getSelectedCountInFiltered() === filteredMembers.length ? t('deselectAll') : t('selectAll')}
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {t('selected')}: {getSelectedCountInFiltered()}/{filteredMembers.length}
                </span>
              </div>
            )}
          </div>

          <div className="overflow-y-auto max-h-96">
            {loadingMembers ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-4 border-gray-200 dark:border-gray-600 border-t-doan-500 dark:border-t-doan-400 rounded-full animate-spin"></div>
                <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">{t('loadingMembers')}</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-sm text-red-600 dark:text-red-400">{t('error')}: {error}</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {searchTerm ? t('noMembersFound') : t('noMembersInOrganization')}
                </p>
              </div>
            ) : (
              filteredMembers.map(member => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:hover:bg-gray-700 ${disabled ? 'opacity-50 cursor-not-allowed' : ''
                      } ${isSelected ? 'bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800' : ''}`}
                    onClick={() => handleMemberToggle(member.id)}
                  >
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0 mr-3">
                        {isSelected ? (
                          <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded dark:border-gray-600"></div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.familyName} {member.givenName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {member.email} {member.code && `• ${member.code}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('page')} {currentPage} / {totalPages} • {t('totalMembers')} {totalMembers} {t('membersCount')}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || loadingMembers}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  ←
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || loadingMembers}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  →
                </button>
              </div>
            </div>
          )}

          {/* Selected Members Summary */}
          {selectedMemberIds.length > 0 && (
            <div className="px-4 py-3 border-t bg-blue-50 dark:bg-blue-900 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-900 dark:text-blue-200">
                  {t('selected')} {selectedMemberIds.length} {t('membersCount')}
                </div>
                <button
                  onClick={() => onMemberSelectionChange([])}
                  disabled={disabled}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('deselectAll')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberSelector;
