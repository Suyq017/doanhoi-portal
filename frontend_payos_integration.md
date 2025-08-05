Dựa trên yêu cầu của bạn, tôi sẽ lập lại kế hoạch chỉ sử dụng 2 API hiện có mà không tạo thêm/thay đổi API backend:

## Kế Hoạch Tích Hợp PayOS - Chỉ Sử Dụng API Hiện Có

### 1. **Phân Tích API Hiện Có**

#### API 1: `POST /api/payment/create-payment-link`
- **Chức năng**: Tạo link thanh toán và redirect đến PayOS checkout
- **Input**: `{ amount, description, organizationId, returnUrl?, cancelUrl? }`
- **Output**: Redirect đến PayOS checkout page
- **Return URL**: Đã được config sẵn `${YOUR_DOMAIN}/payment-result/${orderCode}`

#### API 2: `GET /api/payment/check-status/:orderCode`
- **Chức năng**: Kiểm tra trạng thái thanh toán
- **Input**: `orderCode` (param) + `organizationId` (query)
- **Output**: JSON với thông tin trạng thái PayOS

### 2. **Kế Hoạch Frontend-Only Integration**

#### **Phase 1: Cập Nhật Payment Components**

##### 2.1. Modify PaymentQRCode Component
```tsx
// frontend/src/features/fee-collection/components/member/PaymentQRCode.tsx
const PaymentQRCode: React.FC<PaymentQRCodeProps> = ({
  assignment,
  feeLevelId,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentLink = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get amount from fee level or assignment
      const amount = feeLevelId 
        ? assignment.campaign?.feeLevels?.find(level => level.id === feeLevelId)?.amount || 0
        : assignment.customAmount || assignment.feeLevel?.amount || 0;

      // Prepare payment data
      const paymentData = {
        amount,
        description: `Thanh toán phí: ${assignment.campaign?.name}`,
        organizationId: assignment.campaign?.organizationId,
        returnUrl: `${window.location.origin}/payment-result`, // PayOS sẽ append orderCode
        cancelUrl: `${window.location.origin}/payment/my-campaigns`
      };

      // Call existing create-payment-link API (sẽ redirect)
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/payment/create-payment-link';
      form.target = '_blank'; // Mở trong tab mới

      Object.keys(paymentData).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = paymentData[key];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

      // Đóng modal sau khi mở PayOS
      onClose();
      
    } catch (err) {
      setError('Không thể tạo link thanh toán. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Thanh toán PayOS
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Campaign Info */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-1">
              {assignment.campaign?.name}
            </h4>
            <p className="text-sm text-gray-600">
              {assignment.campaign?.organization?.name}
            </p>
          </div>

          {/* Amount Display */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Số tiền thanh toán</div>
              <div className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(amount)}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Payment Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">Hướng dẫn thanh toán</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Nhấn "Thanh toán PayOS" để mở cổng thanh toán</li>
              <li>Chọn phương thức thanh toán (QR Code hoặc Internet Banking)</li>
              <li>Hoàn tất thanh toán theo hướng dẫn</li>
              <li>Hệ thống sẽ tự động cập nhật trạng thái</li>
            </ol>
          </div>

          {/* Action Button */}
          <button
            onClick={createPaymentLink}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Đang tạo...</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                <span>Thanh toán PayOS</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
```

#### **Phase 2: Tạo Payment Result Page**

##### 2.2. PaymentResultPage Component
```tsx
// frontend/src/pages/member/PaymentResultPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Get organizationId from URL params (PayOS có thể truyền về)
  const organizationId = searchParams.get('organizationId') || 'default';

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
  }, [orderCode]);

  const checkPaymentStatus = async () => {
    if (!orderCode) return;
    
    try {
      setChecking(true);
      setError(null);

      // Call existing check-status API
      const response = await fetch(
        `/api/payment/check-status/${orderCode}?organizationId=${organizationId}`
      );
      
      if (!response.ok) {
        throw new Error('Không thể kiểm tra trạng thái thanh toán');
      }

      const data = await response.json();
      setPaymentStatus(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
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
          title: 'Thanh toán thành công!',
          message: 'Giao dịch của bạn đã được xử lý thành công.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800'
        };
      case 'CANCELLED':
        return {
          icon: <XCircle className="w-16 h-16 text-red-500" />,
          title: 'Thanh toán đã bị hủy',
          message: 'Giao dịch đã bị hủy.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800'
        };
      case 'EXPIRED':
        return {
          icon: <AlertTriangle className="w-16 h-16 text-orange-500" />,
          title: 'Thanh toán đã hết hạn',
          message: 'Link thanh toán đã hết hạn.',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800'
        };
      default:
        return {
          icon: <Clock className="w-16 h-16 text-blue-500" />,
          title: 'Đang xử lý thanh toán',
          message: 'Giao dịch đang được xử lý, vui lòng đợi.',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra trạng thái thanh toán...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Có lỗi xảy ra</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={checkPaymentStatus}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Thử lại</span>
              </button>
              <button
                onClick={() => navigate('/payment/my-campaigns')}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
              >
                Quay về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy giao dịch</h1>
            <p className="text-gray-600 mb-6">Mã giao dịch không hợp lệ hoặc đã bị xóa.</p>
            <button
              onClick={() => navigate('/payment/my-campaigns')}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Quay về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(paymentStatus.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b">
            <h1 className="text-lg font-semibold text-gray-900">
              Kết quả thanh toán
            </h1>
          </div>

          {/* Status Display */}
          <div className="p-6">
            <div className="text-center mb-6">
              {statusDisplay.icon}
              <h2 className="text-xl font-bold text-gray-900 mt-4 mb-2">
                {statusDisplay.title}
              </h2>
              <p className="text-gray-600">
                {statusDisplay.message}
              </p>
            </div>

            {/* Transaction Details */}
            <div className={`${statusDisplay.bgColor} ${statusDisplay.borderColor} border rounded-lg p-4 mb-6`}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Mã giao dịch:</span>
                  <span className="font-mono text-sm font-medium">{paymentStatus.orderCode}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Số tiền:</span>
                  <span className="font-bold text-lg text-indigo-600">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(paymentStatus.amount)}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600">Mô tả:</span>
                  <span className="text-sm text-right flex-1 ml-2">{paymentStatus.description}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Thời gian tạo:</span>
                  <span className="text-sm">
                    {new Date(paymentStatus.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                {/* Payment Transaction Info */}
                {paymentStatus.transactions && paymentStatus.transactions.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-2">Thông tin giao dịch:</div>
                    {paymentStatus.transactions.map((tx, index) => (
                      <div key={index} className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Số tài khoản:</span>
                          <span>{tx.accountNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Thời gian:</span>
                          <span>{new Date(tx.transactionDateTime).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-refresh indicator */}
            {paymentStatus.status === 'PENDING' && (
              <div className="flex items-center justify-center space-x-2 mb-6">
                <RefreshCw className={`w-4 h-4 text-blue-500 ${checking ? 'animate-spin' : ''}`} />
                <span className="text-sm text-gray-600">
                  {checking ? 'Đang kiểm tra...' : 'Tự động cập nhật mỗi 5 giây'}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {paymentStatus.status !== 'PAID' && (
                <button
                  onClick={checkPaymentStatus}
                  disabled={checking}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center space-x-2"
                >
                  {checking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Kiểm tra lại</span>
                    </>
                  )}
                </button>
              )}

              {paymentStatus.status === 'PAID' && (
                <button
                  onClick={() => navigate('/payment/history')}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium"
                >
                  Xem lịch sử thanh toán
                </button>
              )}

              {(paymentStatus.status === 'CANCELLED' || paymentStatus.status === 'EXPIRED') && (
                <button
                  onClick={() => navigate('/payment/my-campaigns')}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Thử thanh toán lại
                </button>
              )}

              <button
                onClick={() => navigate('/payment/my-campaigns')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 font-medium"
              >
                Quay về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### **Phase 3: Thêm Route và Update Components**

##### 2.3. Update App.tsx
```tsx
// frontend/src/App.tsx - Thêm route mới
import { PaymentResultPage } from './pages/member/PaymentResultPage';

// Thêm vào Routes:
<Route path="/payment-result/:orderCode" element={<PaymentResultPage />} />
```

##### 2.4. Update PaymentCampaignCard
```tsx
// frontend/src/shared/components/member/PaymentCampaignCard.tsx
// Thay thế PaymentQRCode component cũ bằng version mới sử dụng PayOS redirect
```

##### 2.5. Update usePaymentProcess Hook (Optional Enhancement)
```tsx
// frontend/src/features/fee-collection/hooks/usePaymentProcess.ts
export const usePaymentProcess = () => {
  const createPaymentRedirect = (paymentData: {
    amount: number;
    description: string;
    organizationId: string;
    returnUrl?: string;
    cancelUrl?: string;
  }) => {
    // Create form to submit to create-payment-link
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/payment/create-payment-link';
    form.target = '_blank';

    Object.keys(paymentData).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = paymentData[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const checkPaymentStatus = async (orderCode: string, organizationId: string) => {
    const response = await fetch(
      `/api/payment/check-status/${orderCode}?organizationId=${organizationId}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to check payment status');
    }
    
    return response.json();
  };

  return {
    createPaymentRedirect,
    checkPaymentStatus
  };
};
```

### 3. **Workflow Mới**

#### 3.1. User Journey:
1. **Member chọn campaign** → `MyCampaignsPage`
2. **Click "Thanh toán"** → `PaymentCampaignCard` → `PaymentQRCode` modal
3. **Click "Thanh toán PayOS"** → Form submit đến `/api/payment/create-payment-link`
4. **Redirect đến PayOS checkout** → PayOS handle payment
5. **Sau khi hoàn thành** → PayOS redirect về `/payment-result/${orderCode}`
6. **Auto-check status** → `PaymentResultPage` hiển thị kết quả

#### 3.2. Error Handling:
- Network errors khi call API
- Invalid orderCode
- Missing organizationId
- PayOS API timeout/errors

### 4. **Ưu Điểm Của Approach Này**

✅ **Không cần thay đổi backend APIs**
✅ **Sử dụng PayOS redirect flow chuẩn**
✅ **Auto-refresh payment status**
✅ **Responsive design cho mobile**
✅ **Error handling comprehensive**
✅ **User experience tốt với real-time updates**

### 5. **Implementation Timeline**

#### **Week 1**: Core Implementation
- [ ] Tạo `PaymentResultPage` component
- [ ] Update `PaymentQRCode` component với PayOS redirect
- [ ] Thêm route `/payment-result/:orderCode`
- [ ] Test basic flow

#### **Week 2**: Enhancement & Testing
- [ ] Implement auto-refresh mechanism
- [ ] Add error handling và loading states
- [ ] UI/UX improvements
- [ ] Cross-browser testing

#### **Week 3**: Integration & Polish
- [ ] Integration với existing fee collection system
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] User acceptance testing

Kế hoạch này đảm bảo tích hợp PayOS một cách hiệu quả mà không cần thay đổi bất kỳ API backend nào, chỉ tận dụng 2 endpoints hiện có để tạo ra trải nghiệm thanh toán hoàn chỉnh.