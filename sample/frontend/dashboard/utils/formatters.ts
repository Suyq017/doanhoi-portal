/**
 * Format number with locale-specific thousand separators
 */
export const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
};

/**
 * Format large numbers with K, M suffixes
 */
export const formatCompactNumber = (num: number): string => {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
};

/**
 * Calculate percentage change between two numbers
 */
export const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) return '+100%';
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
};
