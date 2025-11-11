import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLoadingScreen } from '../components/AuthLoadingScreen';

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

    // Show loading while checking authentication
    if (auth.isLoading) {
        return <AuthLoadingScreen />;
    }

    // Redirect to login if not authenticated
    if (!auth.isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default AuthGuard;
