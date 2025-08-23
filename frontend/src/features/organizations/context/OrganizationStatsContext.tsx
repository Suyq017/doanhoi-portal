import React, { createContext, useContext, ReactNode } from 'react';
import { OrganizationStats as OrganizationStatsType } from '../../../shared/types/organization';
import { useOrganizationStats } from '../hooks/useOrganizationStats';

interface OrganizationStatsContextValue {
    stats: OrganizationStatsType;
    loading: boolean;
    error: string | null;
    fetchStats: () => Promise<OrganizationStatsType>;
}

const OrganizationStatsContext = createContext<OrganizationStatsContextValue | undefined>(undefined);

export const OrganizationStatsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { stats, loading, error, fetchStats } = useOrganizationStats();
    return (
        <OrganizationStatsContext.Provider value={{ stats, loading, error, fetchStats }}>
            {children}
        </OrganizationStatsContext.Provider>
    );
}

export const useOrganizationStatsContext = () => {
    const context = useContext(OrganizationStatsContext);
    if (context === undefined) {
        throw new Error('useOrganizationStatsContext must be used within OrganizationStatsProvider');
    }
    return context;
};