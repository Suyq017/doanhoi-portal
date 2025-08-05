import React, { useState, useEffect } from 'react';
import { Settings, AlertCircle, CheckCircle } from 'lucide-react';
import PayOSConfigForm from '../payos/PayOSConfigForm';
import { PaymentCampaign } from '../../../types';
import { payosConfigService, PayOSConfig, CreatePayOSConfigRequest, UpdatePayOSConfigRequest } from '@/shared/services/fee-collection-service/payosConfigService';

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
}

const PayOSConfigTab: React.FC<PayOSConfigTabProps> = ({ campaign }) => {
  const [config, setConfig] = useState<PayOSConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (error: any) {
      console.error('Error saving PayOS config:', error);
      // The error will be shown by the form component
      throw error;
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
            Cấu Hình PayOS
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Thiết lập API credentials PayOS cho đợt thu phí "{campaign.name}"
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {config?.isActive && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Đã Cấu Hình
            </span>
          )}
          {!config && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              <AlertCircle className="w-3 h-3 mr-1" />
              Chưa Cấu Hình
            </span>
          )}
        </div>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="p-4 border border-green-200 rounded-md bg-green-50 dark:bg-green-900 dark:border-green-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                Cấu Hình Thành Công!
              </h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>
                  PayOS credentials đã được lưu thành công. Bây giờ bạn có thể bắt đầu nhận thanh toán.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Banner */}
      {!config ? (
        <div className="p-4 border border-blue-200 rounded-md bg-blue-50 dark:bg-blue-900 dark:border-blue-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                PayOS Chưa Được Cấu Hình
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Để bắt đầu nhận thanh toán qua PayOS, vui lòng cấu hình API credentials bên dưới.
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
                PayOS Đã Được Cấu Hình
              </h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>
                  PayOS credentials đã được cấu hình thành công. 
                  Bạn có thể cập nhật lại nếu cần thiết.
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
            API Credentials
          </h4>
        </div>

        <PayOSConfigForm
          campaignId={campaign.id}
          config={convertToFormConfig(config)}
          onSave={handleSaveConfig}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default PayOSConfigTab;
