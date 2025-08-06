import React, { useState, useEffect } from 'react';
import { Building, ChevronRight, ChevronDown, X } from 'lucide-react';
import { organizationService } from '@/shared/services/organizationService';
import { Organization as BaseOrganization } from '@/shared/types/organization';

interface Organization extends BaseOrganization {
  isExpanded?: boolean;
  children?: Organization[];
  hasChildren?: boolean;
  isLoadingChildren?: boolean;
}

interface OrganizationSelectorProps {
  selectedOrganizationId?: string;
  onOrganizationSelect: (organizationId: string, organizationName: string) => void;
  onClose: () => void;
  disabled?: boolean;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  selectedOrganizationId,
  onOrganizationSelect,
  onClose,
  disabled = false
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRootOrganizations();
  }, []);

  const loadRootOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use getOrganizationTree to get the hierarchical structure
      const orgTree = await organizationService.getOrganizationTree();
      
      // Convert the tree structure to match our Organization interface
      const convertToOrganization = (org: BaseOrganization): Organization => {
        return {
          ...org,
          isExpanded: false,
          children: [], // Don't load children initially
          hasChildren: org.type !== 'INDIVIDUAL', // Assume non-individual orgs might have children
          isLoadingChildren: false
        };
      };

      // Process root organizations from the tree
      const processedOrgs: Organization[] = orgTree.map(convertToOrganization);

      setOrganizations(processedOrgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationChildren = async (orgId: string) => {
    // Set loading state for this organization
    setOrganizations(prevOrgs => {
      const setLoadingState = (orgs: Organization[]): Organization[] => {
        return orgs.map(org => {
          if (org.id === orgId) {
            return { ...org, isLoadingChildren: true };
          } else if (org.children) {
            return { ...org, children: setLoadingState(org.children) };
          }
          return org;
        });
      };
      return setLoadingState(prevOrgs);
    });

    try {
      const children = await organizationService.getOrganizationChildren(orgId);
      
      // For each child, check if they have children too
      const childrenWithHasChildrenFlag = await Promise.allSettled(
        children.slice(0, 20).map(async (child: BaseOrganization) => {
          try {
            const grandChildren = await organizationService.getOrganizationChildren(child.id);
            return {
              ...child,
              isExpanded: false,
              children: [],
              hasChildren: grandChildren.length > 0,
              isLoadingChildren: false
            };
          } catch (err) {
            return {
              ...child,
              isExpanded: false,
              children: [],
              hasChildren: child.type !== 'INDIVIDUAL',
              isLoadingChildren: false
            };
          }
        })
      );

      const processedChildren: Organization[] = [];
      childrenWithHasChildrenFlag.forEach((result: any) => {
        if (result.status === 'fulfilled') {
          processedChildren.push(result.value);
        }
      });

      // For remaining children (if there are more than 20), assume they might have children
      const remainingChildren = children.slice(20).map((child: BaseOrganization) => ({
        ...child,
        isExpanded: false,
        children: [],
        hasChildren: child.type !== 'INDIVIDUAL',
        isLoadingChildren: false
      }));

      const allChildren = [...processedChildren, ...remainingChildren];
      
      setOrganizations(prevOrgs => {
        const updateOrgChildren = (orgs: Organization[]): Organization[] => {
          return orgs.map(org => {
            if (org.id === orgId) {
              return {
                ...org,
                children: allChildren,
                isExpanded: true,
                isLoadingChildren: false
              };
            } else if (org.children) {
              return { ...org, children: updateOrgChildren(org.children) };
            }
            return org;
          });
        };
        return updateOrgChildren(prevOrgs);
      });
    } catch (err) {
      console.error('Failed to load children for organization:', orgId, err);
      // Clear loading state on error
      setOrganizations(prevOrgs => {
        const clearLoadingState = (orgs: Organization[]): Organization[] => {
          return orgs.map(org => {
            if (org.id === orgId) {
              return { ...org, isLoadingChildren: false };
            } else if (org.children) {
              return { ...org, children: clearLoadingState(org.children) };
            }
            return org;
          });
        };
        return clearLoadingState(prevOrgs);
      });
    }
  };

  const toggleOrgExpanded = (orgId: string) => {
    setOrganizations(prevOrgs => {
      const toggleExpanded = (orgs: Organization[]): Organization[] => {
        return orgs.map(org => {
          if (org.id === orgId) {
            const shouldExpand = !org.isExpanded;
            // Load children if expanding and no children loaded yet
            if (shouldExpand && org.hasChildren && (!org.children || org.children.length === 0)) {
              // Load children asynchronously
              setTimeout(() => loadOrganizationChildren(orgId), 0);
            }
            return { ...org, isExpanded: shouldExpand };
          } else if (org.children && org.children.length > 0) {
            return { ...org, children: toggleExpanded(org.children) };
          }
          return org;
        });
      };
      return toggleExpanded(prevOrgs);
    });
  };

  const handleOrganizationSelect = (org: Organization) => {
    if (disabled) return;
    onOrganizationSelect(org.id, org.name);
    onClose();
  };

  const renderOrganizationNode = (org: Organization, level: number = 0) => {
    const hasChildren = org.hasChildren || (org.children && org.children.length > 0);
    const paddingLeft = level * 24;
    const isSelected = selectedOrganizationId === org.id;

    return (
      <div key={org.id}>
        <div
          className={`flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:hover:bg-gray-700 ${
            isSelected ? 'bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800' : ''
          }`}
          style={{ paddingLeft: paddingLeft + 16 }}
          onClick={() => handleOrganizationSelect(org)}
        >
          <div className="flex items-center flex-1">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOrgExpanded(org.id);
                }}
                className="p-1 mr-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                disabled={org.isLoadingChildren}
              >
                {org.isLoadingChildren ? (
                  <div className="w-4 h-4 border-2 border-gray-400 rounded-full border-t-transparent animate-spin" />
                ) : org.isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}

            <Building className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-300" />

            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {org.name}
              </div>
              {org.code && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {org.code}
                </div>
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="relative inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-bottom transition-all transform bg-white border rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-700 sm:align-middle">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Chọn Tổ Chức
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Organization Tree */}
          <div className="border rounded-lg dark:border-gray-700" style={{ maxHeight: '60vh', overflow: 'auto' }}>
            <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Danh Sách Tổ Chức</h4>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Chọn tổ chức để tạo đợt đóng phí
              </p>
            </div>

            <div className="overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin dark:border-blue-400"></div>
                  <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Đang tải tổ chức...</span>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="text-red-500 dark:text-red-400">
                    <Building className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">{error}</p>
                  </div>
                  <button
                    onClick={loadRootOrganizations}
                    className="px-3 py-1 mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Thử lại
                  </button>
                </div>
              ) : organizations.length === 0 ? (
                <div className="p-8 text-center">
                  <Building className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Không có tổ chức nào</p>
                </div>
              ) : (
                organizations.map(org => renderOrganizationNode(org))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSelector;
