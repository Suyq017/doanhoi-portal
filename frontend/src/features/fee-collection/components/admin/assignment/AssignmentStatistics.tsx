import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, DollarSign, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface AssignmentStatisticsProps {
  campaignId: string;
  stats: {
    totalAssignments: number;
    pendingCount: number;
    paidCount: number;
    overdueCount: number;
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
  const { t } = useTranslation('memberAssignments');
  
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
        text: t('statistics.overdueDays', { days: Math.abs(daysUntilDue) }),
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900',
        borderColor: 'border-red-200 dark:border-red-800'
      };
    } else if (daysUntilDue <= 3) {
      return {
        text: t('statistics.expiringSoon', { days: daysUntilDue }),
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900',
        borderColor: 'border-orange-200 dark:border-orange-800'
      };
    } else if (daysUntilDue <= 7) {
      return {
        text: t('statistics.daysRemaining', { days: daysUntilDue }),
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
      };
    } else {
      return {
        text: t('statistics.daysRemaining', { days: daysUntilDue }),
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900',
        borderColor: 'border-green-200 dark:border-green-800'
      };
    }
  };

  const collectionStatus = getCollectionStatus();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="w-1/3 h-8 mb-4 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
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
          <h3 className="flex items-center text-lg font-medium text-gray-900 dark:text-white">
            {t('statistics.title')}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('statistics.subtitle')}
          </p>
        </div>
      </div>

      {/* Due Date Status */}
      <div className={`${collectionStatus.bgColor} border ${collectionStatus.borderColor} rounded-lg p-4`}>
        <div className="flex items-center space-x-3">
          <Clock className={`w-5 h-5 ${collectionStatus.color}`} />
          <div>
            <h4 className={`text-sm font-medium ${collectionStatus.color}`}>
              {t('statistics.collectionStatus')}
            </h4>
            <p className={`text-sm ${collectionStatus.color} mt-1`}>
              {t('statistics.dueDate', { date: formatDate(campaignEndDate) })} - {collectionStatus.text}
            </p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Assignments */}
        <div className="p-6 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('statistics.totalMembers')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAssignments}</p>
            </div>
          </div>
        </div>

        {/* Remaining Amount */}
        <div className="p-6 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900">
              <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('statistics.uncollected')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(stats.totalAmount - stats.totalPaidAmount)}</p>
            </div>
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-6 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('statistics.collected')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatAmount(stats.totalPaidAmount)}</p>
            </div>
          </div>
        </div>

        {/* Total Expected */}
        <div className="p-6 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('statistics.totalExpected')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatAmount(stats.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="p-6 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <h4 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">{t('statistics.statusAnalysis')}</h4>
        
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
          {/* Pending */}
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-yellow-100 rounded-lg dark:bg-yellow-900">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('status.pending')}</div>
          </div>

          {/* Paid */}
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-green-100 rounded-lg dark:bg-green-900">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.paidCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('status.paid')}</div>
          </div>

          {/* Overdue */}
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-red-100 rounded-lg dark:bg-red-900">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdueCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('status.overdue')}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('statistics.collectionProgress')}</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatPercentage(stats.paymentRate)}</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full dark:bg-gray-700">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(stats.paymentRate)}`}
              style={{ width: `${Math.min(stats.paymentRate, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatAmount(stats.totalPaidAmount)}</span>
            <span>{formatAmount(stats.totalAmount)}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AssignmentStatistics;
