import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, History, ArrowLeft } from 'lucide-react';
import PendingPaymentsList from './components/PendingPaymentsList';
import PaymentHistoryList from './components/PaymentHistoryList';

type TabType = 'pending' | 'history';

export const MyPaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get active tab from URL
  const getActiveTabFromUrl = (): TabType => {
    const pathname = location.pathname;
    if (pathname.includes('/history')) return 'history';
    return 'pending';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getActiveTabFromUrl());

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Update URL without page reload
    const newPath = tab === 'history' ? '/my-payments/history' : '/my-payments/pending';
    navigate(newPath, { replace: true });
  };

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="p-2 text-gray-400 transition-colors hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Đóng Phí của Tôi
                </h1>
                <p className="text-sm text-gray-500">
                  Quản lý các khoản phí và lịch sử thanh toán
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4" />
                <span>Khoản Phí Cần Đóng</span>
              </div>
            </button>
            <button
              onClick={() => handleTabChange('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span>Lịch Sử Thanh Toán</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {activeTab === 'pending' && <PendingPaymentsList />}
        {activeTab === 'history' && <PaymentHistoryList />}
      </div>
    </div>
  );
};

export default MyPaymentPage;
