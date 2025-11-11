import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, ArrowLeft, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { uploadTemplate, parseTemplateFile } from '@/shared/services/template.service';
import { useToast } from '@/shared/hooks/useToast';
import { Toast } from '@/shared/components';

const TemplateUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, showError, hideToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<'upload' | 'info'>('upload'); // Step control
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (data: { file: File; name: string; description?: string }) =>
      uploadTemplate(data.file, { name: data.name, description: data.description }),
    onSuccess: () => {
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      
      // Navigate back immediately with success message
      navigate('/admin/templates', { 
        state: { 
          showSuccessToast: true, 
          message: 'Tải lên biểu mẫu thành công! Vui lòng cấu hình để kích hoạt.' 
        },
        replace: true // Use replace to avoid back button showing upload page
      });
    },
    onError: (error: any) => {
      // Show error toast on current page
      showError(error?.response?.data?.message || 'Tải lên thất bại');
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileChange(files[0]);
    }
  };

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.docx')) {
      showError('Chỉ chấp nhận file .docx');
      return;
    }
    setFile(selectedFile);
    
    // Parse file to detect fields
    setIsParsing(true);
    parseTemplateFile(selectedFile)
      .then((result) => {
        setDetectedFields(result.placeholders || []);
        setIsParsing(false);
        setStep('info'); // Move to info step after file selected and parsed
      })
      .catch((error) => {
        console.error('Parse error:', error);
        setDetectedFields([]);
        setIsParsing(false);
        // Still move to info step even if parse fails
        setStep('info');
      });
  };

  const handleCancelFile = () => {
    setFile(null);
    setName('');
    setDescription('');
    setDetectedFields([]);
    setStep('upload'); // Back to upload step
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      showError('Vui lòng chọn file');
      return;
    }

    if (!name.trim()) {
      showError('Vui lòng nhập tên biểu mẫu');
      return;
    }

    uploadMutation.mutate({
      file,
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/admin/templates')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Quay lại"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Tạo biểu mẫu mới
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Tải lên file Word (.docx) - định dạng Word 2007 trở lên
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: File Upload */}
        {step === 'upload' && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Bước 1: Chọn file biểu mẫu Word
            </h2>

            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                accept=".docx"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileChange(selectedFile);
                }}
                className="hidden"
              />

              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="mb-2">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                >
                  Nhấn để chọn file
                </label>
                <span className="text-gray-600 dark:text-gray-400"> hoặc kéo thả vào đây</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Chỉ chấp nhận file Word (.docx)
              </p>
            </div>

            {/* Instructions */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-2">Hướng dẫn tạo biểu mẫu Word:</p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    <li>Sử dụng cú pháp <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">{`{{fieldName}}`}</code> để đánh dấu các trường dữ liệu</li>
                    <li>Ví dụ: <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">{`{{hoTen}}`}</code>, <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">{`{{ngaySinh}}`}</code>, <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">{`{{lop}}`}</code></li>
                    <li>Tên trường không được chứa khoảng trắng hoặc ký tự đặc biệt</li>
                    <li>Hệ thống sẽ tự động phát hiện và trích xuất các trường khi tải lên</li>
                  </ul>
                  
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <p className="font-semibold mb-1">Chuyển đổi file .doc sang .docx:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Mở file .doc trong Microsoft Word</li>
                      <li>Chọn <strong>File</strong> → <strong>Save As</strong></li>
                      <li>Chọn định dạng <strong>Word Document (*.docx)</strong></li>
                      <li>Lưu file và kiểm tra lại file sau khi chuyển đổi</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Template Info */}
        {step === 'info' && file && (
          <>
            {/* File Selected Info */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  File đã chọn
                </h2>
                <button
                  type="button"
                  onClick={handleCancelFile}
                  className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline"
                >
                  Chọn file khác
                </button>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FileText className="h-10 w-10 text-blue-500 flex-shrink-0" />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(file.size / 1024).toFixed(2)} KB
                    {isParsing && <span className="ml-2">• Đang phân tích...</span>}
                    {!isParsing && detectedFields.length > 0 && (
                      <span className="ml-2">• Phát hiện {detectedFields.length} trường</span>
                    )}
                  </p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
              </div>

              {/* Show detected fields */}
              {!isParsing && detectedFields.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300 flex-1">
                      <p className="font-semibold mb-2">Đã phát hiện {detectedFields.length} trường dữ liệu:</p>
                      <div className="flex flex-wrap gap-2">
                        {detectedFields.map((field, idx) => (
                          <code 
                            key={idx}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded text-xs"
                          >
                            {`{{${field}}}`}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Template Info Form */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Bước 2: Thông tin biểu mẫu
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Tên biểu mẫu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ví dụ: Đơn xin nghỉ học"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Mô tả
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mô tả ngắn gọn về biểu mẫu này..."
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/templates')}
            disabled={uploadMutation.isPending}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          {step === 'info' && (
            <button
              type="submit"
              disabled={uploadMutation.isPending || !file || !name.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Tạo biểu mẫu
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TemplateUploadPage;
