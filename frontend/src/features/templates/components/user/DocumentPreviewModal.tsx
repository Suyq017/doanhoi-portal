import React, { useState, useEffect } from 'react';
import { X, Download, Loader, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { downloadSubmissionFile, downloadFile } from '@/shared/services/template.service';
import { apiClient } from '@/shared/services/apiClient';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  submissionId: string | null;
  fileName?: string;
  onClose: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  submissionId,
  fileName = 'document.docx',
  onClose,
}) => {
  const { t } = useTranslation(['templates', 'common']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && submissionId) {
      loadDocument();
    }

    return () => {
      // Cleanup blob URL
      if (viewerUrl && viewerUrl.startsWith('blob:')) {
        URL.revokeObjectURL(viewerUrl);
      }
    };
  }, [isOpen, submissionId]);

  const loadDocument = async () => {
    setIsLoading(true);
    setError(null);
    setViewerUrl('');

    try {
      // Download DOCX file for download button
      const fileBlob = await downloadSubmissionFile(submissionId!);
      setBlob(fileBlob);

      // Get public URL from backend using apiClient (auto handles auth)
      const data = await apiClient.get<{ url: string; fileName: string }>(
        `/submissions/${submissionId}/public-url`
      );

      const publicUrl = data.url;

      // Use Microsoft Office Online Viewer with public S3 URL
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;

      setViewerUrl(officeViewerUrl);

    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('templates:messages.downloadError'));
      console.error('Error loading document:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (blob) {
      downloadFile(blob, fileName);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
            <div className="flex items-center flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                {fileName}
              </h3>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleDownload}
                disabled={!blob}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('templates:actions.download')}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader className="h-12 w-12 text-doan-500 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
                  {t('templates:preview.loadingDocument')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Đang tải từ S3 và khởi động Office Viewer...
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full p-6">
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-6 max-w-md">
                  <div className="flex">
                    <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
                    <div className="ml-3">
                      <h3 className="text-base font-medium text-red-800 dark:text-red-300">
                        {t('templates:errors.loadingDocument')}
                      </h3>
                      <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !error && viewerUrl && (
              <iframe
                src={viewerUrl}
                className="w-full h-full border-0"
                title="Document Preview"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                loading="eager"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
