import { PaymentCampaignFilters } from '../../../features/fee-collection/types';

/**
 * ========================
 * PAYMENT CAMPAIGN QUERY KEYS
 * ========================
 * Hierarchical key structure for efficient cache management
 */

export const paymentCampaignKeys = {
    // Base key
    all: ['paymentCampaigns'] as const,

    // List queries (with filters)
    lists: () => [...paymentCampaignKeys.all, 'list'] as const,
    list: (filters?: PaymentCampaignFilters) =>
        [...paymentCampaignKeys.lists(), { ...filters }] as const,

    // Detail queries
    details: () => [...paymentCampaignKeys.all, 'detail'] as const,
    detail: (id: string) => [...paymentCampaignKeys.details(), id] as const,

    // Statistics queries
    stats: () => [...paymentCampaignKeys.all, 'stats'] as const,
    stat: (id: string) => [...paymentCampaignKeys.stats(), id] as const,

    // Accessible organizations
    accessibleOrgs: () => [...paymentCampaignKeys.all, 'accessible-orgs'] as const,

    // By organization
    byOrganization: (orgId: string) =>
        [...paymentCampaignKeys.all, 'organization', orgId] as const,
};

// Example keys generated:
// ['paymentCampaigns', 'list', { page: 1, limit: 10, status: 'ACTIVE' }]
// ['paymentCampaigns', 'detail', 'campaign-123']
// ['paymentCampaigns', 'stats', 'campaign-123']
// ['paymentCampaigns', 'accessible-orgs']
// ['paymentCampaigns', 'organization', 'org-456']
