import React, { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLoadingScreen } from '../components/AuthLoadingScreen';
import { getHasInitiallyLoaded, setHasInitiallyLoaded } from '../utils/authLoadingState';

interface AuthGuardProps {
    children: ReactNode;
}

/**
 * AuthGuard - Main authentication wrapper component
 * Protects routes by checking authentication status and redirecting to login if needed
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { auth } = useAuth();
    const location = useLocation();

    // Track when initial load completes
    useEffect(() => {
        if (!auth.isLoading) {
            setHasInitiallyLoaded(true);
        }
    }, [auth.isLoading]);

    // Show loading while checking authentication (only on initial load)
    if (auth.isLoading && !getHasInitiallyLoaded()) {
        return <AuthLoadingScreen />;
    }

    // Redirect to login if not authenticated
    if (!auth.isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default AuthGuard;
