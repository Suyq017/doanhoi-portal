import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  PaymentCampaign,
  CreatePaymentCampaignDto,
  UpdatePaymentCampaignDto,
  Organization
} from '../../types';
import {
  useOrganizationList,
  useCreatePaymentCampaign,
  useUpdatePaymentCampaign
} from '@/shared/hooks/queries';
import SearchableCombobox from '@/shared/components/SearchableCombobox';

interface PaymentCampaignBasicFormData {
  organizationId: string;
  organizationName: string;
  name: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface PaymentCampaignFormProps {
  campaign?: PaymentCampaign;
  mode: 'create' | 'edit';
  onSave?: () => void;
  onCancel?: () => void;
  accessibleOrganizations?: Organization[]; // New prop for accessible organizations
  onShowSuccess?: (message: string) => void; // New prop for showing success toast
}

const PaymentCampaignForm: React.FC<PaymentCampaignFormProps> = ({
  campaign,
  mode,
  onSave,
  onCancel,
  accessibleOrganizations,
  onShowSuccess
}) => {
  const { t } = useTranslation('paymentCampaigns');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Remove local toast hook - will use parent's toast

  // ✅ TanStack Query mutations
  const createMutation = useCreatePaymentCampaign();
  const updateMutation = useUpdatePaymentCampaign();

  // TanStack Query - auto-cache, shared with CreateUserModal
  const {
    data: allOrganizations = [],
    isLoading: loadingOrganizations
  } = useOrganizationList();

  // Use accessible organizations if provided, otherwise use all from cache
  const organizations = accessibleOrganizations && accessibleOrganizations.length > 0
    ? accessibleOrganizations.map(org => ({ ...org, displayName: org.name }))
    : allOrganizations.map(org => ({ ...org, displayName: org.name }));

  const [formData, setFormData] = useState<PaymentCampaignBasicFormData>({
    organizationId: campaign?.organizationId || '',
    organizationName: campaign?.organization?.name || '',
    name: campaign?.name || '',
    description: campaign?.description || '',
    startDate: campaign?.startDate ? campaign.startDate.split('T')[0] : '',
    startTime: campaign?.startDate ? campaign.startDate.split('T')[1]?.substring(0, 5) || '00:00' : '00:00',
    endDate: campaign?.endDate ? campaign.endDate.split('T')[0] : '',
    endTime: campaign?.endDate ? campaign.endDate.split('T')[1]?.substring(0, 5) || '23:59' : '23:59',
  });

  const validateForm = (): boolean => {
    if (!formData.organizationId) {
      setError(t('formComponent.errorSelectOrganization'));
      return false;
    }

    if (!formData.name.trim()) {
      setError(t('formComponent.errorCampaignName'));
      return false;
    }

    if (!formData.startDate) {
      setError(t('formComponent.errorStartDate'));
      return false;
    }

    if (!formData.startTime) {
      setError(t('formComponent.errorStartTime'));
      return false;
    }

    if (!formData.endDate) {
      setError(t('formComponent.errorEndDate'));
      return false;
    }

    if (!formData.endTime) {
      setError(t('formComponent.errorEndTime'));
      return false;
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (startDateTime >= endDateTime) {
      setError(t('formComponent.errorDateRange'));
      return false;
    }

    return true;
  };
  const handleOrganizationSelect = (organizationId: string) => {
    const selectedOrg = organizations.find(org => org && org.id === organizationId);
    if (selectedOrg && selectedOrg.name) {
      setFormData(prev => ({
        ...prev,
        organizationId,
        organizationName: selectedOrg.name
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      if (mode === 'create') {
        // Create campaign only
        const campaignData: CreatePaymentCampaignDto = {
          organizationId: formData.organizationId,
          name: formData.name,
          description: formData.description,
          startDate: `${formData.startDate}T${formData.startTime}:00.000Z`,
          endDate: `${formData.endDate}T${formData.endTime}:00.000Z`
        };

        const newCampaign = await createMutation.mutateAsync(campaignData);

        // Show success toast
        onShowSuccess?.(t('messages.createSuccess'));

        // Use callback if provided, otherwise navigate
        if (onSave) {
          onSave();
        } else {
          // Navigate to detail page to add fee levels
          navigate(`/portal/admin/payment-campaigns/${newCampaign.id}`);
        }
      } else if (campaign) {
        // Update campaign
        const updateData: UpdatePaymentCampaignDto = {
          name: formData.name,
          description: formData.description,
          startDate: `${formData.startDate}T${formData.startTime}:00.000Z`,
          endDate: `${formData.endDate}T${formData.endTime}:00.000Z`
        };

        await updateMutation.mutateAsync({ id: campaign.id, data: updateData });

        // Show success toast
        onShowSuccess?.(t('messages.updateSuccess'));

        // Use callback if provided, otherwise navigate
        if (onSave) {
          onSave();
        } else {
          navigate(`/portal/admin/payment-campaigns/${campaign.id}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Use callback if provided, otherwise navigate
    if (onCancel) {
      onCancel();
    } else {
      if (mode === 'edit' && campaign) {
        navigate(`/portal/admin/payment-campaigns/${campaign.id}`);
      } else {
        navigate('/portal/admin/payment-campaigns');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'create' ? t('form.createTitle') : t('form.editTitle')}
        </h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50 dark:bg-red-900 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="p-6 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">{t('formComponent.basicInfo')}</h2>

          {/* Row 1: Tổ chức và Tên đợt đóng phí */}
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('formComponent.organizationLabel')} <span className="text-red-500">{t('formComponent.organizationRequired')}</span>
              </label>              <SearchableCombobox
                value={formData.organizationId}
                onChange={handleOrganizationSelect}
                options={organizations
                  .filter(org => org && org.id && org.displayName) // Additional safety filter
                  .map(org => ({
                    value: org.id,
                    label: org.displayName
                  }))
                }
                placeholder={t('formComponent.selectOrganization')}
                disabled={mode === 'edit' || loadingOrganizations}
                loading={loadingOrganizations}
                emptyMessage="Không có tổ chức nào có sẵn"
                className="w-full"
              />
              {loadingOrganizations && (
                <p className="mt-1 text-xs text-gray-500">{t('formComponent.loadingOrganizations')}</p>
              )}
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('formComponent.campaignNameLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={t('formComponent.campaignNamePlaceholder')}
                required
              />
            </div>
          </div>

          {/* Row 2: Ngày bắt đầu và Giờ bắt đầu */}
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('formComponent.startDateLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('formComponent.startTimeLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Row 3: Ngày kết thúc và Giờ kết thúc */}
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('formComponent.endDateLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('formComponent.endTimeLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Row 4: Mô tả */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('formComponent.descriptionLabel')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder={t('formComponent.descriptionPlaceholder')}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <X className="inline w-4 h-4 mr-2" />
            {t('formComponent.cancelButton')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Save className="inline w-4 h-4 mr-2" />
            {loading ? t('formComponent.savingButton') : t('formComponent.saveButton')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentCampaignForm;
