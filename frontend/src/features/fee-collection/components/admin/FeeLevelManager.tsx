import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { 
  PaymentFeeLevel, 
  CreatePaymentFeeLevelDto, 
  UpdatePaymentFeeLevelDto 
} from '../../types';
import { paymentFeeLevelService } from '@/shared/services/fee-collection-service';

interface FeeLevelManagerProps {
  campaignId: string;
  readOnly?: boolean;
  onFeeLevelsChange?: (feeLevels: PaymentFeeLevel[]) => void;
}

interface FeeLevelFormData {
  levelName: string;
  amount: number;
  description: string;
}

const FeeLevelManager: React.FC<FeeLevelManagerProps> = ({ campaignId, readOnly = false, onFeeLevelsChange }) => {
  const { t } = useTranslation('feeLevels');
  const [feeLevels, setFeeLevels] = useState<PaymentFeeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FeeLevelFormData>({
    levelName: '',
    amount: 0,
    description: '',
  });

  useEffect(() => {
    loadFeeLevels();
  }, [campaignId]);

  const loadFeeLevels = async () => {
    try {
      setLoading(true);
      const response : any = await paymentFeeLevelService.getFeeLevelsByCampaign(campaignId);
      const sortedFeeLevels = response?.sort((a: { orderIndex: number; }, b: { orderIndex: number; }) => a.orderIndex - b.orderIndex);
      setFeeLevels(sortedFeeLevels);
      
      // Notify parent component about fee levels change
      if (onFeeLevelsChange) {
        onFeeLevelsChange(sortedFeeLevels);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      levelName: '',
      amount: 0,
      description: '',
    });
    setEditingId(null);
    setIsCreating(false);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const startEdit = (feeLevel: PaymentFeeLevel) => {
    setFormData({
      levelName: feeLevel.levelName,
      amount: feeLevel.amount,
      description: feeLevel.description,
    });
    setEditingId(feeLevel.id);
    setIsCreating(false);
  };

  const validateForm = (): boolean => {
    if (!formData.levelName.trim()) {
      setError(t('validation.nameRequired'));
      return false;
    }
    
    if (formData.amount <= 0) {
      setError(t('validation.amountGreaterThanZero'));
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setError(null);
      
      if (isCreating) {
        const createData: CreatePaymentFeeLevelDto = {
          levelName: formData.levelName,
          amount: formData.amount,
          description: formData.description,
        };
        
        await paymentFeeLevelService.createFeeLevel(campaignId, createData);
      } else if (editingId) {
        const updateData: UpdatePaymentFeeLevelDto = {
          levelName: formData.levelName,
          amount: formData.amount,
          description: formData.description,
        };
        
        await paymentFeeLevelService.updateFeeLevel(campaignId, editingId, updateData);
      }
      
      resetForm();
      loadFeeLevels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save fee level');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('actions.confirmDelete'))) return;
    
    try {
      await paymentFeeLevelService.deleteFeeLevel(campaignId, id);
      loadFeeLevels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fee level');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('title')}</h3>
        {!readOnly && (
          <button
            onClick={startCreate}
            className="inline-flex items-center px-3 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('actions.addFeeLevel')}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50 dark:bg-red-900 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && !readOnly && (
        <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <h4 className="mb-3 font-medium text-gray-900 dark:text-white">
            {isCreating ? t('actions.addNewFeeLevel') : t('actions.editFeeLevel')}
          </h4>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('form.levelName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.levelName}
                onChange={(e) => setFormData(prev => ({ ...prev, levelName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={t('form.levelNamePlaceholder')}
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('form.amount')} <span className="text-red-500">*</span>
              </label>
              <input
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="50000"
                min="1"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('form.description')}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={t('form.descriptionPlaceholder')}
              />
            </div>
          </div>

          <div className="flex items-center justify-end mt-4 space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <X className="inline w-4 h-4 mr-1" />
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              className="px-3 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Save className="inline w-4 h-4 mr-1" />
              {t('actions.save')}
            </button>
          </div>
        </form>
      )}

      {/* Fee Levels List */}
      {feeLevels.length === 0 ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          {t('noFeeLevels')}
        </div>
      ) : (
        <div className="space-y-3">
          {feeLevels.map((level) => (
            <div key={level.id} className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{level.levelName}</h4>
                  </div>
                  
                  <div className="mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {formatAmount(level.amount)}
                  </div>
                  
                  {level.description && (
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {level.description}
                    </div>
                  )}
                  
                </div>

                {!readOnly && (
                  <div className="flex items-center ml-4 space-x-2">
                    <button
                      onClick={() => startEdit(level)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title={t('actions.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(level.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title={t('actions.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeeLevelManager;
