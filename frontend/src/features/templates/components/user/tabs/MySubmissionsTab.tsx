import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, AlertCircle, Trash2, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import {
  getMySubmissions,
  downloadSubmissionFile,
  downloadFile,
  deleteSubmission,
} from '@/shared/services/template.service';
import type { TemplateSubmission, SubmissionStatus } from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import { Toast } from '@/shared/components';

const MySubmissionsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { toasts, showSuccess, showError, hideToast } = useToast();

  const { data: submissions, isLoading, error } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: () => getMySubmissions(),
  });

  const downloadMutation = useMutation({
    mutationFn: downloadSubmissionFile,
    onSuccess: (blob, submissionId) => {
      const submission = submissions?.find((s) => s.id === submissionId);
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
      showSuccess('Xóa nháp thành công');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Xóa thất bại');
    },
  });

  const handleDownload = (submissionId: string) => {
    downloadMutation.mutate(submissionId);
  };

  const handleDelete = (submissionId: string, status: SubmissionStatus) => {
    if (status !== 'draft') {
      showError('Chỉ có thể xóa bản nháp');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa bản nháp này?')) {
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

  if (!submissions || submissions.length === 0) {
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
    <div>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => hideToast(toast.id)} />
      ))}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
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
            {submissions.map((submission: TemplateSubmission) => (
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {submission.status === 'completed' && (
                    <button
                      onClick={() => handleDownload(submission.id)}
                      disabled={downloadMutation.isPending}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                    >
                      <Download className="h-5 w-5 inline" />
                    </button>
                  )}
                  {submission.status === 'draft' && (
                    <button
                      onClick={() => handleDelete(submission.id, submission.status)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      <Trash2 className="h-5 w-5 inline" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MySubmissionsTab;
