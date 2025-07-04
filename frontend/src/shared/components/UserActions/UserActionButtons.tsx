import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../shared';

interface UserActionButtonsProps {
  user: User;
  onView?: (user: User) => void;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
}

export const UserActionButtons: React.FC<UserActionButtonsProps> = ({
  user,
  onView,
  onEdit,
  onDelete,
  showView = true,
  showEdit = true,
  showDelete = true,
}) => {
  const { t } = useTranslation(['users']);

  return (
    <div className="flex items-center space-x-2">
      {showView && onView && (
        <button
          onClick={() => onView(user)}
          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          title={t('users:actions.view')}
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
      {showEdit && onEdit && (
        <button
          onClick={() => onEdit(user)}
          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
          title={t('users:actions.edit')}
        >
          <Edit className="w-4 h-4" />
        </button>
      )}
      {showDelete && onDelete && (
        <button
          onClick={() => onDelete(user)}
          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          title={t('users:actions.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};