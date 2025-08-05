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
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          Quản Lý Mức Phí
        </h3>
        <p className="text-sm text-gray-600">
          Cấu hình các mức phí cho đợt đóng phí "{campaign.name}".
          {readOnly && (
            <span className="ml-2 text-orange-600">
              (Chỉ xem - đợt đã {campaign.status === 'COMPLETED' ? 'hoàn thành' : 'hủy'})
            </span>
          )}
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
