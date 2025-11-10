import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, AlertCircle, Clock } from 'lucide-react';
import { getAllTemplates } from '@/shared/services/template.service';
import type { Template } from '@/shared/types/template.types';

interface TemplateListTabProps {
  onSelectTemplate: (templateId: string) => void;
}

const TemplateListTab: React.FC<TemplateListTabProps> = ({ onSelectTemplate }) => {
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['templates', 'active'],
    queryFn: () => getAllTemplates('active'),
  });

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

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          Chưa có biểu mẫu nào
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Hiện tại chưa có biểu mẫu nào được kích hoạt
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template: Template) => (
        <div
          key={template.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onSelectTemplate(template.id)}
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4 mr-1" />
              <span>
                Cập nhật: {new Date(template.updatedAt).toLocaleDateString('vi-VN')}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center text-sm">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {template.fields?.length || 0} trường
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTemplate(template.id);
                }}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                Điền biểu mẫu →
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateListTab;
