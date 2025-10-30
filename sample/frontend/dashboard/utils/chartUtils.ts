/**
 * Utility functions for chart data processing
 */

/**
 * Filter chart data to exclude future dates
 * @param data - Array of data points with date field
 * @param dateField - Name of the date field (default: 'date')
 * @returns Filtered data excluding future dates
 */
export const filterFutureDates = <T extends Record<string, any>>(
    data: T[],
    dateField: keyof T = 'date'
): T[] => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today

    return data.filter(point => {
        const pointDate = new Date(point[dateField]);
        return pointDate <= today;
    });
};

/**
 * Filter chart data to exclude points with no valid data
 * @param data - Array of data points
 * @param dataFields - Fields to check for valid data (any field > 0)
 * @returns Filtered data with valid data points only
 */
export const filterEmptyDataPoints = <T extends Record<string, any>>(
    data: T[],
    dataFields: (keyof T)[]
): T[] => {
    return data.filter(point => {
        return dataFields.some(field => {
            const value = point[field];
            return typeof value === 'number' && value > 0;
        });
    });
};

/**
 * Combined filter for chart data
 * @param data - Array of data points
 * @param options - Filtering options
 */
export const filterChartData = <T extends Record<string, any>>(
    data: T[],
    options: {
        dateField?: keyof T;
        dataFields?: (keyof T)[];
        excludeFuture?: boolean;
        excludeEmpty?: boolean;
    } = {}
): T[] => {
    const {
        dateField = 'date',
        dataFields = [],
        excludeFuture = true,
        excludeEmpty = false
    } = options;

    let filteredData = [...data];

    // Filter future dates
    if (excludeFuture) {
        filteredData = filterFutureDates(filteredData, dateField);
    }

    // Filter empty data points
    if (excludeEmpty && dataFields.length > 0) {
        filteredData = filterEmptyDataPoints(filteredData, dataFields);
    }

    return filteredData;
};

/**
 * Sort data by date field
 * @param data - Array of data points
 * @param dateField - Name of the date field
 * @param order - Sort order ('asc' or 'desc')
 */
export const sortByDate = <T extends Record<string, any>>(
    data: T[],
    dateField: keyof T = 'date',
    order: 'asc' | 'desc' = 'asc'
): T[] => {
    return [...data].sort((a, b) => {
        const dateA = new Date(a[dateField]).getTime();
        const dateB = new Date(b[dateField]).getTime();
        return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
};
