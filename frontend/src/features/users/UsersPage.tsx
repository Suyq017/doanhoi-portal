import React, { useState, useEffect } from "react";
import { Search, Filter, Edit, Trash2, Eye, Plus, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  userService,
  User as ApiUser,
  UserQueryParams,
  CreateUserRequest,
  Toast,
  useToast,
  Select,
  SelectOption,
  AddDropdownButton,
  DropdownOption,
} from "../../shared";
import CreateUserModal from "./components/CreateUserModal";
import ViewUserModal from "./components/ViewUserModal";
import EditUserModal from "./components/EditUserModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";

const Users: React.FC = () => {
  const { t } = useTranslation(['users', 'common']);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Toast
  const { toasts, hideToast, showSuccess, showError } = useToast();

  // User action states
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Select options
  const userTypeOptions: SelectOption[] = [
    { value: "all", label: t('users:types.all') },
    { value: "student", label: t('users:types.student') },
    { value: "staff", label: t('users:types.staff') },
  ];

  const membershipStatusOptions: SelectOption[] = [
    { value: "all", label: t('users:membershipStatus.all') },
    { value: "doan_vien", label: t('users:membershipStatus.doan_vien') },
    { value: "hoi_vien", label: t('users:membershipStatus.hoi_vien') },
    { value: "both", label: t('users:membershipStatus.both') },
    { value: "none", label: t('users:membershipStatus.none') },
  ];

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: UserQueryParams = {
        page: currentPage,
        limit: limit,
        ...(searchTerm && { search: searchTerm }),
        ...(filterType !== "all" && {
          userType: filterType as "student" | "staff",
        }),
        ...(filterStatus !== "all" && {
          membershipStatus: filterStatus as any,
        }),
      };

      const response = await userService.getUsers(params);
      setUsers(response.users);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:messages.error.load'));
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage, filterType, filterStatus]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        loadUsers();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleCreateUser = async (userData: CreateUserRequest) => {
    try {
      setIsCreatingUser(true);
      await userService.createUser(userData);
      // Reload users list after successful creation
      await loadUsers();
      showSuccess(t('common:messages.success.create'));
    } catch (error) {
      console.error("Error creating user:", error);
      showError(t('common:messages.error.create'));
      throw error; // Re-throw to let modal handle the error
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleViewUser = (user: ApiUser) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleEditUser = (user: ApiUser) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (userData: CreateUserRequest) => {
    if (!selectedUser) return;

    try {
      setIsUpdatingUser(true);
      await userService.updateUser(
        selectedUser.id,
        userData
      );
      await loadUsers();
      showSuccess(
        t('common:messages.success.update')
      );
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      showError(t('common:messages.error.update'));
      throw error;
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteUser = (user: ApiUser) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setIsDeletingUser(true);
      await userService.deleteUser(selectedUser.id);
      await loadUsers();
      showSuccess(t('common:messages.success.delete'));
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      showError(t('common:messages.error.delete'));
    } finally {
      setIsDeletingUser(false);
    }
  };

  const getUserTypeText = (type: string) => {
    return type === "student" ? t('users:types.student') : t('users:types.staff');
  };

  const getMembershipStatusText = (status: string) => {
    switch (status) {
      case "doan_vien":
        return t('users:membershipStatus.doan_vien');
      case "hoi_vien":
        return t('users:membershipStatus.hoi_vien');
      case "both":
        return t('users:membershipStatus.both');
      case "none":
        return t('users:membershipStatus.none');
      default:
        return status;
    }
  };

  const getMembershipStatusColor = (status: string) => {
    switch (status) {
      case "doan_vien":
        return "bg-doan-100 text-doan-800";
      case "hoi_vien":
        return "bg-hsv-100 text-hsv-800";
      case "both":
        return "bg-green-100 text-green-800";
      case "none":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredUsers = users; // Filtering is now done on server side

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('users:title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('users:subtitle')}
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
              {t('users:title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('users:subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadUsers}
              className="mt-4 px-4 py-2 bg-doan-600 text-white rounded-lg hover:bg-doan-700"
            >
              {t('common:actions.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const addDropdownOptions: DropdownOption[] = [
    {
      key: 'single',
      label: t('users:addButton.single', { defaultValue: t('common:actions.create') }),
      icon: <Plus className="w-4 h-4" />,
      description: t('users:addButton.singleDesc', { defaultValue: 'Tạo người dùng mới bằng form' }),
      onClick: () => setIsCreateModalOpen(true)
    },
    // Import users from Excel option:
    {
      key: 'fromFile',
      label: t('users:addButton.fromFile', { defaultValue: 'Import từ file Excel' }),
      icon: <Upload className="w-4 h-4" />,
      description: t('users:addButton.fromFileDesc', { defaultValue: 'Import nhiều người dùng từ file Excel' }),
      onClick: () => {/* setIsImportModalOpen(true) */}
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('users:title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('users:subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <AddDropdownButton
            label={t('users:addButton.dropdown', { defaultValue: t('common:actions.create') })}
            options={addDropdownOptions}
            loading={isCreatingUser}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('users:placeholders.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* User Type Filter */}
          <div>
            <Select
              options={userTypeOptions}
              value={filterType}
              onChange={setFilterType}
              className="w-full"
            />
          </div>

          {/* Membership Status Filter */}
          <div>
            <Select
              options={membershipStatusOptions}
              value={filterStatus}
              onChange={setFilterStatus}
              className="w-full"
            />
          </div>

          {/* Filter Button */}
          <div>
            <button className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <Filter className="w-5 h-5 mr-2" />
              {t('common:actions.filter')}
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('users:fields.info')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('users:fields.contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('users:fields.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common:fields.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('users:fields.created')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common:fields.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {`${user.familyName} ${user.givenName}`}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.code}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {user.email}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {getUserTypeText(user.userType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMembershipStatusColor(
                        user.membershipStatus
                      )}`}
                    >
                      {getMembershipStatusText(user.membershipStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title={t('users:actions.view')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                        title={t('users:actions.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title={t('users:actions.delete')}
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

        {filteredUsers.length === 0 && (
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

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
        loading={isCreatingUser}
      />

      {/* View User Modal */}
      <ViewUserModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        user={selectedUser}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateUser}
        user={selectedUser}
        loading={isUpdatingUser}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteUser}
        user={selectedUser}
        loading={isDeletingUser}
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

export default Users;
