import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import { Organization } from '../../../shared/types/organization';
import { organizationService } from '../../../shared/services/organizationService';

interface DeleteOrganizationModalProps {
    isOpen: boolean;
    organization: Organization | null;
    onClose: () => void;
    onSuccess: () => void;
    onError?: (error: string) => void;
}

const DeleteOrganizationModal: React.FC<DeleteOrganizationModalProps> = ({
    isOpen,
    organization,
    onClose,
    onSuccess,
    onError,
}) => {
    const { t } = useTranslation(['organizations', 'common']);
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!organization) return;

        try {
            setLoading(true);
            await organizationService.deleteOrganization(organization.id);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error deleting organization:', error);

            let errorMessage = t('common:messages.error.delete');

            // Handle specific errors
            if (error.response?.data?.message) {
                const apiError = error.response.data.message;
                if (apiError.includes('members') || apiError.includes('thành viên')) {
                    errorMessage = t('organizations:messages.cannotDeleteWithMembers');
                } else if (apiError.includes('children') || apiError.includes('con')) {
                    errorMessage = t('organizations:messages.cannotDeleteWithChildren');
                } else {
                    errorMessage = apiError;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            if (onError) {
                onError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !organization) return null;

    const hasChildren = organization.children && organization.children.length > 0;
    const cannotDelete = hasChildren;

    return createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                        <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
                        {t('organizations:titles.delete')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={loading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {t('common:messages.confirm.delete')}
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            <div className="font-medium text-gray-900 dark:text-white">
                                {organization.name}
                            </div>
                            {organization.code && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('organizations:fields.code')}: {organization.code}
                                </div>
                            )}
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {t('organizations:fields.type')}: {t(`organizations:types.${organization.type}`)}
                            </div>
                        </div>
                    </div>



                    {/* Warning cho tổ chức có tổ chức con */}
                    {hasChildren && (
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                                <div>
                                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                        {t('organizations:messages.hasChildren')}
                                    </div>
                                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                        {t('organizations:messages.removeChildrenFirst', { count: organization.children?.length })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-sm text-red-600 dark:text-red-400">
                        {t('common:messages.confirm.deleteWarning')}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500 transition-colors"
                        disabled={loading}
                    >
                        {t('common:actions.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={!!loading || !!cannotDelete}
                    >
                        {loading ? t('common:states.deleting') : t('common:actions.delete')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteOrganizationModal;