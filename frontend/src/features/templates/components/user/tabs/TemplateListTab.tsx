import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, AlertCircle, Search } from 'lucide-react';
import { getAllTemplates } from '@/shared/services/template.service';
import { Pagination } from '@/shared/components';
import type { Template } from '@/shared/types/template.types';

interface TemplateListTabProps {
  onSelectTemplate: (templateId: string) => void;
}

const TemplateListTab: React.FC<TemplateListTabProps> = ({ onSelectTemplate }) => {
  const { t } = useTranslation(['templates', 'common']);
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['templates-active', debouncedSearch, page, limit],
    queryFn: () => getAllTemplates({
      status: 'active', // Chỉ lấy biểu mẫu active
      search: debouncedSearch || undefined,
      page,
      limit
    }),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache data
  });

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
              {t('common:messages.error.load')}
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-400">
              {error instanceof Error ? error.message : t('common:messages.error.unknown')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Filter */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('templates:placeholders.search')}
            className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto border-4 rounded-full animate-spin border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t('templates:messages.loadingTemplates')}</p>
            </div>
          </div>
        ) : !data?.data || data.data.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('templates:messages.noTemplates')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('templates:messages.noTemplatesDesc')}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-w-full">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('templates:fields.name')}
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('templates:fields.description')}
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('templates:fields.updatedAt')}
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('common:fields.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {data.data.map((template: Template) => (
                    <tr
                      key={template.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => onSelectTemplate(template.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {template.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {template.description || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(template.updatedAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTemplate(template.id);
                          }}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          {t('templates:fillForm')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              total={data.total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
              showLimitSelector={true}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default TemplateListTab;
