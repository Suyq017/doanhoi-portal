import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Check, Save } from 'lucide-react';

interface PayOSConfig {
  id?: string;
  campaignId: string;
  clientId: string;
  apiKey: string;
  checksumKey: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PayOSConfigFormProps {
  campaignId: string;
  config?: PayOSConfig | null;
  onSave: (config: Omit<PayOSConfig, 'id'>) => Promise<void>;
  loading?: boolean;
}

const PayOSConfigForm: React.FC<PayOSConfigFormProps> = ({ 
  campaignId, 
  config, 
  onSave, 
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    clientId: '',
    apiKey: '',
    checksumKey: ''
  });
  
  const [showFields, setShowFields] = useState({
    apiKey: false,
    checksumKey: false
  });
  
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Load existing config
  useEffect(() => {
    if (config) {
      setFormData({
        clientId: config.clientId || '',
        apiKey: config.apiKey || '',
        checksumKey: config.checksumKey || ''
      });
    }
  }, [config]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.clientId.trim()) {
      newErrors.clientId = 'Client ID là bắt buộc';
    }
    
    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API Key là bắt buộc';
    }
    
    if (!formData.checksumKey.trim()) {
      newErrors.checksumKey = 'Checksum Key là bắt buộc';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const configData: Omit<PayOSConfig, 'id'> = {
        campaignId,
        clientId: formData.clientId.trim(),
        apiKey: formData.apiKey.trim(),
        checksumKey: formData.checksumKey.trim(),
        isActive: true,
        createdAt: config?.createdAt,
        updatedAt: new Date().toISOString()
      };
      
      await onSave(configData);
    } catch (error) {
      console.error('Error saving PayOS config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleShowField = (field: 'apiKey' | 'checksumKey') => {
    setShowFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const copyToClipboard = async (field: keyof typeof formData) => {
    try {
      await navigator.clipboard.writeText(formData[field]);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isFormValid = formData.clientId.trim() && formData.apiKey.trim() && formData.checksumKey.trim();

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client ID */}
        <div>
          <label htmlFor="clientId" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Client ID <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="clientId"
              value={formData.clientId}
              onChange={(e) => handleInputChange('clientId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:focus:ring-indigo-400 ${
                errors.clientId ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Nhập Client ID từ PayOS"
              disabled={saving || loading}
            />
            {formData.clientId && (
              <button
                type="button"
                onClick={() => copyToClipboard('clientId')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {copiedField === 'clientId' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          {errors.clientId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.clientId}</p>
          )}
        </div>

        {/* API Key */}
        <div>
          <label htmlFor="apiKey" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            API Key <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showFields.apiKey ? 'text' : 'password'}
              id="apiKey"
              value={formData.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              className={`w-full px-3 py-2 pr-20 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:focus:ring-indigo-400 ${
                errors.apiKey ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Nhập API Key từ PayOS"
              disabled={saving || loading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
              {formData.apiKey && (
                <button
                  type="button"
                  onClick={() => copyToClipboard('apiKey')}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {copiedField === 'apiKey' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleShowField('apiKey')}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showFields.apiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {errors.apiKey && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.apiKey}</p>
          )}
        </div>

        {/* Checksum Key */}
        <div>
          <label htmlFor="checksumKey" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Checksum Key <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showFields.checksumKey ? 'text' : 'password'}
              id="checksumKey"
              value={formData.checksumKey}
              onChange={(e) => handleInputChange('checksumKey', e.target.value)}
              className={`w-full px-3 py-2 pr-20 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white dark:focus:ring-indigo-400 ${
                errors.checksumKey ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Nhập Checksum Key từ PayOS"
              disabled={saving || loading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
              {formData.checksumKey && (
                <button
                  type="button"
                  onClick={() => copyToClipboard('checksumKey')}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {copiedField === 'checksumKey' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleShowField('checksumKey')}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showFields.checksumKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {errors.checksumKey && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.checksumKey}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isFormValid || saving || loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                Đang Lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {config ? 'Cập Nhật Cấu Hình' : 'Lưu Cấu Hình'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Helper Text */}
      <div className="p-4 border border-blue-200 rounded-md bg-blue-50 dark:bg-blue-900 dark:border-blue-800">
        <h4 className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-200">
          Hướng Dẫn Lấy API Credentials
        </h4>
        <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <p>1. Đăng nhập vào PayOS Dashboard</p>
          <p>2. Vào phần <strong>Cài đặt</strong> → <strong>API Keys</strong></p>
          <p>3. Copy các thông tin: Client ID, API Key, và Checksum Key</p>
          <p>4. Paste vào form này và lưu lại</p>
        </div>
      </div>
    </div>
  );
};

export default PayOSConfigForm;
