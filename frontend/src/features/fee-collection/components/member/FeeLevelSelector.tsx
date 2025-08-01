import React from 'react';
import { PaymentFeeLevel } from '../../types';

interface FeeLevelSelectorProps {
  feeLevels: PaymentFeeLevel[];
  selectedId: string;
  onSelect: (id: string) => void;
  currentAmount: number;
}

const FeeLevelSelector: React.FC<FeeLevelSelectorProps> = ({
  feeLevels,
  selectedId,
  onSelect,
  currentAmount
}) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Chọn mức phí
      </label>
      
      <div className="space-y-2">
        {feeLevels.map((level) => (
          <div
            key={level.id}
            className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedId === level.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => onSelect(level.id)}
          >
            <input
              type="radio"
              id={`fee-level-${level.id}`}
              name="feeLevel"
              value={level.id}
              checked={selectedId === level.id}
              onChange={() => onSelect(level.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            
            <label
              htmlFor={`fee-level-${level.id}`}
              className="ml-3 flex-1 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {level.levelName}
                  </div>
                  {level.description && (
                    <div className="text-sm text-gray-500">
                      {level.description}
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatAmount(level.amount)}
                  </div>
                  {level.amount !== currentAmount && (
                    <div className="text-xs text-blue-600">
                      {level.amount > currentAmount ? 'Tăng' : 'Giảm'} {formatAmount(Math.abs(level.amount - currentAmount))}
                    </div>
                  )}
                </div>
              </div>
            </label>
          </div>
        ))}
      </div>
      
      {selectedId && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <span className="font-medium">Số tiền sẽ thanh toán: </span>
            {formatAmount(feeLevels.find(level => level.id === selectedId)?.amount || 0)}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeLevelSelector;
