import { useMemo } from 'react';
import { Organization } from '../../../shared/types/organization';
import { countByType } from '../utils/organizationUtils';

export function useOrganizationSpecificStats(organizations: Organization[], stats: any) {
    return useMemo(() => {
        if (!organizations.length) return stats;

        const currentOrg = organizations[0];
        const orgType = currentOrg.type;
        const counts = countByType(currentOrg);

        if (orgType === 'doan_co_so') {
            return {
                ...stats,
                doanStats: { ...stats.doanStats, total: counts.doanCount },
                hoiStats: { ...stats.hoiStats, total: 0 },
                clbStats: { ...stats.clbStats, total: 0 },
                totalMembers: currentOrg.memberCount || 0
            };
        } else if (orgType === 'lien_chi_hoi') {
            return {
                ...stats,
                doanStats: { ...stats.doanStats, total: 0 },
                hoiStats: { ...stats.hoiStats, total: counts.hoiCount },
                clbStats: { ...stats.clbStats, total: counts.clbCount },
                totalMembers: currentOrg.memberCount || 0
            };
        }

        return {
            ...stats,
            doanStats: { ...stats.doanStats, total: counts.doanCount },
            hoiStats: { ...stats.hoiStats, total: counts.hoiCount },
            clbStats: { ...stats.clbStats, total: counts.clbCount },
            totalMembers: currentOrg.memberCount || 0
        };
    }, [organizations, stats]);
}
