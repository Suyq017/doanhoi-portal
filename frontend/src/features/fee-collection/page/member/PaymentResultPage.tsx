import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { paymentService } from '../../../../shared/services/fee-collection-service';

interface PaymentStatus {
  id: string;
  orderCode: number;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  transactions?: Array<{
    reference: string;
    amount: number;
    accountNumber: string;
    description: string;
    transactionDateTime: string;
  }>;
}

export const PaymentResultPage: React.FC = () => {
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('paymentResult');
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (orderCode) {
      checkPaymentStatus();
      
      // Auto-refresh every 5 seconds if status is pending
      const interval = setInterval(() => {
        if (paymentStatus?.status === 'PENDING') {
          checkPaymentStatus();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [orderCode, paymentStatus?.status]);

  const checkPaymentStatus = async () => {
    if (!orderCode) return;
    
    try {
      setChecking(true);
      setError(null);

      // Call PayOS service để check status (không cần organizationId)
      const response : any = await paymentService.checkPaymentStatus(orderCode);
      setPaymentStatus(response?.data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.title'));
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return {
          icon: <CheckCircle className="w-16 h-16 text-green-500" />,
          title: t('status.paid.title'),
          message: t('status.paid.message'),
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800'
        };
      case 'CANCELLED':
        return {
          icon: <XCircle className="w-16 h-16 text-red-500" />,
          title: t('status.cancelled.title'),
          message: t('status.cancelled.message'),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800'
        };
      case 'EXPIRED':
        return {
          icon: <AlertTriangle className="w-16 h-16 text-orange-500" />,
          title: t('status.expired.title'),
          message: t('status.expired.message'),
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800'
        };
      default:
        return {
          icon: <Clock className="w-16 h-16 text-blue-500" />,
          title: t('status.pending.title'),
          message: t('status.pending.message'),
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">{t('loading.checkingStatus')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 mx-4 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="mb-2 text-xl font-bold text-gray-900">{t('error.title')}</h1>
            <p className="mb-6 text-gray-600">{error}</p>
            <div className="space-y-3">
              <button
                onClick={checkPaymentStatus}
                className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('error.tryAgain')}</span>
              </button>
              <button
                onClick={() => navigate('/payment/my-campaigns')}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t('error.backToHome')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 mx-4 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h1 className="mb-2 text-xl font-bold text-gray-900">{t('notFound.title')}</h1>
            <p className="mb-6 text-gray-600">{t('notFound.message')}</p>
            <button
              onClick={() => navigate('/payment/my-campaigns')}
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {t('notFound.backToHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(paymentStatus.status);

  return (
    <div className="min-h-screen py-8">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-area, .printable-area * {
              visibility: visible;
            }
            .printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
          }
          .print-only {
            display: none;
          }
        `
      }} />
      
      <div className="max-w-md px-4 mx-auto">
        <div className="overflow-hidden bg-white border-gray-500 rounded-lg shadow-lg printable-area">
          {/* Header */}
          <div className="px-6 py-4 text-center border-b bg-gray-50">
            <h1 className="text-lg font-semibold text-gray-900">
              {t('pageTitle')}
            </h1>
          </div>

          {/* Status Display */}
          <div className="p-6">
              <div className="mb-6 text-center">
                <div className="flex justify-center">
                  {statusDisplay.icon}
                </div>
                <h2 className="mt-4 mb-2 text-xl font-bold text-gray-900">
                  {statusDisplay.title}
                </h2>
                <p className="text-gray-600">
                  {statusDisplay.message}
                </p>
            </div>

            {/* Transaction Details */}
            <div className={`${statusDisplay.bgColor} ${statusDisplay.borderColor} border rounded-lg p-4 mb-6`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('details.orderCode')}</span>
                  <span className="font-mono text-sm font-medium">{paymentStatus.orderCode}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('details.amount')}</span>
                  <span className="text-lg font-bold text-indigo-600">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(paymentStatus.amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('details.createdAt')}</span>
                  <span className="text-sm">
                    {new Date(paymentStatus.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                {/* Payment Transaction Info */}
                {paymentStatus.transactions && paymentStatus.transactions.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="mb-2 text-sm font-medium text-gray-700">{t('details.transactionInfo')}</div>
                    {paymentStatus.transactions.map((tx, index) => (
                      <div key={index} className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('details.accountNumber')}</span>
                          <span>{tx.accountNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('details.transactionTime')}</span>
                          <span>{new Date(tx.transactionDateTime).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex items-start justify-between">
                          <span className="text-sm text-gray-600">{t('details.description')}</span>
                            <span className="flex-1 ml-2 text-sm text-right">
                            {tx.description.split(' ').slice(-4).join(' ')}
                            </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-refresh indicator */}
            {paymentStatus.status === 'PENDING' && (
              <div className="flex items-center justify-center mb-6 space-x-2 no-print">
                <RefreshCw className={`w-4 h-4 text-blue-500 ${checking ? 'animate-spin' : ''}`} />
                <span className="text-sm text-gray-600">
                  {checking ? t('autoRefresh.checking') : t('autoRefresh.interval')}
                </span>
              </div>
            )}

            {/* Print button - only show when payment is successful */}
            {/* {(paymentStatus.status === 'PAID' || paymentStatus.status === 'CANCELLED' || paymentStatus.status === 'EXPIRED') && (
              <div className="mb-4 no-print">
                <button
                  onClick={handlePrintResult}
                  className="flex items-center justify-center w-full px-4 py-3 space-x-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('print')}</span>
                </button>
              </div>
            )} */}

            {/* Action Buttons */}
            <div className="space-y-3 no-print">
              {paymentStatus.status === 'PAID' && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full px-4 py-3 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  {t('actions.backToDashboard')}
                </button>
              )}

              {(paymentStatus.status === 'CANCELLED' || paymentStatus.status === 'EXPIRED') && (
                <button
                  onClick={() => navigate('/payment/my-campaigns')}
                  className="w-full px-4 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {t('actions.retryPayment')}
                </button>
              )}

              <button
                onClick={() => navigate('/payment/my-campaigns')}
                className="w-full px-4 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t('actions.backToMyCampaigns')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage;
