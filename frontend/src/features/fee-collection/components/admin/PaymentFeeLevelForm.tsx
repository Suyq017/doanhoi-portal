import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CreatePaymentFeeLevelDto,
  UpdatePaymentFeeLevelDto,
  PaymentCampaign
} from '../../types';
import { paymentFeeLevelService, paymentCampaignService } from '@/shared/services/fee-collection-service';

interface PaymentFeeLevelFormProps {
  mode: 'create' | 'edit';
}

interface FeeLevelFormData {
  levelName: string;
  amount: number;
  description: string;
}

const PaymentFeeLevelForm: React.FC<PaymentFeeLevelFormProps> = ({ mode }) => {
  const { t } = useTranslation('feeLevels');
  const { campaignId, id } = useParams<{ campaignId: string; id?: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FeeLevelFormData>({
    levelName: '',
    amount: 0,
    description: '',
  });

  useEffect(() => {
    if (campaignId) {
      loadData();
    }
  }, [campaignId, id]);

  const loadData = async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const campaignResponse = await paymentCampaignService.getPaymentCampaignById(campaignId);
      setCampaign(campaignResponse);

      if (mode === 'edit' && id) {
        const feeLevelResponse = await paymentFeeLevelService.getFeeLevelById(campaignId, id);
        const levelData = feeLevelResponse.data;
        setFormData({
          levelName: levelData.levelName,
          amount: levelData.amount,
          description: levelData.description || '',
        });
      } else {
        // For create mode, get next order index
        const feeLevelsResponse = await paymentFeeLevelService.getFeeLevelsByCampaign(campaignId);
        setFormData(prev => ({
          ...prev,
          orderIndex: feeLevelsResponse.data.length
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.levelName.trim()) {
      setError(t('errors.nameRequired'));
      return false;
    }

    if (formData.amount <= 0) {
      setError(t('errors.amountInvalid'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !campaignId) return;

    try {
      setSaving(true);
      setError(null);

      if (mode === 'create') {
        const createData: CreatePaymentFeeLevelDto = {
          levelName: formData.levelName,
          amount: formData.amount,
          description: formData.description,
        };

        await paymentFeeLevelService.createFeeLevel(campaignId, createData);
      } else if (id) {
        const updateData: UpdatePaymentFeeLevelDto = {
          levelName: formData.levelName,
          amount: formData.amount,
          description: formData.description,
        };

        await paymentFeeLevelService.updateFeeLevel(campaignId, id, updateData);
      }

      navigate(`/portal/admin/payment-campaigns/${campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save fee level');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/portal/admin/payment-campaigns/${campaignId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="space-y-4">
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50">
          {error}
        </div>
        <button
          onClick={() => navigate('/portal/admin/payment-campaigns')}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/portal/admin/payment-campaigns/${campaignId}`)}
            className="inline-flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? t('addFeeLevel') : t('editFeeLevel')}
            </h1>
            <p className="text-sm text-gray-600">{campaign?.name}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="p-6 bg-white border rounded-lg">
          <h2 className="mb-4 text-lg font-medium text-gray-900">{t('title')}</h2>

          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                {t('levelName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.levelName}
                onChange={(e) => setFormData(prev => ({ ...prev, levelName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Sinh viên chính quy"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                {t('amount')} (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50000"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                {t('description')}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('form.descriptionPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <X className="inline w-4 h-4 mr-2" />
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="inline w-4 h-4 mr-2" />
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentFeeLevelForm;
