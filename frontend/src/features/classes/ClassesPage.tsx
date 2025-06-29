import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Eye, Edit, Trash2, Users, Upload } from 'lucide-react';
import { 
  Class, 
  ClassQueryParams, 
  classService,
  departmentService,
  Toast,
  useToast,
  Select,
  SelectOption,
  AddDropdownButton,
  DropdownOption,
  ImportModal,
  ImportModalConfig,
} from '../../shared';
import CreateClassModal from './components/CreateClassModal';
import EditClassModal from './components/EditClassModal';
import ViewClassModal from './components/ViewClassModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';

const ClassesPage: React.FC = () => {
  const { t } = useTranslation(['classes', 'common']);
  const { toasts, hideToast, showSuccess, showError } = useToast();
  
  // State management
  const [classes, setClasses] = useState<Class[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | ''>('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

  const addDropdownOptions: DropdownOption[] = [
    {
      key: 'single',
      label: t('classes:addButton.single', { defaultValue: t('common:actions.create') }),
      icon: <Plus className="w-4 h-4" />,
      description: t('classes:addButton.singleDesc', { defaultValue: 'Tạo lớp mới bằng form' }),
      onClick: () => setShowCreateModal(true)
    },
    // Import classes from Excel option:
    {
      key: 'fromFile',
      label: t('classes:addButton.fromFile', { defaultValue: 'Import từ file Excel' }),
      icon: <Upload className="w-4 h-4" />,
      description: t('classes:addButton.fromFileDesc', { defaultValue: 'Import nhiều lớp từ file Excel' }),
      onClick: () => {/* setShowImportModal(true) */}
    }
  ];

  // Load data
  useEffect(() => {
    loadClasses();
    loadDepartments();
  }, [currentPage, yearFilter, departmentFilter, statusFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        loadClasses();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: ClassQueryParams = {
        page: currentPage,
        limit,
        ...(searchTerm && { search: searchTerm }),
        ...(yearFilter && { year: Number(yearFilter) }),
        ...(departmentFilter && { departmentId: departmentFilter }),
        ...(statusFilter !== '' && { isActive: Boolean(statusFilter) }),
      };

      const response = await classService.getClasses(params);
      setClasses(response.classes);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:messages.error.load'));
      console.error('Error loading classes:', err);
      showError(t('common:messages.error.load'));
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentService.getDepartments({ limit: 1000 });
      setDepartments(response.departments);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  // Event handlers
  const handleCreate = () => {
    setShowCreateModal(true);
  };

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

  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setYearFilter('');
    setDepartmentFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

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
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-doan-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {t('common:states.loading')}
            </p>
          </div>
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
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadClasses}
              className="mt-4 px-4 py-2 bg-doan-600 text-white rounded-lg hover:bg-doan-700"
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
        </div>
        <div className="mt-4 sm:mt-0">
          <AddDropdownButton
            label={t('classes:addButton.dropdown', { defaultValue: t('common:actions.create') })}
            options={addDropdownOptions}
            loading={false}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('classes:placeholders.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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

          {/* Clear Filters */}
          <div>
            <button
              onClick={handleClearFilters}
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Filter className="w-5 h-5 mr-2" />
              {t('common:actions.filter')}
            </button>
          </div>
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('classes:fields.info')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('classes:fields.year')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('classes:fields.department')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('classes:fields.studentCount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common:fields.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common:fields.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {classes.map((classItem) => (
                <tr key={classItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      classItem.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    }`}>
                      {classItem.isActive ? t('common:status.active') : t('common:status.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleView(classItem)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title={t('common:actions.view')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(classItem)}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                        title={t('common:actions.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(classItem)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title={t('common:actions.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {classes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              {t('common:messages.empty.noResults')}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('common:pagination.showing', {
              start: (currentPage - 1) * limit + 1,
              end: Math.min(currentPage * limit, total),
              total: total
            })}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common:pagination.previous')}
            </button>
            <span className="px-3 py-1 text-sm">
              {t('common:pagination.page', {
                current: currentPage,
                total: Math.ceil(total / limit)
              })}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(Math.ceil(total / limit), prev + 1)
                )
              }
              disabled={currentPage >= Math.ceil(total / limit)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Toast Notifications */}
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
  );
};

export default ClassesPage;
