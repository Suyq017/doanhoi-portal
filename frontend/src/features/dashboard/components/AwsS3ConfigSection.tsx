import React, { useState, useEffect } from 'react';
import { Cloud, Save, Trash2, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CreateAwsS3ConfigRequest } from '@/shared/services/awsS3ConfigService';
import { Toast } from '@/shared/components';
import { useToast } from '@/shared/hooks/useToast';
import {
    useAwsS3ConfigActive,
    useCreateAwsS3Config,
    useUpdateAwsS3Config,
    useDeleteAwsS3Config
} from '@/shared/hooks/queries/useSystemConfigQueries';

const AwsS3ConfigSection: React.FC = () => {
    const { t } = useTranslation(['dashboard', 'common']);
    const { showSuccess, showError, toasts, hideToast } = useToast();

    // React Query hooks
    const { data: config, isLoading: loading } = useAwsS3ConfigActive();
    const createMutation = useCreateAwsS3Config();
    const updateMutation = useUpdateAwsS3Config();
    const deleteMutation = useDeleteAwsS3Config();

    const [showSecrets, setShowSecrets] = useState(false);
    const [formData, setFormData] = useState<CreateAwsS3ConfigRequest>({
        accessKeyId: '',
        secretAccessKey: '',
        region: '',
        s3Bucket: '',
        s3Endpoint: '',
    });

    // Update form when config is loaded from cache or server
    useEffect(() => {
        if (config) {
            setFormData({
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
                region: config.region,
                s3Bucket: config.s3Bucket,
                s3Endpoint: config.s3Endpoint,
            });
        }
    }, [config]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            if (config) {
                // Update existing config
                await updateMutation.mutateAsync({
                    id: config.id,
                    data: formData,
                });
                showSuccess(t('dashboard:awsConfig.messages.updateSuccess'));
            } else {
                // Create new config
                await createMutation.mutateAsync(formData);
                showSuccess(t('dashboard:awsConfig.messages.createSuccess'));
            }
        } catch (error: any) {
            showError(error.response?.data?.message || t('dashboard:awsConfig.messages.saveError'));
        }
    };

    const handleDelete = async () => {
        if (!config) return;

        const confirmed = window.confirm(t('dashboard:awsConfig.messages.deleteConfirm'));
        if (!confirmed) return;

        try {
            await deleteMutation.mutateAsync(config.id);
            setFormData({
                accessKeyId: '',
                secretAccessKey: '',
                region: '',
                s3Bucket: '',
                s3Endpoint: '',
            });
            showSuccess(t('dashboard:awsConfig.messages.deleteSuccess'));
        } catch (error: any) {
            showError(error.response?.data?.message || t('dashboard:awsConfig.messages.deleteError'));
        }
    };

    const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

    if (loading) {
        return (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                            <Cloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('dashboard:awsConfig.title')}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('dashboard:awsConfig.subtitle')}
                            </p>
                        </div>
                    </div>
                    {config && (
                        <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {t('dashboard:awsConfig.status.configured')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Status Banner */}
                {!config && (
                    <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                        <div className="flex">
                            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <div className="ml-3">
                                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    {t('dashboard:awsConfig.setup.title')}
                                </h4>
                                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                                    {t('dashboard:awsConfig.setup.description')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form */}
                <div className="space-y-4">
                    {/* Access Key ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('dashboard:awsConfig.fields.accessKeyId')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="accessKeyId"
                            value={formData.accessKeyId}
                            onChange={handleInputChange}
                            placeholder={t('dashboard:awsConfig.fields.placeholders.accessKeyId')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            disabled={saving}
                        />
                    </div>

                    {/* Secret Access Key */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('dashboard:awsConfig.fields.secretAccessKey')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showSecrets ? 'text' : 'password'}
                                name="secretAccessKey"
                                value={formData.secretAccessKey}
                                onChange={handleInputChange}
                                placeholder={t('dashboard:awsConfig.fields.placeholders.secretAccessKey')}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={saving}
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecrets(!showSecrets)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                {showSecrets ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Region */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('dashboard:awsConfig.fields.region')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="region"
                            value={formData.region}
                            onChange={handleInputChange}
                            placeholder={t('dashboard:awsConfig.fields.placeholders.region')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            disabled={saving}
                        />
                    </div>

                    {/* S3 Bucket */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('dashboard:awsConfig.fields.s3Bucket')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="s3Bucket"
                            value={formData.s3Bucket}
                            onChange={handleInputChange}
                            placeholder={t('dashboard:awsConfig.fields.placeholders.s3Bucket')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            disabled={saving}
                        />
                    </div>

                    {/* S3 Endpoint */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('dashboard:awsConfig.fields.s3Endpoint')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="s3Endpoint"
                            value={formData.s3Endpoint}
                            onChange={handleInputChange}
                            placeholder={t('dashboard:awsConfig.fields.placeholders.s3Endpoint')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            disabled={saving}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end pt-4 space-x-3 border-t border-gray-200 dark:border-gray-700">
                        {config && (
                            <button
                                onClick={handleDelete}
                                disabled={saving}
                                className="flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('common:actions.delete')}
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving || !formData.accessKeyId || !formData.secretAccessKey || !formData.region || !formData.s3Bucket || !formData.s3Endpoint}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('common:states.saving')}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {config ? t('common:actions.update') : t('common:actions.save')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Toast notifications */}
            <div className="fixed top-4 right-4 z-[9999] space-y-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        type={toast.type}
                        message={toast.message}
                        duration={toast.duration}
                        onClose={() => hideToast(toast.id)}
                    />
                ))}
            </div>
        </>
    );
};

export default AwsS3ConfigSection;
