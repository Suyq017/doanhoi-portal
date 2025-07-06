import { useState, useCallback } from 'react';
import { OrganizationStats as OrganizationStatsType } from '../../../shared/types/organization';
import { organizationService } from '../../../shared/services/organizationService';

const defaultStats: OrganizationStatsType = {
    doanStats: {
        total: 0,
        doanTruong: 0,
        doanCoSo: 0,
        chiDoan: 0,
        members: {
            total: 0,
            doanTruong: 0,
            doanCoSo: 0,
            chiDoan: 0
        }
    },
    hoiStats: {
        total: 0,
        hoiSinhVienTruong: 0,
        lienChiHoi: 0,
        chiHoi: 0,
        members: {
            total: 0,
            hoiSinhVienTruong: 0,
            lienChiHoi: 0,
            chiHoi: 0
        }
    },
    clbStats: {
        total: 0,
        clbTruong: 0,
        clbKhoa: 0,
        members: {
            total: 0,
            clbTruong: 0,
            clbKhoa: 0
        }
    },
    totalMembers: 0
};

export const useOrganizationStats = () => {
    const [stats, setStats] = useState<OrganizationStatsType>(defaultStats);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const statsDataRaw = await organizationService.getOrganizationStats();

            const statsData = {
                doanStats: {
                    total: statsDataRaw.doanStats?.total ?? 0,
                    doanTruong: statsDataRaw.doanStats?.doanTruong ?? 0,
                    doanCoSo: statsDataRaw.doanStats?.doanCoSo ?? 0,
                    chiDoan: statsDataRaw.doanStats?.chiDoan ?? 0,
                    members: {
                        total: statsDataRaw.doanStats?.members?.total ?? 0,
                        doanTruong: statsDataRaw.doanStats?.members?.doanTruong ?? 0,
                        doanCoSo: statsDataRaw.doanStats?.members?.doanCoSo ?? 0,
                        chiDoan: statsDataRaw.doanStats?.members?.chiDoan ?? 0
                    }
                },
                hoiStats: {
                    total: statsDataRaw.hoiStats?.total ?? 0,
                    hoiSinhVienTruong: statsDataRaw.hoiStats?.hoiSinhVienTruong ?? 0,
                    lienChiHoi: statsDataRaw.hoiStats?.lienChiHoi ?? 0,
                    chiHoi: statsDataRaw.hoiStats?.chiHoi ?? 0,
                    members: {
                        total: statsDataRaw.hoiStats?.members?.total ?? 0,
                        hoiSinhVienTruong: statsDataRaw.hoiStats?.members?.hoiSinhVienTruong ?? 0,
                        lienChiHoi: statsDataRaw.hoiStats?.members?.lienChiHoi ?? 0,
                        chiHoi: statsDataRaw.hoiStats?.members?.chiHoi ?? 0
                    }
                },
                clbStats: {
                    total: statsDataRaw.clbStats?.total ?? 0,
                    clbTruong: statsDataRaw.clbStats?.clbTruong ?? 0,
                    clbKhoa: statsDataRaw.clbStats?.clbKhoa ?? 0,
                    members: {
                        total: statsDataRaw.clbStats?.members?.total ?? 0,
                        clbTruong: statsDataRaw.clbStats?.members?.clbTruong ?? 0,
                        clbKhoa: statsDataRaw.clbStats?.members?.clbKhoa ?? 0
                    }
                },
                totalMembers: statsDataRaw.totalMembers ?? 0
            };

            setStats(statsData);
            return statsData;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu thống kê');
            return defaultStats;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        stats,
        loading,
        error,
        fetchStats
    };
};

