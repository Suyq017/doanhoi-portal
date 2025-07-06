import { useState, useCallback, useEffect } from 'react';
import { Organization } from '../../../shared/types/organization';
import { organizationService } from '../../../shared/services/organizationService';

interface MemberStats {
    doanVienCount: number;
    hoiVienCount: number;
    bothMemberCount: number;
    nonMemberCount: number;
    totalMembers: number;
}

interface UseMemberStatsReturn {
    memberStats: MemberStats;
    loading: boolean;
    refreshMemberStats: () => void;
}

export const useMemberStats = (organization: Organization | null, shouldLoad: boolean = true): UseMemberStatsReturn => {
    const [memberStats, setMemberStats] = useState<MemberStats>({
        doanVienCount: 0,
        hoiVienCount: 0,
        bothMemberCount: 0,
        nonMemberCount: 0,
        totalMembers: 0,
    });
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const loadMemberStats = useCallback(async () => {
        if (!shouldLoad || !organization) return;

        try {
            setLoading(true);
            const members = await organizationService.getOrganizationMembers(organization.id);

            let doanVienCount = 0;
            let hoiVienCount = 0;
            let bothMemberCount = 0;
            let nonMemberCount = 0;

            members.forEach(member => {
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
                totalMembers: members.length,
            });
        } catch (err) {
            console.error('Error loading member stats:', err);
        } finally {
            setLoading(false);
        }
    }, [shouldLoad, organization]);

    const refreshMemberStats = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    useEffect(() => {
        loadMemberStats();
    }, [loadMemberStats, refreshKey]);

    return {
        memberStats,
        loading,
        refreshMemberStats
    };
};
