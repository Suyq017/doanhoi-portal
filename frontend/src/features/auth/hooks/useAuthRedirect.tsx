import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * useAuthRedirect - Hook to handle authentication-based redirects
 */
export const useAuthRedirect = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Only redirect if auth check is complete
        if (!auth.isLoading) {
            // If user is on login page and is authenticated, redirect to intended page
            if (auth.isAuthenticated && location.pathname === '/login') {
                const from = location.state?.from?.pathname || '/';
                navigate(from, { replace: true });
            }

            // If user is not authenticated and not on public routes, redirect to login
            const publicRoutes = ['/login', '/auth/callback'];
            const isPublicRoute = publicRoutes.includes(location.pathname);

            if (!auth.isAuthenticated && !isPublicRoute) {
                navigate('/login', {
                    state: { from: location },
                    replace: true
                });
            }
        }
    }, [auth.isAuthenticated, auth.isLoading, location, navigate]);

    return {
        isRedirecting: auth.isLoading,
        isAuthenticated: auth.isAuthenticated,
    };
};

export default useAuthRedirect;
