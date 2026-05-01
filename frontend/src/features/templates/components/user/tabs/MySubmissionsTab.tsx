import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, FileText, AlertCircle, Trash2, Clock, CheckCircle, XCircle, Loader, Edit, Search, Eye } from 'lucide-react';
import {
  getMySubmissions,
  downloadSubmissionFile,
  downloadFile,
  deleteSubmission,
} from '@/shared/services/template.service';
import type { TemplateSubmission, SubmissionStatus } from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import { ConfirmDialog, Pagination } from '@/shared/components';
import SubmissionPreviewModal from '../SubmissionPreviewModal';
import DocumentPreviewModal from '../DocumentPreviewModal';

interface MySubmissionsTabProps {
  onEdit?: (submission: TemplateSubmission) => void;
  showSuccess?: (message: string) => void;
  showError?: (message: string) => void;
}

const MySubmissionsTab: React.FC<MySubmissionsTabProps> = ({ onEdit, showSuccess: propsShowSuccess, showError: propsShowError }) => {
  const { t } = useTranslation(['templates', 'common']);
  const queryClient = useQueryClient();
  const { confirmDialog, showConfirm } = useToast();

  // Use toast handlers from props or fallback to no-op
  const showSuccess = propsShowSuccess || (() => { });
  const showError = propsShowError || (() => { });

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [previewSubmissionId, setPreviewSubmissionId] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<{ id: string; fileName: string } | null>(null);

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
      showSuccess(t('templates:messages.downloadSuccess'));
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || t('templates:messages.downloadError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubmission,
    onSuccess: () => {
      // Wait for ConfirmDialog backdrop to fully disappear (500ms for transition)
      setTimeout(() => {
        showSuccess(t('templates:messages.deleteSuccess'));
      }, 500);

      // Invalidate queries immediately - React Query will handle batching
      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || t('templates:messages.deleteError'));
    },
  });

  const handleDownload = (submissionId: string) => {
    downloadMutation.mutate(submissionId);
  };

  const handleDelete = async (submissionId: string, templateName: string) => {
    const confirmed = await showConfirm(
      t('templates:actions.delete'),
      t('templates:messages.deleteConfirm', { name: templateName })
    );
    if (confirmed) {
      deleteMutation.mutate(submissionId);
    }
  };

  const handlePreview = (submission: TemplateSubmission) => {
    if (submission.status === 'completed') {
      // Nếu đã hoàn thành, hiển thị modal xem trước document
      setDocumentPreview({
        id: submission.id,
        fileName: submission.outputFileName || 'document.docx'
      });
    } else {
      // Nếu chưa hoàn thành, hiển thị modal xem dữ liệu
      setPreviewSubmissionId(submission.id);
    }
  };

  const getStatusBadge = (status: SubmissionStatus) => {
    const config = {
      draft: {
        icon: Clock,
        label: t('templates:status.draft'),
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      },
      submitted: {
        icon: Loader,
        label: t('templates:status.processing'),
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      },
      completed: {
        icon: CheckCircle,
        label: t('templates:status.completed'),
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      },
      failed: {
        icon: XCircle,
        label: t('templates:status.failed'),
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400"></div>
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
              {t('templates:errors.loadingList')}
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-400">
              {error instanceof Error ? error.message : t('templates:errors.unknown')}
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
      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={documentPreview !== null}
        submissionId={documentPreview?.id || null}
        fileName={documentPreview?.fileName}
        onClose={() => setDocumentPreview(null)}
      />

      {/* Data Preview Modal */}
      <SubmissionPreviewModal
        isOpen={previewSubmissionId !== null}
        submissionId={previewSubmissionId}
        onClose={() => setPreviewSubmissionId(null)}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm || (() => { })}
        onCancel={confirmDialog.onCancel || (() => { })}
      />

      {/* Search Filter */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('templates:placeholders.searchTemplate')}
            className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {t('templates:messages.noSubmissions')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('templates:messages.noSubmissionsDesc')}
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
                    {t('templates:fields.updatedAt')}
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">{t('common:fields.actions')}</span>
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
                            {submission.template?.name || t('templates:errors.unknownTemplate')}
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
                      {(() => {
                        const date = new Date(submission.updatedAt);
                        // Add 7 hours manually for Vietnam timezone
                        date.setHours(date.getHours() + 7);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${hours}:${minutes}, ${day}/${month}/${year}`;
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Preview button - always show */}
                        <button
                          onClick={() => handlePreview(submission)}
                          disabled={submission.status === 'completed' ? false : false}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
                          title={submission.status === 'completed' ? t('templates:actions.previewDocument') : t('templates:actions.viewData')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {submission.status === 'completed' && (
                          <button
                            onClick={() => handleDownload(submission.id)}
                            disabled={downloadMutation.isPending}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-50"
                            title={t('templates:actions.download')}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {submission.status === 'completed' && (
                          <button
                            onClick={() => onEdit?.(submission)}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                            title={t('common:actions.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(submission.id, submission.template?.name || t('templates:title'))}
                          disabled={deleteMutation.isPending}
                          className="text-red-700 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                          title={t('templates:actions.delete')}
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
