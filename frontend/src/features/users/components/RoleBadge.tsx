import React from 'react';
import { Shield } from 'lucide-react';
import { Role } from '../../permissions/services/roleService';

interface RoleBadgeProps {
  role: Role;
  showPermissionCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  showPermissionCount = true,
  size = 'md',
  removable = false,
  onRemove
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className="flex items-center space-x-1">
      <span className={`inline-flex items-center rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ${sizeClasses[size]}`}>
        <Shield className={`mr-1 ${iconSizes[size]}`} />
        {role.displayName}
        {showPermissionCount && (
          <span className="ml-1 text-xs opacity-75">
            ({role.permissions?.length || 0})
          </span>
        )}
      </span>
      
      {role.isSystemRole && (
        <span className={`inline-flex items-center rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 ${sizeClasses.sm}`}>
          Hệ thống
        </span>
      )}
      
      <span className={`inline-flex rounded-full font-medium ${
        role.isActive 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      } ${sizeClasses.sm}`}>
        {role.isActive ? 'Hoạt động' : 'Không hoạt động'}
      </span>

      {removable && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          title="Gỡ vai trò"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default RoleBadge;
