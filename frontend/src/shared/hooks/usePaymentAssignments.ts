import { useState, useEffect, useCallback } from 'react';

interface PaymentAssignment {
  id: string;
  campaignId: string;
  userId: string;
  feeLevelId?: string;
  note?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  dueDate?: string;
  assignedAt: string;
  paidAt?: string;
  assignedById: string;
  campaign: {
    id: string;
    name: string;
    description?: string;
    status: string;
    startDate: string;
    endDate: string;
    organization: {
      id: string;
      name: string;
    };
  };
  user: {
    id: string;
    username: string;
    fullName: string;
    email?: string;
  };
  feeLevel?: {
    id: string;
    levelName: string;
    amount: number;
    description?: string;
  };
  transactions?: any[];
}

export type { PaymentAssignment };

interface CreatePaymentAssignmentData {
  campaignId: string;
  userId: string;
  feeLevelId?: string;
  amount?: number;
  dueDate?: string;
  notes?: string;
}

interface UpdatePaymentAssignmentData {
  amount?: number;
  dueDate?: string;
  notes?: string;
  status?: 'PENDING' | 'PAID' | 'OVERDUE';
}

interface PaymentAssignmentFilters {
  campaignId?: string;
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface PaymentAssignmentStats {
  totalAssignments: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  totalPaidAmount: number;
  totalAmount: number;
  averageAmount: number;
  paymentRate: number;
}

export const usePaymentAssignments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create assignment
  const createAssignment = useCallback(async (data: CreatePaymentAssignmentData): Promise<PaymentAssignment | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payment/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create assignment');
      }

      return result.success ? result.data : null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create bulk assignments
  const createBulkAssignments = useCallback(async (assignments: CreatePaymentAssignmentData[]): Promise<PaymentAssignment[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payment/assignments/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignments),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create bulk assignments');
      }

      return result.success ? result.data : [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  // Get assignments with filters
  const getAssignments = useCallback(async (filters?: PaymentAssignmentFilters) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.campaignId) params.append('campaignId', filters.campaignId);
      if (filters?.userId) params.append('userId', filters.userId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const url = `/api/payment/assignments?${params}`;

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch assignments');
      }

      return result.success ? result.data : { assignments: [], pagination: null };
    } catch (err) {
      console.error('[usePaymentAssignments] API Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { assignments: [], pagination: null };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get assignment by ID
  const getAssignment = useCallback(async (id: string): Promise<PaymentAssignment | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/payment/assignments/${id}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch assignment');
      }

      return result.success ? result.data : null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update assignment
  const updateAssignment = useCallback(async (id: string, data: UpdatePaymentAssignmentData): Promise<PaymentAssignment | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/payment/assignments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update assignment');
      }

      return result.success ? result.data : null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark assignment as paid
  const markAsPaid = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/payment/assignments/${id}/mark-paid`, {
        method: 'PATCH',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to mark assignment as paid');
      }

      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark assignment as overdue
  const markAsOverdue = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/payment/assignments/${id}/mark-overdue`, {
        method: 'PATCH',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to mark assignment as overdue');
      }

      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete assignment
  const deleteAssignment = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/payment/assignments/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete assignment');
      }

      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get assignment statistics
  const getAssignmentStatistics = useCallback(async (campaignId?: string, organizationId?: string): Promise<PaymentAssignmentStats | null> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (campaignId) params.append('campaignId', campaignId);
      if (organizationId) params.append('organizationId', organizationId);

      const response = await fetch(`/api/payment/assignments/statistics?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch statistics');
      }

      return result.success ? result.data : null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check overdue assignments
  const checkOverdueAssignments = useCallback(async (): Promise<number> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payment/assignments/check-overdue', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to check overdue assignments');
      }

      return result.success ? result.data.updatedCount : 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get current user's assignments
  const getUserAssignments = useCallback(async (): Promise<PaymentAssignment[]> => {
    try {
      setLoading(true);
      setError(null);

      // Get current user from auth
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('User not authenticated');
      }

      const user = JSON.parse(userData);
      if (!user?.id) {
        throw new Error('User ID not found');
      }

      // Use the existing getAssignments endpoint with userId filter
      const result = await getAssignments({ userId: user.id });

      return result.assignments || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getAssignments]);

  return {
    loading,
    error,
    createAssignment,
    createBulkAssignments,
    getAssignments,
    getAssignment,
    updateAssignment,
    markAsPaid,
    markAsOverdue,
    deleteAssignment,
    getAssignmentStatistics,
    checkOverdueAssignments,
    getUserAssignments,
    clearError: () => setError(null),
  };
};

// Hook for user's payment assignments
export const useMyPaymentAssignments = (userId?: string) => {
  const [assignments, setAssignments] = useState<PaymentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getAssignments } = usePaymentAssignments();

  const fetchMyAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getAssignments({ userId });
      if (result.assignments) {
        setAssignments(result.assignments);
      }
    } catch (err) {
      setError('Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  }, [userId, getAssignments]);

  useEffect(() => {
    if (userId) {
      fetchMyAssignments();
    }
  }, [userId, fetchMyAssignments]);

  return {
    assignments,
    loading,
    error,
    refetch: fetchMyAssignments,
  };
};

// Hook for assignment management by campaign
export const useCampaignAssignments = (campaignId: string) => {
  const [assignments, setAssignments] = useState<PaymentAssignment[]>([]);
  const [stats, setStats] = useState<PaymentAssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getAssignments, getAssignmentStatistics } = usePaymentAssignments();

  const fetchCampaignData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [assignmentsResult, statsResult] = await Promise.all([
        getAssignments({ campaignId }),
        getAssignmentStatistics(campaignId)
      ]);

      if (assignmentsResult.assignments) {
        setAssignments(assignmentsResult.assignments);
      }

      if (statsResult) {
        setStats(statsResult);
      }
    } catch (err) {
      setError('Failed to fetch campaign assignments');
    } finally {
      setLoading(false);
    }
  }, [campaignId, getAssignments, getAssignmentStatistics]);

  useEffect(() => {
    if (campaignId) {
      fetchCampaignData();
    }
  }, [campaignId, fetchCampaignData]);

  return {
    assignments,
    stats,
    loading,
    error,
    refetch: fetchCampaignData,
  };
};
