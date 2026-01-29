import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHasInitiallyLoaded, setHasInitiallyLoaded } from '../utils/authLoadingState';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { auth } = useAuth();
  const location = useLocation();

  // Track when initial load completes
  useEffect(() => {
    if (!auth.isLoading) {
      setHasInitiallyLoaded(true);
    }
  }, [auth.isLoading]);

  // Only show loading on initial load, not on subsequent navigations
  if (auth.isLoading && !getHasInitiallyLoaded()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-doan-600"></div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
