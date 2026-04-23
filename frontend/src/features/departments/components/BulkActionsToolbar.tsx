/**
 * BulkActionsToolbar - Toolbar for bulk actions on selected items
 */

import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkDelete,
}) => {
  const { t } = useTranslation(['common']);

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between p-4 mb-4 border border-blue-200 rounded-lg bg-blue-50 dark:bg-gray-700 dark:border-gray-600">
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          {t('common:actions.select')} ({selectedCount})
        </span>
        <button
          onClick={onClearSelection}
          className="text-sm text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onBulkDelete}
          className="flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/40"
        >
          <X className="w-4 h-4 mr-1" />
          {t('common:actions.delete')}
        </button>
      </div>
    </div>
  );
};

export default BulkActionsToolbar;
