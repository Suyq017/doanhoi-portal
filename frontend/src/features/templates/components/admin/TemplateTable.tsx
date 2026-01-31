import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Edit, Trash2 } from 'lucide-react';
import type { Template, TemplateStatus } from '@/shared/types/template.types';

interface TemplateTableProps {
    templates: Template[];
    canManageTemplates: boolean;
    onConfigure: (id: string) => void;
    onDelete: (id: string, name: string) => void;
    isDeleting: boolean;
}

const getStatusBadge = (status: TemplateStatus, t: (key: string) => string) => {
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

// Empty State Component
interface EmptyStateProps {
    canManageTemplates: boolean;
    onNavigateToUpload: () => void;
}

export const TemplateEmptyState: React.FC<EmptyStateProps> = ({ canManageTemplates, onNavigateToUpload }) => {
    const { t } = useTranslation(['templates']);

    return (
        <div className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('templates:messages.noTemplates')}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('templates:messages.noTemplatesDesc')}
            </p>
            {canManageTemplates && (
                <div className="mt-6">
                    <button
                        onClick={onNavigateToUpload}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-doan-500 hover:bg-doan-600"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('templates:createTemplate')}
                    </button>
                </div>
            )}
        </div>
    );
};

export const TemplateTable: React.FC<TemplateTableProps> = ({
    templates,
    canManageTemplates,
    onConfigure,
    onDelete,
    isDeleting,
}) => {
    const { t } = useTranslation(['templates', 'common']);

    return (
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
                        {canManageTemplates && (
                            <th
                                scope="col"
                                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                            >
                                {t('common:fields.actions')}
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {templates.map((template) => (
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
                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(template.status, t)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {template.fieldsCount ?? template.fields?.length ?? 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {new Date(template.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {new Date(template.updatedAt).toLocaleDateString('vi-VN')}
                            </td>
                            {canManageTemplates && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button
                                            onClick={() => onConfigure(template.id)}
                                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 rounded"
                                            title={t('templates:actions.configure')}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(template.id, template.name)}
                                            disabled={isDeleting}
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
    );
};

export default TemplateTable;
