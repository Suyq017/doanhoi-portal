/**
 * DepartmentPageHeader - Page header component for departments
 */

import React from 'react';
import { UserPlus, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AddDropdownButton,
  ConditionalRender,
  createPermissionBasedDropdownOptions
} from '../../../shared';
import { useDepartmentPagePermissions } from '../hooks';

export interface DepartmentPageHeaderProps {
  loading?: boolean;
  onAddSingle: () => void;
  onAddFromFile: () => void;
}

export const DepartmentPageHeader: React.FC<DepartmentPageHeaderProps> = ({
  loading = false,
  onAddSingle,
  onAddFromFile,
}) => {
  const { t } = useTranslation(['departments', 'common']);
  const permissions = useDepartmentPagePermissions();

  const addDropdownOptions = createPermissionBasedDropdownOptions(
    [
      {
        key: 'single',
        label: t('departments:addButton.single'),
        icon: <UserPlus className="w-4 h-4" />,
        description: t('departments:addButton.singleDescription'),
        onClick: onAddSingle,
        requiredPermission: 'departments.create',
      },
      {
        key: 'fromFile',
        label: t('departments:addButton.fromFile'),
        icon: <Upload className="w-4 h-4" />,
        description: t('departments:addButton.fromFileDescription'),
        onClick: onAddFromFile,
        requiredPermission: 'departments.create',
      },
    ],
    (permission: string) => {
      switch (permission) {
        case 'departments.create':
          return permissions.canCreate;
        default:
          return false;
      }
    }
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('departments:title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('departments:subtitle')}
        </p>
      </div>
      <div className="mt-4 sm:mt-0">
        <ConditionalRender condition={permissions.canCreate || permissions.canImport}>
          <AddDropdownButton
            label={t('departments:addButton.dropdown')}
            options={addDropdownOptions}
            loading={loading}
          />
        </ConditionalRender>
      </div>
    </div>
  );
};

export default DepartmentPageHeader;
