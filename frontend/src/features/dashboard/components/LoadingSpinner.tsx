/**
 * LoadingSpinner - Reusable loading indicator component
 */

import React from 'react';

export interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  fullScreen = false,
  size = 'lg'
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }[size];

  const spinner = (
    <div className="text-center">
      <div className={`animate-spin rounded-full ${sizeClasses} border-b-2 border-doan-600 mx-auto`}></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
