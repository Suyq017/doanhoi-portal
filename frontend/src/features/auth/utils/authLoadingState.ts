/**
 * Shared loading state for auth components
 * This ensures that once any auth component has completed initial load,
 * all other auth components will skip the loading screen on subsequent navigations.
 */

// Global flag shared across all auth guard components
let hasInitiallyLoaded = false;

export const getHasInitiallyLoaded = (): boolean => hasInitiallyLoaded;

export const setHasInitiallyLoaded = (value: boolean): void => {
  hasInitiallyLoaded = value;
};
