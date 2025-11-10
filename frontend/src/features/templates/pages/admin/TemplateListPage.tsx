import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertCircle, FileText, Settings } from 'lucide-react';
import { getAllTemplates, deleteTemplate } from '@/shared/services/template.service';
import type { Template, TemplateStatus } from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import { Toast, ConfirmDialog } from '@/shared/components';

const TemplateListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, confirmDialog, showSuccess, showError, showConfirm, hideToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['templates', statusFilter === 'all' ? undefined : statusFilter],
    queryFn: () => getAllTemplates(statusFilter === 'all' ? undefined : statusFilter),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      showSuccess('Xóa biểu mẫu thành công');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Xóa thất bại');
    },
  });

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm(
      'Xóa biểu mẫu',
      `Bạn có chắc chắn muốn xóa biểu mẫu "${name}"? Hành động này không thể hoàn tác.`
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: TemplateStatus) => {
    const config = {
      processing: {
        label: 'Đang xử lý',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      },
      active: {
        label: 'Hoạt động',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      },
      inactive: {
        label: 'Không hoạt động',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      },
      error: {
        label: 'Lỗi',
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => hideToast(toast.id)} />
      ))}
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

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quản lý biểu mẫu
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Quản lý tất cả biểu mẫu trong hệ thống
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/templates/upload')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tạo biểu mẫu mới
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-48 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="processing">Đang xử lý</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
              <option value="error">Lỗi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Lỗi khi tải danh sách biểu mẫu
                </h3>
                <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                  {error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && (!templates || templates.length === 0) && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Chưa có biểu mẫu nào
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Bắt đầu bằng cách tạo biểu mẫu mới
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/admin/templates/upload')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tạo biểu mẫu mới
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && templates && templates.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Tên biểu mẫu
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Trạng thái
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Số trường
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Ngày tạo
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {templates.map((template: Template) => (
                  <tr key={template.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
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
                      {template.fields?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(template.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => navigate(`/admin/templates/${template.id}/configure`)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Cấu hình biểu mẫu"
                      >
                        <Settings className="h-5 w-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id, template.name)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        title="Xóa"
                      >
                        <Trash2 className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateListPage;
