import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Global defaults
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)

            // Error handling
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

            // Performance
            refetchOnWindowFocus: false, // Don't refetch on tab switch (can be annoying)
            refetchOnReconnect: true, // Refetch when internet reconnects
            refetchOnMount: true, // Refetch when component mounts if data is stale

            // Network mode
            networkMode: 'online', // Only fetch when online
        },
        mutations: {
            // Mutation defaults
            retry: 1,
            networkMode: 'online',
        },
    },
});

// Export separate configs for different data types
export const CACHE_CONFIG = {
    organizations: {
        tree: {
            staleTime: 5 * 60 * 1000, // 5 min
            gcTime: 30 * 60 * 1000, // 30 min
        },
        stats: {
            staleTime: 5 * 60 * 1000, // 5 min
            gcTime: 60 * 60 * 1000, // 1 hour
        },
    },
    users: {
        list: {
            staleTime: 3 * 60 * 1000, // 3 min
            gcTime: 10 * 60 * 1000, // 10 min
        },
        detail: {
            staleTime: 1 * 60 * 1000, // 1 min
            gcTime: 5 * 60 * 1000, // 5 min
        },
    },
} as const;
