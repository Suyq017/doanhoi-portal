import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Organization, OrganizationType } from '../../../shared/types/organization';
import { organizationService } from '../../../shared/services/organizationService';
import { useFormState } from '../hooks/useFormState';

interface EditOrganizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    organization: Organization | null;
    onSuccess: (updatedOrg: Organization) => void;
    onError?: (error: string) => void;
    loading?: boolean;
}

interface ErrorState {
    name?: string;
    code?: string;
    type?: string;
    form?: string;
}

const EditOrganizationModal: React.FC<EditOrganizationModalProps> = ({
    isOpen,
    onClose,
    organization,
    onSuccess,
    onError,
    loading = false,
}) => {
    const { t } = useTranslation(['organizations', 'common']);

    const initialFormData = {
        name: '',
        code: '',
        type: '' as OrganizationType,
        description: '',
        parentId: undefined,
    };

    const currentFormData = useMemo(() =>
        organization ? {
            name: organization.name || '',
            code: organization.code || '',
            type: organization.type as OrganizationType,
            description: organization.description || '',
            parentId: organization.parent?.id || undefined,
        } : undefined,
        [organization]);

    const {
        formData,
        errors,
        setErrors,
        handleInputChange
    } = useFormState(
        initialFormData,
        currentFormData,
        true
    );

    const [formLoading, setFormLoading] = useState(false);




    const validateForm = (): boolean => {
        const newErrors: ErrorState = {};

        if (!formData.name?.trim()) {
            newErrors.name = t('common:validation.required', { field: t('organizations:fields.name') });
        }

        if (!formData.code?.trim()) {
            newErrors.code = t('common:validation.required', { field: t('organizations:fields.code') });
        }

        if (!formData.type) {
            newErrors.type = t('common:validation.required', { field: t('organizations:fields.type') });
        }

        // setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !organization) {
            return;
        }

        setFormLoading(true);

        try {
            const updatedOrg = await organizationService.updateOrganization(
                organization.id,
                formData
            );

            onSuccess(updatedOrg);
            handleClose();
        } catch (error: unknown) {
            console.error('Error updating organization:', error);

            // Handle API errors
            if (error && typeof error === 'object') {
                // Check if it's an axios error with response
                if ('response' in error) {
                    const axiosError = error as {
                        response?: {
                            data?: {
                                message?: string
                            }
                        }
                    };

                    // Safely handle the error
                    const errorMessage = axiosError.response?.data?.message || t('common:messages.error.update');
                    onError?.(errorMessage);
                    // Check for specific error types
                    if (errorMessage.includes('code')) {
                        setErrors({
                            ...errors,
                            code: t('organizations:errors.codeExists')
                        });
                    } else {
                        setErrors({
                            ...errors,
                            form: errorMessage
                        });
                    }
                } else if (error instanceof Error) {
                    // Handle standard Error objects
                    setErrors({
                        ...errors,
                        form: error.message || t('common:messages.error.update')
                    });
                } else {
                    // Handle other object types
                    setErrors({
                        ...errors,
                        form: t('common:messages.error.update')
                    });
                }
            } else {
                // Handle non-object errors
                setErrors({
                    ...errors,
                    form: t('common:messages.error.update')
                });
            }
        } finally {
            setFormLoading(false);
        }
    };

    const handleClose = () => {

        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    const renderOrganizationTypeOptions = () => {
        return (
            <>
                <optgroup label={t('organizations:types.group.doan')}>
                    <option value="doan_truong">{t('organizations:types.doan_truong')}</option>
                    <option value="doan_co_so">{t('organizations:types.doan_co_so')}</option>
                    <option value="chi_doan">{t('organizations:types.chi_doan')}</option>
                </optgroup>
                <optgroup label={t('organizations:types.group.hoi')}>
                    <option value="hoi_sinh_vien_truong">{t('organizations:types.hoi_sinh_vien_truong')}</option>
                    <option value="lien_chi_hoi">{t('organizations:types.lien_chi_hoi')}</option>
                    <option value="chi_hoi">{t('organizations:types.chi_hoi')}</option>
                </optgroup>
                <optgroup label={t('organizations:types.group.clb')}>
                    <option value="clb_truong">{t('organizations:types.clb_truong')}</option>
                    <option value="clb_khoa">{t('organizations:types.clb_khoa')}</option>
                </optgroup>
            </>
        );
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4"
            style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {t('organizations:titles.edit')}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={loading || formLoading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Generic Form Error */}
                    {errors.form && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
                            {errors.form}
                        </div>
                    )}

                    {/* Tên tổ chức */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('organizations:fields.name')} *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.name
                                ? 'border-red-500 dark:border-red-500'
                                : 'border-gray-300 dark:border-gray-600'
                                }`}
                            placeholder={t('organizations:placeholders.name')}
                            disabled={loading || formLoading}
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Mã tổ chức */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('organizations:fields.code')} *
                        </label>
                        <input
                            type="text"
                            name="code"
                            value={formData.code || ''}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.code
                                ? 'border-red-500 dark:border-red-500'
                                : 'border-gray-300 dark:border-gray-600'
                                }`}
                            placeholder={t('organizations:placeholders.code')}
                            disabled={loading || formLoading}
                        />
                        {errors.code && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {errors.code}
                            </p>
                        )}
                    </div>

                    {/* Loại tổ chức */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('organizations:fields.type')} *
                        </label>
                        <select
                            name="type"
                            value={formData.type || ''}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.type
                                ? 'border-red-500 dark:border-red-500'
                                : 'border-gray-300 dark:border-gray-600'
                                }`}
                            disabled={loading || formLoading}
                        >
                            <option value="">{t('organizations:placeholders.selectType')}</option>
                            {renderOrganizationTypeOptions()}
                        </select>
                        {errors.type && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {errors.type}
                            </p>
                        )}
                    </div>

                    {/* Mô tả */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('organizations:fields.description')}
                        </label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            placeholder={t('organizations:placeholders.description')}
                            disabled={loading || formLoading}
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            disabled={loading || formLoading}
                        >
                            {t('common:actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || formLoading}
                            className="px-4 py-2 bg-doan-600 text-white rounded-md hover:bg-doan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                        >
                            {(loading || formLoading) && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            <span>{(loading || formLoading) ? t('common:states.updating') : t('common:actions.update')}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default EditOrganizationModal;