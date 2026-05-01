/**
 * DepartmentTable - Table component for displaying department list
 */

import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConditionalRender } from '../../../shared';
import { Department } from '../../../shared/types/department';
import { useDepartmentPagePermissions } from '../hooks';

export interface DepartmentTableProps {
  departments: Department[];
  selectedIds: string[];
  isAllSelected: boolean;
  onSelectAll: () => void;
  onSelectDepartment: (id: string) => void;
  onView: (department: Department) => void;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
  loading?: boolean;
}

export const DepartmentTable: React.FC<DepartmentTableProps> = ({
  departments,
  selectedIds,
  isAllSelected,
  onSelectAll,
  onSelectDepartment,
  onView,
  onEdit,
  onDelete,
  loading = false,
}) => {
  const { t } = useTranslation(['departments', 'common']);
  const permissions = useDepartmentPagePermissions();

  return (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  aria-label="Select all departments"
                />
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                {t('departments:fields.name')}
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                {t('departments:fields.code')}
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                {t('departments:fields.description')}
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                {t('common:fields.status')}
              </th>
              <ConditionalRender condition={permissions.showActionColumn}>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('common:fields.actions')}
                </th>
              </ConditionalRender>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
            {departments.map((department) => (
              <tr
                key={department.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.includes(department.id)
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                  }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(department.id)}
                    onChange={() => onSelectDepartment(department.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-label={`Select ${department.name}`}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {department.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500 whitespace-nowrap dark:text-gray-400">
                  {department.code || '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs text-gray-500 truncate dark:text-gray-400">
                    {department.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${department.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {department.isActive
                      ? t('common:status.active')
                      : t('common:status.inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                  <ConditionalRender condition={permissions.showActionColumn}>
                    <div className="flex items-center space-x-2">
                      <ConditionalRender condition={permissions.canView}>
                        <button
                          onClick={() => onView(department)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title={t('common:actions.view')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </ConditionalRender>
                      <ConditionalRender condition={permissions.canEdit}>
                        <button
                          onClick={() => onEdit(department)}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                          title={t('common:actions.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </ConditionalRender>
                      <ConditionalRender condition={permissions.canDelete}>
                        <button
                          onClick={() => onDelete(department)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title={t('common:actions.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </ConditionalRender>
                    </div>
                  </ConditionalRender>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {departments.length === 0 && !loading && (
        <div className="py-12 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            {!permissions.canView
              ? t('common:noPermissionToView', {
                entity: t('departments:entityName', { defaultValue: 'đơn vị' }),
                defaultValue: `Bạn không có quyền xem danh sách ${t('departments:entityName', { defaultValue: 'đơn vị' })}`,
              })
              : !permissions.canCreate
                ? t('common:noItemsContactAdmin', {
                  entity: t('departments:entityName', { defaultValue: 'đơn vị' }),
                  defaultValue: `Không tìm thấy ${t('departments:entityName', { defaultValue: 'đơn vị' })} nào. Liên hệ quản trị viên để thêm ${t('departments:entityName', { defaultValue: 'đơn vị' })}.`,
                })
                : t('common:noItemsCreateFirst', {
                  entity: t('departments:entityName', { defaultValue: 'đơn vị' }),
                  defaultValue: `Không tìm thấy ${t('departments:entityName', { defaultValue: 'đơn vị' })} nào. Tạo ${t('departments:entityName', { defaultValue: 'đơn vị' })} đầu tiên.`,
                })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentTable;
