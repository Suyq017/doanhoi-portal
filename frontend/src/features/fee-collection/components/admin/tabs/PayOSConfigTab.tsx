import React, { useState, useEffect } from 'react';
import { Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PayOSConfigForm from '../payos/PayOSConfigForm';
import { PaymentCampaign } from '../../../types';
import { payosConfigService, PayOSConfig, CreatePayOSConfigRequest, UpdatePayOSConfigRequest } from '@/shared/services/fee-collection-service/payosConfigService';
import { Toast } from '@/shared/components';
import { useToast } from '@/shared/hooks/useToast';

// PayOSConfig interface for form compatibility
interface FormPayOSConfig {
  id?: string;
  campaignId: string;
  clientId: string;
  apiKey: string;
  checksumKey: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PayOSConfigTabProps {
  campaign: PaymentCampaign;
  onConfirmDelete?: () => Promise<boolean>;
}

const PayOSConfigTab: React.FC<PayOSConfigTabProps> = ({ campaign, onConfirmDelete }) => {
  const { t } = useTranslation('payosConfig');
  const { showSuccess, toasts, hideToast } = useToast();
  const [config, setConfig] = useState<PayOSConfig | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if campaign is in read-only state
  const readOnly = campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED';

  // Convert API config to form config
  const convertToFormConfig = (apiConfig: PayOSConfig | null): FormPayOSConfig | null => {
    if (!apiConfig) return null;
    return {
      id: apiConfig.id,
      campaignId: campaign.id, // Use campaign.id for form
      clientId: apiConfig.clientId,
      apiKey: apiConfig.apiKey,
      checksumKey: apiConfig.checksumKey,
      isActive: apiConfig.isActive,
      createdAt: apiConfig.createdAt,
      updatedAt: apiConfig.updatedAt
    };
  };

  // Load existing config
  useEffect(() => {
    loadConfig();
  }, [campaign.id]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const existingConfig = await payosConfigService.getPayOSConfig(campaign.id);
      setConfig(existingConfig);
    } catch (error) {
      console.error('Error loading PayOS config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (configData: Omit<FormPayOSConfig, 'id'>) => {
    setLoading(true);
    try {
      let savedConfig: PayOSConfig;
      
      // Convert form data to API request format
      const apiRequest: CreatePayOSConfigRequest = {
        organizationId: campaign.organizationId,
        clientId: configData.clientId,
        apiKey: configData.apiKey,
        checksumKey: configData.checksumKey
      };
      
      if (config) {
        // Update existing config - use UpdatePayOSConfigRequest
        const updateRequest: UpdatePayOSConfigRequest = {
          clientId: configData.clientId,
          apiKey: configData.apiKey,
          checksumKey: configData.checksumKey,
          isActive: configData.isActive
        };
        savedConfig = await payosConfigService.updatePayOSConfig(campaign.id, updateRequest);
      } else {
        // Create new config
        savedConfig = await payosConfigService.createPayOSConfig(campaign.id, apiRequest);
      }
      
      setConfig(savedConfig);
      showSuccess(t('success.message'));
      
    } catch (error: any) {
      console.error('Error saving PayOS config:', error);
      // The error will be shown by the form component
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!config) return;
    
    setLoading(true);
    try {
      await payosConfigService.deletePayOSConfig(campaign.id);
      setConfig(null);
      
      showSuccess(t('success.deleteMessage'));
      
    } catch (error: any) {
      console.error('Error deleting PayOS config:', error);
      throw error; // Let the form handle the error display
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('title')}
            {readOnly && (
              <span className="ml-2 text-orange-600 dark:text-orange-400">
                ({t('readOnlyMode')} {campaign.status === 'COMPLETED' ? t('completed') : t('cancelled')})
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('subtitle')} "{campaign.name}"
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {config?.isActive && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              {t('status.configured')}
            </span>
          )}
          {!config && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              <AlertCircle className="w-3 h-3 mr-1" />
              {t('status.notConfigured')}
            </span>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {!config ? (
        <div className="p-4 border border-blue-200 rounded-md bg-blue-50 dark:bg-blue-900 dark:border-blue-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {t('setup.title')}
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  {t('setup.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border border-green-200 rounded-md bg-green-50 dark:bg-green-900 dark:border-green-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                {t('configured.title')}
              </h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>
                  {t('configured.line1')} {t('configured.line2')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Settings className="w-5 h-5 mr-2 text-gray-400 dark:text-gray-500" />
          <h4 className="font-medium text-gray-900 text-md dark:text-white">
            {t('form.credentialsTitle')}
          </h4>
        </div>

        <PayOSConfigForm
          campaignId={campaign.id}
          config={convertToFormConfig(config)}
          onSave={handleSaveConfig}
          onDelete={config ? handleDeleteConfig : undefined}
          onConfirmDelete={onConfirmDelete}
          loading={loading}
          readOnly={readOnly}
        />
      </div>

      {/* Toast notifications */}
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
  );
};

export default PayOSConfigTab;
