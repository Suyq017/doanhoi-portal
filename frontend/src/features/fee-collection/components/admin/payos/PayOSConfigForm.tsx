import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Check, Save, ClipboardCopy, Clipboard, Trash2 } from 'lucide-react';

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
  onDelete?: () => Promise<void>;
  onConfirmDelete?: () => Promise<boolean>;
  loading?: boolean;
  readOnly?: boolean;
}

const PayOSConfigForm: React.FC<PayOSConfigFormProps> = ({ 
  campaignId, 
  config, 
  onSave, 
  onDelete,
  onConfirmDelete,
  loading = false,
  readOnly = false 
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

  // Hàm xử lý khi nhấn nút "Sao chép cấu hình"
  const handleCopyConfig = async () => {
    try {
      // Chuyển object thành chuỗi JSON để lưu vào clipboard
      const configToCopy = {
        clientId: formData.clientId,
        apiKey: formData.apiKey,
        checksumKey: formData.checksumKey
      };
      const textToCopy = JSON.stringify(configToCopy);
      await navigator.clipboard.writeText(textToCopy);
      setCopiedField('config');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Không thể sao chép cấu hình: ', err);
      alert('Lỗi: Không thể sao chép dữ liệu cấu hình.');
    }
  };

  // Hàm xử lý khi nhấn nút "Dán cấu hình"  
  const handlePasteConfig = async () => {
    try {
      // Đọc văn bản từ clipboard
      const textFromClipboard = await navigator.clipboard.readText();
      // Chuyển chuỗi JSON trở lại thành object
      const parsedData = JSON.parse(textFromClipboard);
      
      // Đảm bảo dữ liệu đọc được có đúng cấu trúc
      if (parsedData && 
          typeof parsedData.clientId !== 'undefined' && 
          typeof parsedData.apiKey !== 'undefined' && 
          typeof parsedData.checksumKey !== 'undefined') {
        setFormData({
          clientId: parsedData.clientId || '',
          apiKey: parsedData.apiKey || '',
          checksumKey: parsedData.checksumKey || ''
        });
        // Clear any existing errors
        setErrors({});
        setCopiedField('paste');
        setTimeout(() => setCopiedField(null), 2000);
      } else {
        alert('Dữ liệu trong clipboard không phải là cấu hình PayOS hợp lệ.');
      }
    } catch (err) {
      console.error('Không thể dán cấu hình: ', err);
      alert('Lỗi: Dữ liệu trong clipboard không phải là định dạng hợp lệ hoặc không thể truy cập.');
    }
  };

  // Hàm xử lý khi nhấn nút "Xóa cấu hình"
  const handleDeleteConfig = async () => {
    if (!config || !onDelete) return;

    // Use custom confirm dialog if available, otherwise fallback to window.confirm
    let shouldDelete = false;
    if (onConfirmDelete) {
      shouldDelete = await onConfirmDelete();
    } else {
      shouldDelete = window.confirm(
        'Bạn có chắc chắn muốn xóa cấu hình PayOS này? Hành động này không thể hoàn tác.'
      );
    }

    if (!shouldDelete) return;

    try {
      await onDelete();
      // Clear form data after successful deletion
      setFormData({
        clientId: '',
        apiKey: '',
        checksumKey: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Error deleting PayOS config:', error);
      alert('Không thể xóa cấu hình PayOS. Vui lòng thử lại.');
    }
  };

  const isFormValid = formData.clientId.trim() && formData.apiKey.trim() && formData.checksumKey.trim();

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Copy/Paste Configuration Buttons */}
        <div className="flex flex-wrap items-center gap-3 p-4 border border-gray-200 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Quản lý cấu hình
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Sao chép và dán cấu hình giữa các đợt thu phí
            </p>
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={handleCopyConfig}
              disabled={!isFormValid || saving || loading}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                !isFormValid || saving || loading
                  ? 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed dark:text-gray-500 dark:bg-gray-800 dark:border-gray-600'
                  : 'text-blue-700 bg-blue-50 border-blue-300 hover:bg-blue-100 focus:ring-blue-500 dark:text-blue-300 dark:bg-blue-900 dark:border-blue-700 dark:hover:bg-blue-800'
              }`}
            >
              {copiedField === 'config' ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-4 h-4 mr-1" />
                  Sao chép cấu hình
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePasteConfig}
              disabled={saving || loading}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                saving || loading
                  ? 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed dark:text-gray-500 dark:bg-gray-800 dark:border-gray-600'
                  : 'text-green-700 bg-green-50 border-green-300 hover:bg-green-100 focus:ring-green-500 dark:text-green-300 dark:bg-green-900 dark:border-green-700 dark:hover:bg-green-800'
              }`}
            >
              {copiedField === 'paste' ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Đã dán
                </>
              ) : (
                <>
                  <Clipboard className="w-4 h-4 mr-1" />
                  Dán cấu hình
                </>
              )}
            </button>
          </div>
        </div>

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
              } ${readOnly ? 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : ''}`}
              placeholder="Nhập Client ID từ PayOS"
              disabled={saving || loading || readOnly}
              readOnly={readOnly}
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
              } ${readOnly ? 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : ''}`}
              placeholder="Nhập API Key từ PayOS"
              disabled={saving || loading || readOnly}
              readOnly={readOnly}
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
              } ${readOnly ? 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : ''}`}
              placeholder="Nhập Checksum Key từ PayOS"
              disabled={saving || loading || readOnly}
              readOnly={readOnly}
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

        {/* Action Buttons */}
        {!readOnly && (
          <div className="flex items-center justify-between">
            {/* Delete Button - Only show if config exists */}
            {config && onDelete && (
              <button
                type="button"
                onClick={handleDeleteConfig}
                disabled={saving || loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa Cấu Hình
              </button>
            )}
            
            {/* Save Button */}
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
        )}
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
