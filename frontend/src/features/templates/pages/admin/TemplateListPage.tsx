import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, FileText, Edit, Search, ChevronDown } from 'lucide-react';
import { getAllTemplates, deleteTemplate } from '@/shared/services/template.service';
import type { Template, TemplateStatus } from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Toast, ConfirmDialog, Pagination } from '@/shared/components';

const TemplateListPage: React.FC = () => {
  const { t } = useTranslation(['templates', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toasts, confirmDialog, showSuccess, showError, showConfirm, hideToast } = useToast();
  const { canManageTemplates } = usePermissions();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const toastShownRef = useRef(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Show toast from navigation state (after upload success or config save) - only once
  useEffect(() => {
    const state = location.state as any;
    if (state && !toastShownRef.current) {
      // Handle upload success toast
      if (state.showSuccessToast && state.message) {
        toastShownRef.current = true;
        showSuccess(state.message);
        window.history.replaceState({}, document.title);
      }
      // Handle config save success toast
      else if (state.successMessage) {
        toastShownRef.current = true;
        showSuccess(state.successMessage);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, showSuccess]);

  // Status options
  const statusOptions = [
    { value: 'all', label: t('templates:filter.all') },
    { value: 'active', label: t('templates:filter.active') },
    { value: 'inactive', label: t('templates:filter.inactive') },
    { value: 'processing', label: t('templates:filter.processing') },
    { value: 'error', label: t('templates:filter.error') },
  ];

  const getStatusLabel = (value: string) => {
    return statusOptions.find(opt => opt.value === value)?.label || value;
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setStatusDropdownOpen(false);
    setCurrentPage(1); // Reset to first page
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['templates', statusFilter, debouncedSearch, currentPage, limit],
    queryFn: () => getAllTemplates({ 
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: debouncedSearch || undefined,
      page: currentPage,
      limit 
    }),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache templates list
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] }); // Admin list
      queryClient.invalidateQueries({ queryKey: ['templates-active'] }); // User list
      showSuccess(t('templates:messages.deleteSuccess'));
    },
    onError: (error: any) => {
      // Backend returns error code, map to translation
      const errorMessage = error?.response?.data?.message;
      
      // Check if error is TEMPLATE_HAS_SUBMISSIONS
      if (errorMessage === 'TEMPLATE_HAS_SUBMISSIONS') {
        showError(t('templates:errors.templateHasSubmissions'));
      } else {
        showError(errorMessage || t('templates:messages.deleteError'));
      }
    },
  });

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm(
      t('templates:actions.delete'),
      t('templates:messages.deleteConfirm', { name })
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: TemplateStatus) => {
    const config = {
      processing: {
        label: t('templates:status.processing'),
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      },
      active: {
        label: t('templates:status.active'),
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      },
      inactive: {
        label: t('templates:status.inactive'),
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      },
      error: {
        label: t('templates:status.error'),
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      },
    };

    const { label, className } = config[status];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        onCancel={confirmDialog.onCancel || (() => {})}
      />

      {/* Toasts - Fixed position at top-right */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('templates:adminTitle')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('templates:adminSubtitle')}
          </p>
        </div>
        {canManageTemplates() && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => navigate('/admin/templates/upload')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('templates:createTemplate')}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="relative md:col-span-3">
            <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder={t('templates:placeholders.search')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              type="button"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-2 focus:ring-doan-500 focus:border-transparent transition-colors text-sm flex items-center justify-between"
            >
              <span>{getStatusLabel(statusFilter)}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {statusDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg dark:bg-gray-700 dark:border-gray-600">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleStatusChange(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none ${
                      statusFilter === option.value
                        ? 'bg-doan-50 text-doan-700 dark:bg-doan-900 dark:text-doan-300 font-medium'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Empty columns for grid layout */}
          <div></div>
          <div></div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t('templates:messages.loadingTemplates')}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-12 text-center">
            <div className="text-red-500 dark:text-red-400">
              {t('common:messages.error.load')}: {error instanceof Error ? error.message : t('common:messages.error.unknown')}
            </div>
          </div>
        )}

        {!isLoading && !error && (!data?.data || data.data.length === 0) && (
          <div className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {t('templates:messages.noTemplates')}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('templates:messages.noTemplatesDesc')}
            </p>
            {canManageTemplates() && (
              <div className="mt-6">
                <button
                  onClick={() => navigate('/admin/templates/upload')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-doan-500 hover:bg-doan-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('templates:createTemplate')}
                </button>
              </div>
            )}
          </div>
        )}

        {!isLoading && !error && data?.data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {t('templates:fields.name')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {t('templates:fields.status')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {t('templates:fields.fieldCount')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {t('templates:fields.createdAt')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {t('templates:fields.updatedAt')}
                    </th>
                    {canManageTemplates() && (
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common:fields.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {data.data.map((template: Template) => (
                    <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white break-words">
                              {template.name}
                            </div>
                            {template.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                {template.description}
                              </div>
                            )}
                            {template.errorMessage && (
                              <div className="text-sm text-red-600 dark:text-red-400">
                                {template.errorMessage}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(template.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {template.fieldsCount ?? template.fields?.length ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(template.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(template.updatedAt).toLocaleDateString('vi-VN')}
                      </td>
                      {canManageTemplates() && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => navigate(`/admin/templates/${template.id}/configure`)}
                              className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 rounded"
                              title={t('templates:actions.configure')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id, template.name)}
                              disabled={deleteMutation.isPending}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                              title={t('templates:actions.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={data.totalPages}
              total={data.total}
              limit={limit}
              onPageChange={setCurrentPage}
              showLimitSelector={true}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default TemplateListPage;
