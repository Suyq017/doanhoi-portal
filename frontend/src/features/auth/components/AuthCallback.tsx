import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens, setUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple executions
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refresh_token');
        const error = searchParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          navigate('/?error=' + encodeURIComponent(error));
          return;
        }

        if (token && refreshToken) {
          // Set tokens first
          setTokens(token, refreshToken);
          
          // Get user profile
          const backendUrl = import.meta.env.VITE_BACKEND_API_URL;
          const response = await fetch(`${backendUrl}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            
            // Delay navigation to ensure state updates
            setTimeout(() => {
              navigate('/');
            }, 100);
          } else {
            throw new Error('Failed to get user profile');
          }
        } else {
          navigate('/?error=invalid_callback');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/?error=callback_failed');
      }
    };

    handleCallback();
  }, []); // Empty dependency array to run only once

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-b-2 rounded-full animate-spin border-doan-500"></div>
        <p className="text-gray-600 dark:text-gray-400">Đang xử lý đăng nhập...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
