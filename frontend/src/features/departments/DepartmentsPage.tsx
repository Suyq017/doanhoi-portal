import React, { useState, useEffect } from "react";
import { Search, Filter, Edit, Trash2, Eye, UserPlus, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  departmentService,
  Department as ApiDepartment,
  DepartmentQueryParams,
  CreateDepartmentRequest,
  Toast,
  useToast,
  Select,
  SelectOption,
  ImportModal,
  ImportModalConfig,
  AddDropdownButton,
  DropdownOption,
} from "../../shared";
import CreateDepartmentModal from "./components/CreateDepartmentModal";
import ViewDepartmentModal from "./components/ViewDepartmentModal";
import EditDepartmentModal from "./components/EditDepartmentModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";

const Departments: React.FC = () => {
  const { t } = useTranslation(['departments', 'common']);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Toast
  const { toasts, hideToast, showSuccess, showError } = useToast();

  // Department action states
  const [selectedDepartment, setSelectedDepartment] = useState<ApiDepartment | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUpdatingDepartment, setIsUpdatingDepartment] = useState(false);
  const [isDeletingDepartment, setIsDeletingDepartment] = useState(false);

  // Select options
  const statusOptions: SelectOption[] = [
    { value: "all", label: t('common:status.all') },
    { value: "true", label: t('common:status.active') },
    { value: "false", label: t('common:status.inactive') },
  ];

  // Dropdown options for add button
  const addDropdownOptions: DropdownOption[] = [
    {
      key: 'single',
      label: t('departments:addButton.single'),
      icon: <UserPlus className="w-4 h-4" />,
      description: 'Tạo đơn vị mới bằng form',
      onClick: () => setIsCreateModalOpen(true)
    },
    {
      key: 'fromFile',
      label: t('departments:addButton.fromFile'), 
      icon: <Upload className="w-4 h-4" />,
      description: 'Import nhiều đơn vị từ file Excel',
      onClick: () => setIsImportModalOpen(true)
    }
  ];

  // Import configuration
  const importConfig: ImportModalConfig<any> = {
    templateUrl: `${import.meta.env.VITE_BACKEND_API_URL}/departments/template`,
    templateFileName: t('departments:import.templateFile'),
    acceptedFileTypes: ['.xlsx'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    parseFile: departmentService.parseFile.bind(departmentService),
    validateData: departmentService.validateData.bind(departmentService),
    importData: departmentService.importData.bind(departmentService),
    columns: [
      { key: 'name', label: t('departments:fields.name'), required: true, type: 'text' },
      { key: 'code', label: t('departments:fields.code'), required: false, type: 'text' },
      { key: 'description', label: t('departments:fields.description'), required: false, type: 'text' },
      { key: 'isActive', label: t('departments:fields.isActive'), required: false, type: 'boolean' },
    ],
    entityName: 'departments',
    onSuccess: () => {
      loadDepartments();
      setIsImportModalOpen(false);
    },
    onError: (error) => {
      console.error('Import error:', error);
      showError(t('departments:import.error'));
    }
  };

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: DepartmentQueryParams = {
        page: currentPage,
        limit: limit,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== "all" && {
          isActive: filterStatus === "true",
        }),
      };

      const response = await departmentService.getDepartments(params);
      setDepartments(response.departments);
      setTotal(response.total);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('common:messages.error.load'));
      console.error("Error loading departments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [currentPage, filterStatus]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        loadDepartments();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleCreateDepartment = async (departmentData: CreateDepartmentRequest) => {
    try {
      setIsCreatingDepartment(true);
      await departmentService.createDepartment(departmentData);
      // Reload departments list after successful creation
      await loadDepartments();
      showSuccess(t('common:messages.success.create'));
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating department:", error);
      showError(t('common:messages.error.create'));
      throw error; // Re-throw to let modal handle the error
    } finally {
      setIsCreatingDepartment(false);
    }
  };

  const handleViewDepartment = async (department: ApiDepartment) => {
    try {
      const fullDepartment = await departmentService.getDepartmentById(department.id);
      setSelectedDepartment(fullDepartment);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error("Error loading department details:", error);
      showError(t('common:messages.error.load'));
    }
  };

  const handleEditDepartment = async (department: ApiDepartment) => {
    try {
      const fullDepartment = await departmentService.getDepartmentById(department.id);
      setSelectedDepartment(fullDepartment);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error("Error loading department details:", error);
      showError(t('common:messages.error.load'));
    }
  };

  const handleUpdateDepartment = async (departmentData: CreateDepartmentRequest) => {
    if (!selectedDepartment) return;

    try {
      setIsUpdatingDepartment(true);
      await departmentService.updateDepartment(selectedDepartment.id, departmentData);
      await loadDepartments();
      showSuccess(
        t('common:messages.success.update')
      );
      setIsEditModalOpen(false);
      setSelectedDepartment(null);
    } catch (error) {
      console.error("Error updating department:", error);
      showError(t('common:messages.error.update'));
      throw error;
    } finally {
      setIsUpdatingDepartment(false);
    }
  };

  const handleDeleteDepartment = (department: ApiDepartment) => {
    setSelectedDepartment(department);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      setIsDeletingDepartment(true);
      await departmentService.deleteDepartment(selectedDepartment.id);
      await loadDepartments();
      showSuccess(t('common:messages.success.delete'));
      setIsDeleteModalOpen(false);
      setSelectedDepartment(null);
    } catch (error) {
      console.error("Error deleting department:", error);
      showError(t('common:messages.error.delete'));
    } finally {
      setIsDeletingDepartment(false);
    }
  };

  const filteredDepartments = departments; // Filtering is now done on server side

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('departments:title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('departments:subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
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
              {t('departments:title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('departments:subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="mb-4 text-xl text-red-500">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadDepartments}
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
            {t('departments:title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('departments:subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <AddDropdownButton 
            label={t('departments:addButton.dropdown')}
            options={addDropdownOptions}
            loading={isCreatingDepartment}
          />
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
              placeholder={t('departments:placeholders.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              options={statusOptions}
              value={filterStatus}
              onChange={setFilterStatus}
              className="w-full"
            />
          </div>

          {/* Empty column for consistency */}
          <div></div>

          {/* Filter Button */}
          <div>
            <button className="flex items-center justify-center w-full px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
              <Filter className="w-5 h-5 mr-2" />
              {t('common:actions.filter')}
            </button>
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
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
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('common:fields.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {filteredDepartments.map((department) => (
                  <tr key={department.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{department.name}</div>
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
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          department.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {department.isActive ? t('common:status.active') : t('common:status.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDepartment(department)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title={t('common:actions.view')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditDepartment(department)}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                          title={t('common:actions.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(department)}
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

        {filteredDepartments.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              {t('common:messages.empty.noResults')}
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
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="px-3 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common:pagination.next')}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateDepartmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateDepartment}
        loading={isCreatingDepartment}
      />

      {selectedDepartment && (
        <>
          <ViewDepartmentModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedDepartment(null);
            }}
            department={selectedDepartment}
          />

          <EditDepartmentModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedDepartment(null);
            }}
            onSubmit={handleUpdateDepartment}
            department={selectedDepartment}
            loading={isUpdatingDepartment}
          />

          <DeleteConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedDepartment(null);
            }}
            onConfirm={confirmDeleteDepartment}
            departmentName={selectedDepartment.name}
            loading={isDeletingDepartment}
          />
        </>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        config={importConfig}
      />

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

export default Departments;
