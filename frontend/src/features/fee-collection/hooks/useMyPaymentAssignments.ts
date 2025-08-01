import { useState, useEffect } from 'react';
import { paymentAssignmentService } from '../services/paymentAssignmentService';
import { PaymentAssignment } from '../types';

export const useMyPaymentAssignments = () => {
  const [assignments, setAssignments] = useState<PaymentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentAssignmentService.getMyAssignments();
      
      if (response.success && response.data) {
        setAssignments(response.data);
      } else {
        setError(response.message || 'Không thể tải danh sách khoản phí');
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const refetch = () => {
    fetchAssignments();
  };

  return {
    assignments,
    loading,
    error,
    refetch
  };
};
