import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Shield } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { type Role } from '../services/roleService';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    role: Role | null;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    role,
}) => {
    const { t } = useTranslation('permissions');
    const [isDeleting, setIsDeleting] = useState(false); const handleConfirm = async () => {
        try {
            setIsDeleting(true);
            await onConfirm();
        } catch (error) {
            // Error handling is managed by parent component
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen || !role) return null; return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />

                <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 shadow-2xl rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mr-4">
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>                                <h3 className="text-xl font-semibold text-red-900 dark:text-red-200">{t('titles.delete')}</h3>
                                <p className="text-red-700 dark:text-red-300 text-sm mt-1">{t('messages.deleteWarning', 'This action cannot be undone')}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                            disabled={isDeleting}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-8">
                        {/* Left Column - Role Details */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Role Information Card */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                                    {t('messages.roleToBeDeleted', 'Role information to be deleted')}
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-2">                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        {t('fields.name')}
                                    </label>
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-1">
                                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 shadow-sm">
                                                    <span className="text-gray-900 dark:text-white font-mono text-sm font-medium">
                                                        {role.name}
                                                    </span>
                                                </div>
                                            </div>
                                            {role.isSystemRole && (
                                                <div className="flex-shrink-0">                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-800">
                                                    <Shield className="w-3 h-3 mr-1" />
                                                    {t('labels.system')}
                                                </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        {t('fields.name')}
                                    </label>
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 shadow-sm">
                                            <span className="text-gray-900 dark:text-white font-medium">
                                                {role.name}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {role.description && (
                                    <div className="space-y-2 mb-6">                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        {t('fields.description')}
                                    </label>
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 shadow-sm">
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                                {role.description}
                                            </p>
                                        </div>                                    </div>
                                )}
                            </div>

                            {/* Warning Message */}
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                                <div className="flex items-start space-x-4">
                                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <div className="flex-1">                                        <h5 className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-3">
                                        {t('messages.deleteConsequences')}
                                    </h5>
                                        <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
                                            <div className="flex items-start space-x-2">
                                                <span className="text-yellow-600 dark:text-yellow-400 font-bold">•</span>
                                                <span>{t('messages.deleteConsequence1')}</span>
                                            </div>
                                            <div className="flex items-start space-x-2">
                                                <span className="text-yellow-600 dark:text-yellow-400 font-bold">•</span>
                                                <span>{t('messages.deleteConsequence2')}</span>
                                            </div>
                                            <div className="flex items-start space-x-2">
                                                <span className="text-yellow-600 dark:text-yellow-400 font-bold">•</span>
                                                <span>{t('messages.deleteConsequence3')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>                            {/* Confirmation Question */}
                            <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                                    <Trans
                                        i18nKey="messages.confirmDeleteQuestion"
                                        ns="permissions"
                                        values={{ roleName: role.name }}
                                        components={{
                                            strong: <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded" />
                                        }}
                                    />
                                </p>
                            </div>
                        </div>

                        {/* Right Column - Summary & Warning */}
                        <div className="lg:col-span-1">
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 sticky top-6">                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                                {t('labels.warning')}
                            </h4>

                                <div className="space-y-4">
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                                        <div className="flex items-center justify-center mb-4">
                                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                                            </div>
                                        </div>                                        <div className="text-center">
                                            <h5 className="text-sm font-bold text-red-800 dark:text-red-200 mb-2">
                                                {t('messages.permanentDelete')}
                                            </h5>
                                            <p className="text-xs text-red-600 dark:text-red-300">
                                                {t('messages.cannotUndo')}
                                            </p>
                                        </div>
                                    </div>                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('labels.role')}</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">{role.name}</div>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('labels.permissions')}</div>
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                            {role.permissions?.length || 0}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('messages.permissionsWillBeDeleted')}</div>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('labels.status')}</div>
                                        <div className="flex items-center">
                                            <div className={`w-2 h-2 rounded-full mr-2 ${role.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <span className={`text-sm font-medium ${role.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {role.isActive ? t('labels.active') : t('labels.inactive')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>                    {/* Footer */}
                    <div className="flex justify-end space-x-4 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            disabled={isDeleting}
                        >
                            {t('labels.cancel')}
                        </button>                        <button
                            onClick={handleConfirm}
                            className="px-6 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 hover:border-red-700 focus:ring-4 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {t('messages.deleting')}
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('messages.confirmDelete')}
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
