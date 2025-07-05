import { useState, useEffect } from 'react';
import { organizationService } from '../../../shared/services/organizationService';

export interface OrganizationMemberStats {
    doanVienCount: number;
    hoiVienCount: number;
    bothMemberCount: number;
    nonMemberCount: number;
    totalMembers: number;
}

export const useOrganizationMemberStats = (organizationId?: string) => {
    const [memberStats, setMemberStats] = useState<OrganizationMemberStats>({
        doanVienCount: 0,
        hoiVienCount: 0,
        bothMemberCount: 0,
        nonMemberCount: 0,
        totalMembers: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!organizationId) return;

        const loadMemberStats = async () => {
            try {
                setLoading(true);
                setError(null);

                // Gọi API để lấy danh sách thành viên
                const members = await organizationService.getOrganizationMembers(organizationId);

                // Tính toán statistics
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
                const errorMessage = err instanceof Error ? err.message : 'Error loading member stats';
                setError(errorMessage);
                console.error('Error loading organization member stats:', err);
            } finally {
                setLoading(false);
            }
        };

        loadMemberStats();
    }, [organizationId]);

    return {
        memberStats,
        loading,
        error,
    };
};