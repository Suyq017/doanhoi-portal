import React, { useState, useEffect } from 'react';
import { PaymentCampaign } from '../../../types';
import AssignmentStatistics from '../assignment/AssignmentStatistics';
import { paymentAssignmentService } from '@/shared/services/fee-collection-service';

interface StatisticsTabProps {
  campaign: PaymentCampaign;
}

interface AssignmentStats {
  totalAssignments: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  totalPaidAmount: number;
  totalAmount: number;
  averageAmount: number;
  paymentRate: number;
}

const StatisticsTab: React.FC<StatisticsTabProps> = ({ campaign }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AssignmentStats>({
    totalAssignments: 0,
    pendingCount: 0,
    paidCount: 0,
    overdueCount: 0,
    totalPaidAmount: 0,
    totalAmount: 0,
    averageAmount: 0,
    paymentRate: 0
  });

  // Fetch statistics
  useEffect(() => {
    fetchStatistics();
  }, [campaign.id]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response: any = await paymentAssignmentService.getAssignmentsByCampaign(campaign.id);
      const assignments = response.data?.assignments || [];
      
      const statsData = calculateStats(assignments);
      setStats({
        totalAssignments: statsData.totalAssignments,
        pendingCount: statsData.totalPending || 0,
        paidCount: statsData.totalPaid || 0,
        overdueCount: statsData.totalOverdue || 0,
        totalPaidAmount: statsData.totalPaidAmount || 0,
        totalAmount: statsData.totalAmount || 0,
        averageAmount: statsData.averageAmount || 0,
        paymentRate: statsData.paymentRate || 0
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (assignments: any[]) => {
    const total = assignments.length;
    
    if (total === 0) {
      return {
        totalAssignments: 0,
        totalPending: 0,
        totalPaid: 0,
        totalOverdue: 0,
        totalPaidAmount: 0,
        totalAmount: 0,
        averageAmount: 0,
        paymentRate: 0
      };
    }

    const pending = assignments.filter(a => a.status === 'PENDING').length;
    const paid = assignments.filter(a => a.status === 'PAID').length;
    const overdue = assignments.filter(a => a.status === 'OVERDUE').length;

    const totalPaidAmount = assignments
      .filter(a => a.status === 'PAID')
      .reduce((sum, a) => {
        const amount = a.feeLevel?.amount || 0;
        return sum + amount;
      }, 0);

    const totalAmount = assignments.reduce((sum, a) => {
      const amount = a.feeLevel?.amount || 0;
      return sum + amount;
    }, 0);
    const averageAmount = totalAmount / total;
    const paymentRate = total > 0 ? (paid / total) * 100 : 0;

    return {
      totalAssignments: total,
      totalPending: pending,
      totalPaid: paid,
      totalOverdue: overdue,
      totalPaidAmount,
      totalAmount,
      averageAmount,
      paymentRate
    };
  };

  return (
    <div className="space-y-6">
      <AssignmentStatistics
        campaignId={campaign.id}
        stats={stats}
        campaignEndDate={campaign.endDate}
        loading={loading}
      />
    </div>
  );
};

export default StatisticsTab;
