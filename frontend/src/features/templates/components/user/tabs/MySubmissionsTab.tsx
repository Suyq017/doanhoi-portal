import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, AlertCircle, Trash2, Clock, CheckCircle, XCircle, Loader, Edit, Search } from 'lucide-react';
import {
  getMySubmissions,
  downloadSubmissionFile,
  downloadFile,
  deleteSubmission,
} from '@/shared/services/template.service';
import type { TemplateSubmission, SubmissionStatus } from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import { Toast, ConfirmDialog, Pagination } from '@/shared/components';

interface MySubmissionsTabProps {
  onEdit?: (submission: TemplateSubmission) => void;
}

const MySubmissionsTab: React.FC<MySubmissionsTabProps> = ({ onEdit }) => {
  const queryClient = useQueryClient();
  const { toasts, confirmDialog, showSuccess, showError, hideToast, showConfirm } = useToast();
  
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to page 1 when search changes
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 1 when limit changes
  useEffect(() => {
    setPage(1);
  }, [limit]);

  const { data: allSubmissions, isLoading, error } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => getMySubmissions(),
    staleTime: 5 * 60 * 1000, // 5 minutes - cache data
  });

  // Client-side filtering and pagination
  const { filteredData, totalPages, total } = useMemo(() => {
    if (!allSubmissions) return { filteredData: [], totalPages: 0, total: 0 };
    
    // Filter by search
    const filtered = debouncedSearch
      ? allSubmissions.filter((submission) =>
          submission.template?.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      : allSubmissions;
    
    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filtered.slice(startIndex, endIndex);
    
    return { filteredData: paginatedData, totalPages, total };
  }, [allSubmissions, debouncedSearch, page, limit]);

  const downloadMutation = useMutation({
    mutationFn: downloadSubmissionFile,
    onSuccess: (blob, submissionId) => {
      const submission = allSubmissions?.find((s: TemplateSubmission) => s.id === submissionId);
      const filename = submission?.outputFileName || 'document.docx';
      downloadFile(blob, filename);
      showSuccess('Tải xuống thành công');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Tải xuống thất bại');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
      showSuccess('Xóa biểu mẫu thành công');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Xóa thất bại');
    },
  });

  const handleDownload = (submissionId: string) => {
    downloadMutation.mutate(submissionId);
  };

  const handleDelete = async (submissionId: string, templateName: string) => {
    const confirmed = await showConfirm(
      'Xóa biểu mẫu',
      `Bạn có chắc chắn muốn xóa biểu mẫu "${templateName}"? Hành động này không thể hoàn tác.`
    );
    if (confirmed) {
      deleteMutation.mutate(submissionId);
    }
  };

  const getStatusBadge = (status: SubmissionStatus) => {
    const config = {
      draft: {
        icon: Clock,
        label: 'Nháp',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      },
      submitted: {
        icon: Loader,
        label: 'Đang xử lý',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      },
      completed: {
        icon: CheckCircle,
        label: 'Hoàn thành',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      },
      failed: {
        icon: XCircle,
        label: 'Thất bại',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      },
    };

    const { icon: Icon, label, className } = config[status];

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      >
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!allSubmissions || allSubmissions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          Chưa có biểu mẫu nào
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Bạn chưa điền biểu mẫu nào
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirm Dialog */}
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
      <div className="fixed top-4 right-4 z-[99999] space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Search Filter */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm theo tên biểu mẫu..."
            className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Không tìm thấy biểu mẫu
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Thử tìm kiếm với từ khóa khác
          </p>
        </div>
      ) : (
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto max-w-full">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Biểu mẫu
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
                  Ngày tạo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Ngày gửi
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredData.map((submission: TemplateSubmission) => (
              <tr key={submission.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {submission.template?.name || 'Không rõ'}
                      </div>
                      {submission.errorMessage && (
                        <div className="text-sm text-red-600 dark:text-red-400">
                          {submission.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(submission.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(submission.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {submission.submittedAt
                    ? new Date(submission.submittedAt).toLocaleDateString('vi-VN')
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {submission.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(submission.id)}
                        disabled={downloadMutation.isPending}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 disabled:opacity-50"
                        title="Tải xuống"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    {submission.status === 'completed' && (
                      <button
                        onClick={() => onEdit?.(submission)}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(submission.id, submission.template?.name || 'biểu mẫu này')}
                      disabled={deleteMutation.isPending}
                      className="text-red-700 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 p-1 disabled:opacity-50"
                      title="Xóa"
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
        
        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          showLimitSelector={true}
        />
      </div>
      )}
    </div>
  );
};

export default MySubmissionsTab;
