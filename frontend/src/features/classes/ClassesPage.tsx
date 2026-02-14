import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Eye, Edit, Trash2, Users, Upload, X } from 'lucide-react';
import type { Class } from '../../shared/types';
import {
  classService,
  Toast,
  useToast,
  Select,
  SelectOption,
  AddDropdownButton,
  DropdownOption,
  ImportModal,
  useImportConfig,
  ConditionalRender,
  createPermissionBasedDropdownOptions,
  ConfirmDialog,
} from '../../shared';
import { classColumns } from '../../shared/utils/importColumns';
// TODO: Import client-side processing functions when ImportModal supports them
// import { 
//   frontendParseClassFile, 
//   frontendValidateClassData, 
//   frontendSubmitClassImport 
// } from '../../shared/services/classImportService';
import { useClassPagePermissions } from './hooks/useClassPagePermissions';
import { useClassList } from '../../shared/hooks/useClassList';
import { useDepartmentListQuery } from '../../shared/hooks/queries/useDepartmentQueries'; // ✅ Use TanStack Query for departments
import CreateClassModal from './components/CreateClassModal';
import EditClassModal from './components/EditClassModal';
import ViewClassModal from './components/ViewClassModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';

// Feature flag for new class import system
// TODO: Set to true when ImportModal supports client-side processing (parseFile, validateClientData, submitClientData)
const USE_NEW_CLASS_IMPORT_SYSTEM = false; // Set to false to use old server-side processing

const ClassesPage: React.FC = () => {
  const { t } = useTranslation(['classes', 'common']);
  const { toasts, hideToast, showSuccess, showError } = useToast();

  // Permission hooks
  const permissions = useClassPagePermissions();

  // ===================================
  // REACT QUERY: Replace manual state management
  // ===================================
  const {
    // Data
    classes,
    total,
    loading,
    error: queryError,

    // Pagination
    currentPage,
    limit,
    totalPages,

    // Filters
    searchTerm,
    yearFilter,
    departmentFilter,
    statusFilter,

    // Actions
    setSearchTerm,
    setYearFilter,
    setDepartmentFilter,
    setStatusFilter,
    setCurrentPage,
    loadClasses,

    // CRUD Operations
    bulkDeleteClasses: bulkDeleteClassesMutation,
  } = useClassList({ initialLimit: 10 });

  const error = queryError || null;

  // State for multiple selection (for bulk actions)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // ===================================
  // DEPARTMENTS: Use TanStack Query cache
  // ===================================
  const { data: departmentsResponse } = useDepartmentListQuery({ limit: 1000 });
  const departments = departmentsResponse?.departments ?? [];

  // Helpers function for selection
  const isAllSelected = classes.length > 0 && selectedClassIds.length === classes.length;
  const isSomeSelected = selectedClassIds.length > 0;

  // Local state for modals
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  // Import configuration using custom hook
  const {
    importConfig,
    isImportModalOpen,
    openImportModal,
    closeImportModal
  } = useImportConfig({
    entityName: 'classes',

    // Entity service - use real service or dummy based on feature flag
    entityService: USE_NEW_CLASS_IMPORT_SYSTEM ? {
      // Dummy service for client-side processing (required by interface but not used)
      getTemplate: () => `${import.meta.env.VITE_BACKEND_API_URL || '/api'}/classes/template`,
      uploadImportFile: async () => ({ sessionId: 'dummy' } as any),
      validateImportData: async () => ({} as any),
      executeImport: async () => ({} as any),
      getImportStatus: async () => ({} as any),
    } : {
      // Real server-side service
      getTemplate: () => `${import.meta.env.VITE_BACKEND_API_URL || '/api'}/classes/template`,
      uploadImportFile: classService.uploadImportFile.bind(classService),
      validateImportData: classService.validateImportData.bind(classService),
      executeImport: classService.executeImport.bind(classService),
      getImportStatus: classService.getImportStatus.bind(classService),
    },

    columns: classColumns(t),
    templateFileName: t('classes:import.templateFile', { defaultValue: 'classes_template.xlsx' }),

    // Configuration
    processingMode: USE_NEW_CLASS_IMPORT_SYSTEM ? 'client' : 'server',
    maxFileSize: 10 * 1024 * 1024,
    acceptedFileTypes: ['.xlsx', '.xls'],

    onSuccess: (result: any) => {
      // Always refresh data after import (whether success or partial failure)
      loadClasses();

      // Show appropriate toast based on result
      if (result.success) {
        // All records imported successfully
        showSuccess(t('classes:import.importSuccess', { defaultValue: 'Import lớp học thành công!' }));
      } else if (result.importedCount > 0) {
        // Partial success - some imported, some failed
        showError(
          t('classes:import.importPartialSuccess', {
            defaultValue: `Import hoàn tất: ${result.importedCount} thành công, ${result.failedCount} thất bại`,
            imported: result.importedCount,
            failed: result.failedCount
          })
        );
      } else {
        // All failed
        showError(
          t('classes:import.importAllFailed', {
            defaultValue: `Import thất bại: ${result.failedCount} lớp không thể import`,
            failed: result.failedCount
          })
        );
      }
    },
    onError: (error: Error) => {
      console.error('Import error:', error);
      showError(t('classes:import.importError', { defaultValue: 'Có lỗi xảy ra khi import lớp học' }));
    }
  });

  // Select options
  const yearOptions: SelectOption[] = [
    { value: '', label: `${t('classes:fields.year')} - ${t('common:status.all')}` },
    ...Array.from({ length: 10 }, (_, i) => ({
      value: (2024 - i).toString(),
      label: (2024 - i).toString()
    }))
  ];

  const departmentOptions: SelectOption[] = [
    { value: '', label: `${t('classes:fields.department')} - ${t('common:status.all')}` },
    ...departments.map(dept => ({
      value: dept.id,
      label: dept.name
    }))
  ];

  const statusOptions: SelectOption[] = [
    { value: '', label: `${t('common:fields.status')} - ${t('common:status.all')}` },
    { value: 'true', label: t('common:status.active') },
    { value: 'false', label: t('common:status.inactive') },
  ];
  const addDropdownOptions: DropdownOption[] = createPermissionBasedDropdownOptions([
    {
      key: 'single',
      label: t('classes:addButton.single', { defaultValue: t('common:actions.create') }),
      icon: <Plus className="w-4 h-4" />,
      description: t('classes:addButton.singleDesc', { defaultValue: 'Tạo lớp mới bằng form' }),
      onClick: () => setShowCreateModal(true),
      requiredPermission: 'classes.create'
    },
    // Import classes from Excel option:
    {
      key: 'fromFile',
      label: t('classes:addButton.fromFile', { defaultValue: 'Import từ file Excel' }),
      icon: <Upload className="w-4 h-4" />,
      description: t('classes:addButton.fromFileDesc', { defaultValue: 'Import nhiều lớp từ file Excel' }),
      onClick: openImportModal,
      requiredPermission: 'classes.create'
    }
  ], (permission: string) => {
    switch (permission) {
      case 'classes.create':
        return permissions.canCreate;
      default:
        return false;
    }
  });

  // Reset selection when classes change
  useEffect(() => {
    setSelectedClassIds([]);
  }, [classes]);
  // Event handlers
  const handleEdit = (classItem: Class) => {
    setSelectedClass(classItem);
    setShowEditModal(true);
  };

  const handleView = (classItem: Class) => {
    setSelectedClass(classItem);
    setShowViewModal(true);
  };

  const handleDelete = (classItem: Class) => {
    setSelectedClass(classItem);
    setShowDeleteModal(true);
  };

  const handleCreateSuccess = async () => {
    try {
      setShowCreateModal(false);
      await loadClasses();
      showSuccess(t('common:messages.success.create'));
    } catch (error) {
      showError(t('common:messages.error.create'));
    }
  };

  const handleEditSuccess = async () => {
    try {
      setShowEditModal(false);
      setSelectedClass(null);
      await loadClasses();
      showSuccess(t('common:messages.success.update'));
    } catch (error) {
      showError(t('common:messages.error.update'));
    }
  };

  const handleDeleteSuccess = async () => {
    try {
      setShowDeleteModal(false);
      setSelectedClass(null);
      await loadClasses();
      showSuccess(t('common:messages.success.delete'));
    } catch (error) {
      showError(t('common:messages.error.delete'));
    }
  };
  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setShowDeleteModal(false);
    setSelectedClass(null);
  };

  // Removed: handleClearFilters - Filter button removed from UI

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(classes.map(cls => cls.id));
    }
  }, [isAllSelected, classes]);

  const handleSelectClass = useCallback((classId: string) => {
    setSelectedClassIds(prev => {
      if (prev.includes(classId)) {
        return prev.filter(id => id !== classId);
      } else {
        return [...prev, classId];
      }
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedClassIds([]);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedClassIds.length > 0) {
      setShowBulkDeleteModal(true);
    }
  }, [selectedClassIds]);

  const confirmBulkDelete = useCallback(async () => {
    try {
      await bulkDeleteClassesMutation(selectedClassIds);
      setSelectedClassIds([]);
      showSuccess(t('common:messages.success.bulkDelete', {
        count: selectedClassIds.length
      }));
      setShowBulkDeleteModal(false);
    } catch (error) {
      console.error('Error bulk deleting classes:', error);
      showError(t('common:messages.error.bulkDelete'));
      setShowBulkDeleteModal(false);
    }
  }, [selectedClassIds, showSuccess, showError, t, bulkDeleteClassesMutation]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('classes:title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('classes:subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('classes:title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('classes:subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="mb-4 text-xl text-red-500">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadClasses}
              className="px-4 py-2 mt-4 text-white rounded-lg bg-doan-600 hover:bg-doan-700"
            >
              {t('common:actions.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('classes:title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('classes:subtitle')}
          </p>
        </div>        <div className="mt-4 sm:mt-0">
          <ConditionalRender condition={permissions.canCreate || permissions.canImport}>
            <AddDropdownButton
              label={t('classes:addButton.dropdown', { defaultValue: t('common:actions.create') })}
              options={addDropdownOptions}
              loading={false}
            />
          </ConditionalRender>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder={t('classes:placeholders.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Year Filter */}
          <div>
            <Select
              options={yearOptions}
              value={yearFilter.toString()}
              onChange={(value) => setYearFilter(value === '' ? '' : Number(value))}
              className="w-full"
            />
          </div>

          {/* Department Filter */}
          <div>
            <Select
              options={departmentOptions}
              value={departmentFilter}
              onChange={setDepartmentFilter}
              className="w-full"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              options={statusOptions}
              value={statusFilter.toString()}
              onChange={(value) => setStatusFilter(value === '' ? '' : value === 'true')}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {isSomeSelected && (
        <div className="flex items-center justify-between px-6 py-3 border border-gray-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {t('common:actions.select')} ({selectedClassIds.length})
            </span>
            <button
              onClick={handleClearSelection}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkDelete}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/40"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t('common:actions.delete')} ({selectedClassIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Classes Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="w-12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  />
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('classes:fields.info')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('classes:fields.year')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('classes:fields.department')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('classes:fields.studentCount')}
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
              {classes.map((classItem) => (
                <tr
                  key={classItem.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedClassIds.includes(classItem.id)
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                    }`}
                >
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedClassIds.includes(classItem.id)}
                      onChange={() => handleSelectClass(classItem.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {classItem.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {classItem.year || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {classItem.department?.name || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Users className="w-4 h-4 mr-1" />
                      {classItem.students?.length || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${classItem.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                      }`}>
                      {classItem.isActive ? t('common:status.active') : t('common:status.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                    <ConditionalRender condition={permissions.showActionColumn}>
                      <div className="flex items-center space-x-2">
                        <ConditionalRender condition={permissions.canView}>
                          <button
                            onClick={() => handleView(classItem)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title={t('common:actions.view')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </ConditionalRender>
                        <ConditionalRender condition={permissions.canEdit}>
                          <button
                            onClick={() => handleEdit(classItem)}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                            title={t('common:actions.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </ConditionalRender>
                        <ConditionalRender condition={permissions.canDelete}>
                          <button
                            onClick={() => handleDelete(classItem)}
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
        {classes.length === 0 && !loading && (
          <div className="py-12 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              {!permissions.canView
                ? t('common:noPermissionToView', { entity: t('classes:entityName', { defaultValue: 'lớp học' }), defaultValue: `Bạn không có quyền xem danh sách ${t('classes:entityName', { defaultValue: 'lớp học' })}` })
                : !permissions.canCreate
                  ? t('common:noItemsContactAdmin', { entity: t('classes:entityName', { defaultValue: 'lớp học' }), defaultValue: `Không có ${t('classes:entityName', { defaultValue: 'lớp học' })} nào. Liên hệ quản trị viên để thêm ${t('classes:entityName', { defaultValue: 'lớp học' })}.` })
                  : t('common:noItemsCreateFirst', { entity: t('classes:entityName', { defaultValue: 'lớp học' }), defaultValue: `Không có ${t('classes:entityName', { defaultValue: 'lớp học' })} nào. Hãy tạo ${t('classes:entityName', { defaultValue: 'lớp học' })} đầu tiên.` })
              }
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between px-6 py-3 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('common:pagination.showing', {
              start: (currentPage - 1) * limit + 1,
              end: Math.min(currentPage * limit, total),
              total: total
            })}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common:pagination.previous')}
            </button>
            <span className="px-3 py-1 text-sm">
              {t('common:pagination.page', {
                current: currentPage,
                total: totalPages
              })}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common:pagination.next')}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateClassModal
          isOpen={showCreateModal}
          onClose={handleCloseModals}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showEditModal && selectedClass && (
        <EditClassModal
          isOpen={showEditModal}
          classData={selectedClass}
          onClose={handleCloseModals}
          onSuccess={handleEditSuccess}
        />
      )}

      {showViewModal && selectedClass && (
        <ViewClassModal
          isOpen={showViewModal}
          classData={selectedClass}
          onClose={handleCloseModals}
        />
      )}

      {showDeleteModal && selectedClass && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          classData={selectedClass}
          onClose={handleCloseModals}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBulkDeleteModal}
        title={t('common:messages.confirm.bulkDelete')}
        message={t('common:messages.confirm.deleteMultiple', { count: selectedClassIds.length })}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
      />

      {/* Import Modal */}
      {isImportModalOpen && (
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={closeImportModal}
          config={importConfig}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ClassesPage;
