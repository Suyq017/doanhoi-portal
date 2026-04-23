import { useTranslation } from 'react-i18next';

/**
 * Custom hook to get translated permission names
 * Maps permission codes to their translated display names
 */
export const usePermissionNameMapper = () => {
    const { t } = useTranslation('permissions');

    /**
     * Get the translated name for a permission code
     * @param code - The permission code (e.g., 'users.create', 'payment-campaigns.access')
     * @returns The translated permission name or the code as fallback
     */
    const getPermissionName = (code: string): string => {
        // Map permission code to translation key
        const translationKey = `permissions.definitions.${code}`;
        
        // Get translated name with fallback to the code itself
        const translatedName = t(translationKey);
        
        // If translation key is not found, t() returns the key itself
        // In that case, return the original code as fallback
        return translatedName === translationKey ? code : translatedName;
    };

    return { getPermissionName };
};

/**
 * Static function to map permission code to translation key
 * Useful for cases where you need the translation key without using the hook
 */
export const getPermissionTranslationKey = (code: string): string => {
    return `permissions.definitions.${code}`;
};

/**
 * Convert permission code to a more readable format for debugging
 * @param code - The permission code
 * @returns A formatted string for debugging
 */
export const formatPermissionCodeForDebug = (code: string): string => {
    return code.replace(/[.-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};
