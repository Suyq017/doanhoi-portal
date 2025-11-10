import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, ArrowLeft, AlertCircle, Loader } from 'lucide-react';
import { uploadTemplate } from '@/shared/services/template.service';
import { useToast } from '@/shared/hooks/useToast';
import { Toast } from '@/shared/components';

const TemplateUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (data: { file: File; name: string; description?: string }) =>
      uploadTemplate(data.file, { name: data.name, description: data.description }),
    onSuccess: (template) => {
      showSuccess('Tải lên biểu mẫu thành công!');
      setTimeout(() => {
        navigate(`/admin/templates/${template.id}/configure`);
      }, 1500);
    },
    onError: (error: any) => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => hideToast(toast.id)} />
      ))}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/admin/templates')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Quay lại danh sách
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tải lên biểu mẫu mới
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tải lên file Word (.docx) có chứa các trường dữ liệu
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              File biểu mẫu
            </h2>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600'
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

              {!file ? (
                <div>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      Chọn file
                    </label>
                    <span className="text-gray-600 dark:text-gray-400"> hoặc kéo thả vào đây</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Chỉ chấp nhận file .docx
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-4">
                  <FileText className="h-10 w-10 text-blue-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                  >
                    Xóa
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-2">Hướng dẫn tạo biểu mẫu Word:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Sử dụng cú pháp {`{{fieldName}}`} để đánh dấu các trường dữ liệu</li>
                    <li>Ví dụ: {`{{hoTen}}`}, {`{{ngaySinh}}`}, {`{{lop}}`}</li>
                    <li>Tên trường không được chứa khoảng trắng</li>
                    <li>Hệ thống sẽ tự động phát hiện các trường khi tải lên</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Template Info */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Thông tin biểu mẫu
            </h2>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Tên biểu mẫu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ví dụ: Đơn xin nghỉ học"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Mô tả
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Mô tả ngắn gọn về biểu mẫu này"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/admin/templates')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Tải lên và tiếp tục
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateUploadPage;
