import React from 'react';
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
  const readOnly = campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED';

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          Quản Lý Mức Phí
          {readOnly && (
            <span className="ml-2 text-orange-600 dark:text-orange-400">
              (Chỉ xem - đợt đã {campaign.status === 'COMPLETED' ? 'hoàn thành' : 'hủy'})
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Cấu hình các mức phí cho đợt đóng phí "{campaign.name}".

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
