import React from 'react';
import { useTranslation } from 'react-i18next';
import FeeLevelManager from '../FeeLevelManager';
import { PaymentCampaign, PaymentFeeLevel } from '../../../types';

interface FeeLevelTabProps {
  campaign: PaymentCampaign;
  feeLevels: PaymentFeeLevel[];
  onFeeLevelsChange: (feeLevels: PaymentFeeLevel[]) => void;
  onError: (error: string) => void;
}

const FeeLevelTab: React.FC<FeeLevelTabProps> = ({ 
  campaign,
  feeLevels: _feeLevels,
  onFeeLevelsChange,
  onError: _onError
}) => {
  const { t } = useTranslation('feeLevels');
  const readOnly = campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED';

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          {t('title')}
          {readOnly && (
            <span className="ml-2 text-orange-600 dark:text-orange-400">
              ({t('readOnlyMode')} {campaign.status === 'COMPLETED' ? t('completed') : t('cancelled')})
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('tabDescription', { campaignName: campaign.name })}
        </p>
      </div>
      
      <FeeLevelManager 
        campaignId={campaign.id} 
        readOnly={readOnly}
        onFeeLevelsChange={onFeeLevelsChange}
      />
    </div>
  );
};

export default FeeLevelTab;
