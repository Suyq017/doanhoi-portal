import React from 'react';
import { Users, DollarSign, TrendingUp, Clock, CheckCircle, AlertTriangle, XCircle, BarChart3 } from 'lucide-react';

interface AssignmentStatisticsProps {
  campaignId: string;
  stats: {
    totalAssignments: number;
    pendingCount: number;
    paidCount: number;
    overdueCount: number;
    exemptedCount: number;
    totalPaidAmount: number;
    totalAmount: number;
    averageAmount: number;
    paymentRate: number;
  };
  campaignEndDate: string;
  loading?: boolean;
}

const AssignmentStatistics: React.FC<AssignmentStatisticsProps> = ({
  stats,
  campaignEndDate,
  loading = false
}) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getDaysUntilDue = () => {
    const now = new Date();
    const dueDate = new Date(campaignEndDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();
  const isOverdue = daysUntilDue < 0;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCollectionStatus = () => {
    if (isOverdue) {
      return {
        text: `Đã quá hạn ${Math.abs(daysUntilDue)} ngày`,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    } else if (daysUntilDue <= 3) {
      return {
        text: `Sắp hết hạn (còn ${daysUntilDue} ngày)`,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    } else if (daysUntilDue <= 7) {
      return {
        text: `Còn ${daysUntilDue} ngày`,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    } else {
      return {
        text: `Còn ${daysUntilDue} ngày`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }
  };

  const collectionStatus = getCollectionStatus();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-1/3 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Thống Kê Assignment
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Tổng quan về tình hình thu phí và thanh toán
          </p>
        </div>
      </div>

      {/* Due Date Status */}
      <div className={`${collectionStatus.bgColor} border ${collectionStatus.borderColor} rounded-lg p-4`}>
        <div className="flex items-center space-x-3">
          <Clock className={`w-5 h-5 ${collectionStatus.color}`} />
          <div>
            <h4 className={`text-sm font-medium ${collectionStatus.color}`}>
              Trạng Thái Thu Phí
            </h4>
            <p className={`text-sm ${collectionStatus.color} mt-1`}>
              Hạn thanh toán: {formatDate(campaignEndDate)} - {collectionStatus.text}
            </p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assignments */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tổng Assignment</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
            </div>
          </div>
        </div>

        {/* Payment Rate */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tỷ Lệ Thanh Toán</p>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(stats.paymentRate)}</p>
            </div>
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Đã Thu</p>
              <p className="text-xl font-bold text-gray-900">{formatAmount(stats.totalPaidAmount)}</p>
            </div>
          </div>
        </div>

        {/* Total Expected */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tổng Dự Kiến</p>
              <p className="text-xl font-bold text-gray-900">{formatAmount(stats.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Phân Tích Trạng Thái</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Pending */}
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-2">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</div>
            <div className="text-sm text-gray-600">Chờ đóng</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatPercentage((stats.pendingCount / stats.totalAssignments) * 100)}
            </div>
          </div>

          {/* Paid */}
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.paidCount}</div>
            <div className="text-sm text-gray-600">Đã đóng</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatPercentage((stats.paidCount / stats.totalAssignments) * 100)}
            </div>
          </div>

          {/* Overdue */}
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mx-auto mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
            <div className="text-sm text-gray-600">Quá hạn</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatPercentage((stats.overdueCount / stats.totalAssignments) * 100)}
            </div>
          </div>

          {/* Exempted */}
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2">
              <XCircle className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-600">{stats.exemptedCount}</div>
            <div className="text-sm text-gray-600">Miễn đóng</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatPercentage((stats.exemptedCount / stats.totalAssignments) * 100)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Tiến độ thu phí</span>
            <span className="font-medium">{formatPercentage(stats.paymentRate)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(stats.paymentRate)}`}
              style={{ width: `${Math.min(stats.paymentRate, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatAmount(stats.totalPaidAmount)}</span>
            <span>{formatAmount(stats.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Tổng Kết Tài Chính</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Số tiền đã thu:</span>
              <span className="font-medium text-green-600">{formatAmount(stats.totalPaidAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Số tiền dự kiến:</span>
              <span className="font-medium">{formatAmount(stats.totalAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-900 font-medium">Còn thiếu:</span>
              <span className="font-bold text-red-600">
                {formatAmount(stats.totalAmount - stats.totalPaidAmount)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Số tiền trung bình:</span>
              <span className="font-medium">{formatAmount(stats.averageAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tỷ lệ hoàn thành:</span>
              <span className="font-medium">{formatPercentage(stats.paymentRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Hiệu quả thu phí:</span>
              <span className={`font-medium ${stats.paymentRate >= 80 ? 'text-green-600' : stats.paymentRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {stats.paymentRate >= 80 ? 'Rất tốt' : stats.paymentRate >= 50 ? 'Trung bình' : 'Cần cải thiện'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Hạn thu phí:</span>
              <span className="font-medium">{formatDate(campaignEndDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Trạng thái:</span>
              <span className={`font-medium ${collectionStatus.color}`}>
                {isOverdue ? 'Quá hạn' : 'Trong hạn'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Thời gian còn lại:</span>
              <span className={`font-medium ${collectionStatus.color}`}>
                {collectionStatus.text}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentStatistics;
