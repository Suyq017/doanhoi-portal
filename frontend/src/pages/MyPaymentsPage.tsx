import React from 'react';
import { MyPaymentDashboard } from '../features/fee-collection';

const MyPaymentsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Khoản phí của tôi</h1>
        <p className="text-gray-600 mt-2">
          Quản lý và theo dõi tình trạng đóng phí của bạn
        </p>
      </div>
      
      <MyPaymentDashboard />
    </div>
  );
};

export default MyPaymentsPage;
