/**
 * DashboardHeader - Page header component for dashboard
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

export interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, subtitle }) => {
  const { t } = useTranslation(['dashboard']);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {title || t('dashboard:title')}
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        {subtitle || t('dashboard:subtitle')}
      </p>
    </div>
  );
};

export default DashboardHeader;
