import { useState, useCallback, useEffect } from 'react';
import { organizationService } from '../../../shared/services/organizationService';
import { Organization } from '../../../shared/types/organization';

interface MemberStats {
    doanVienCount: number;
    hoiVienCount: number;
    bothMemberCount: number;
    nonMemberCount: number;
    totalMembers: number;
}

interface UseMemberStatsCalculationResult {
    memberStats: MemberStats;
    loading: boolean;
    refresh: () => void;
}

/**
 * Hook to calculate member statistics for an organization
 * Fetches all members and calculates counts by membership status
 */
export const useMemberStatsCalculation = (
    organization: Organization | null,
    refreshKey: number = 0
): UseMemberStatsCalculationResult => {
    const [memberStats, setMemberStats] = useState<MemberStats>({
        doanVienCount: 0,
        hoiVienCount: 0,
        bothMemberCount: 0,
        nonMemberCount: 0,
        totalMembers: 0,
    });
    const [loading, setLoading] = useState(false);

    const calculateMemberStats = useCallback(async () => {
        if (!organization) {
            setMemberStats({
                doanVienCount: 0,
                hoiVienCount: 0,
                bothMemberCount: 0,
                nonMemberCount: 0,
                totalMembers: 0,
            });
            return;
        }

        try {
            setLoading(true);

            // Get first page to know total count
            const firstPageResponse = await organizationService.getOrganizationMembers(organization.id, 1, 10);
            const totalMembers = firstPageResponse.total;

            // If we have many members, we need to fetch all pages for accurate stats
            let allMembers = [...firstPageResponse.members];
            const totalPages = firstPageResponse.totalPages;

            // Fetch remaining pages if needed
            if (totalPages > 1) {
                const promises = [];
                for (let page = 2; page <= totalPages; page++) {
                    promises.push(organizationService.getOrganizationMembers(organization.id, page, 10));
                }
                const additionalResponses = await Promise.all(promises);
                additionalResponses.forEach(response => {
                    allMembers.push(...response.members);
                });
            }

            let doanVienCount = 0;
            let hoiVienCount = 0;
            let bothMemberCount = 0;
            let nonMemberCount = 0;

            allMembers.forEach(member => {
                const user = member.user;
                const isDoanVien = user.membershipStatus === 'doan_vien' || user.membershipStatus === 'both';
                const isHoiVien = user.membershipStatus === 'hoi_vien' || user.membershipStatus === 'both';

                if (user.membershipStatus === 'both') {
                    bothMemberCount++;
                } else if (isDoanVien) {
                    doanVienCount++;
                } else if (isHoiVien) {
                    hoiVienCount++;
                } else {
                    nonMemberCount++;
                }
            });

            setMemberStats({
                doanVienCount,
                hoiVienCount,
                bothMemberCount,
                nonMemberCount,
                totalMembers,
            });
        } catch (err) {
            console.error('Error loading member stats:', err);
            setMemberStats({
                doanVienCount: 0,
                hoiVienCount: 0,
                bothMemberCount: 0,
                nonMemberCount: 0,
                totalMembers: 0,
            });
        } finally {
            setLoading(false);
        }
    }, [organization]);

    // Load stats when organization or refreshKey changes
    useEffect(() => {
        calculateMemberStats();
    }, [calculateMemberStats, refreshKey]);

    const refresh = useCallback(() => {
        calculateMemberStats();
    }, [calculateMemberStats]);

    return {
        memberStats,
        loading,
        refresh
    };
};
