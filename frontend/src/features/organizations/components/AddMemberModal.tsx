import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { organizationService } from '../../../shared/services/organizationService';


interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    organizationCode: string;
    organizationType?: string;
    organizationName?: string;
    onSuccess: (userCode: string) => void;
    onError?: (error: string) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
    isOpen,
    onClose,
    organizationCode,
    organizationName,
    onSuccess,
    onError
}) => {
    const { t } = useTranslation(['organizations', 'common', 'users']);
    const [userCode, setUserCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateForm = (): boolean => {
        if (!userCode.trim()) {
            const errorMsg = t('common:validation.required', { field: t('users:fields.code') });
            setError(errorMsg);
            if (onError) onError(errorMsg);
            return false;
        }
        return true;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Gọi API để thêm thành viên vào tổ chức
            await organizationService.addMemberBySimpleCode(
                organizationCode,
                userCode
            );

            onSuccess(t('common:messages.success.add'));
            setUserCode('');
            onClose();
        } catch (err) {
            console.error('Error adding member:', (err as any).status);
            if ((err as any).status === 400) {
                const errorMessage = t('users:messages.userAlreadyExists');
                setError(errorMessage);
                if (onError) {
                    onError(errorMessage);
                }

            } else if ((err as any).status === 404) {
                const errorMessage = t('users:messages.noUsers');
                setError(errorMessage);
                if (onError) {
                    onError(errorMessage);
                }

            }


        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setUserCode('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4"
            style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={handleOverlayClick}
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {t('organizations:tree.addMember')}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={loading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Organization info */}
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('organizations:tree.addMemberTo')} :  {organizationName}
                        </p>

                    </div>

                    {/* User Code */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('users:fields.code')} *
                        </label>
                        <input
                            type="text"
                            value={userCode}
                            onChange={(e) => {
                                setUserCode(e.target.value);
                                if (error) setError(null);
                            }}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${error
                                ? 'border-red-500 dark:border-red-500'
                                : 'border-gray-300 dark:border-gray-600'
                                }`}
                            placeholder={t('users:placeholders.code')}
                            disabled={loading}
                        />
                        {error && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        )}
                    </div>



                    {/* Buttons */}
                    <div className="flex items-center justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            disabled={loading}
                        >
                            {t('common:actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-doan-600 text-white rounded-md hover:bg-doan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                        >
                            {loading && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            <span>{loading ? t('common:states.processing') : t('common:actions.add')}</span>
                        </button>
                    </div>
                </form>
            </div>

        </div>
    );

    return createPortal(modalContent, document.body);
};

export default AddMemberModal;