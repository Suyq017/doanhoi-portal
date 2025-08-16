import { useState, useCallback } from 'react';
import { Organization } from '../../../shared/types/organization';
import { organizationService } from '../../../shared/services/organizationService';
import { toggleExpanded } from '../utils/organizationUtils';

export const useOrganizationTree = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingChildrenIds, setLoadingChildrenIds] = useState<string[]>([]);
    const [childrenErrors, setChildrenErrors] = useState<Map<string, string>>(new Map());

    const fetchOrganizationTree = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const treeData = await organizationService.getOrganizationTree();

            // Thêm isExpanded=true cho level 1 (auto expand)
            const orgsWithExpanded = treeData.map(org => ({
                ...org,
                isExpanded: true,
                children: org.children?.map(child => ({
                    ...child,
                    isExpanded: false
                }))
            }));

            setOrganizations(orgsWithExpanded);
            return orgsWithExpanded;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAllLevel1Children = useCallback(async (orgs: Organization[]) => {
        // Lưu ID của tất cả các tổ chức Level 1 để hiển thị loading state
        const level1Ids = orgs.map(org => org.id);
        setLoadingChildrenIds(level1Ids);

        // Tạo một bản sao của childrenErrors để cập nhật
        const newChildrenErrors = new Map(childrenErrors);
        const fetchPromises: Promise<void>[] = [];

        for (const org of orgs) {
            const fetchPromise = (async () => {
                try {
                    const children = await organizationService.getOrganizationChildren(org.id); setOrganizations(prevOrgs => {
                        return prevOrgs.map(prevOrg => {
                            if (prevOrg.id === org.id) {
                                return {
                                    ...prevOrg,
                                    children: children.map(child => ({
                                        ...child,
                                        isExpanded: false
                                    }))
                                };
                            }
                            return prevOrg;
                        });
                    });

                    if (newChildrenErrors.has(org.id)) {
                        newChildrenErrors.delete(org.id);
                    }
                } catch (err) {
                    newChildrenErrors.set(org.id, err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu con');
                } finally {
                    setLoadingChildrenIds(prev => prev.filter(id => id !== org.id));
                }
            })();

            fetchPromises.push(fetchPromise);
        }

        await Promise.all(fetchPromises);
        setChildrenErrors(newChildrenErrors);
    }, [childrenErrors]);


    const fetchOrganizationDetail = useCallback(async (type: string, code: string) => {
        if (!type || !code) return null;

        setLoading(true);
        setError(null);

        try {
            const orgDetail = await organizationService.getOrganizationByTypeAndCode(type, code);

            const orgWithChildren = {
                ...orgDetail,
                isExpanded: true,

            };

            setOrganizations([orgWithChildren]);
            return orgWithChildren;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
            return null;
        } finally {
            setLoading(false);
        }
    }, [])

    const fetchOrganizationSubDetail = useCallback(async (
        childType: string,
        childCode: string
    ) => {
        if (!childType || !childCode) return null;

        setLoading(true);
        setError(null);

        try {
            // Gọi API lấy chi tiết tổ chức con theo type và code
            const orgDetail = await organizationService.getOrganizationByTypeAndCode(childType, childCode);

            const orgWithChildren = {
                ...orgDetail,
                isExpanded: true,

            };

            setOrganizations([orgWithChildren]);
            return orgWithChildren;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);


    const toggleOrgExpanded = useCallback((id: string) => {
        setOrganizations(prev => toggleExpanded(id, prev));
    }, []);

    return {
        organizations,
        loading,
        error,
        loadingChildrenIds,
        childrenErrors,
        fetchOrganizationTree,
        fetchAllLevel1Children,
        fetchOrganizationDetail,
        fetchOrganizationSubDetail,
        toggleOrgExpanded
    };
};