import { useState, useEffect, useCallback } from 'react';

interface PaymentTransaction {
  id: string;
  assignmentId: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  payosOrderCode: number;
  payosPaymentLinkId?: string;
  checkoutUrl?: string;
  qrCode?: string;
  description: string;
  createdAt: string;
  paidAt?: string;
  payosWebhookData?: string;
  signatureVerified?: boolean;
}

interface CreatePaymentTransactionData {
  assignmentId: string;
  amount: number;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

interface PaymentTransactionFilters {
  campaignId?: string;
  organizationId?: string;
  status?: string;
  userId?: string;
  assignmentId?: string;
}

interface PaymentTransactionStats {
  totalTransactions: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  cancelledCount: number;
  totalAmount: number;
  averageAmount: number;
  successRate: number;
}

export const usePaymentTransactions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create payment transaction
  const createTransaction = useCallback(async (data: CreatePaymentTransactionData): Promise<PaymentTransaction | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/payment/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create payment transaction');
      }

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Transaction creation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get transaction by ID
  const getTransaction = useCallback(async (id: string): Promise<PaymentTransaction | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/payment/transactions/${id}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch transaction');
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

  // Get transaction by order code
  const getTransactionByOrderCode = useCallback(async (orderCode: number): Promise<PaymentTransaction | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/payment/transactions/order/${orderCode}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch transaction');
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

  // Check payment status
  const checkPaymentStatus = useCallback(async (orderCode: number): Promise<any | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/payment/transactions/${orderCode}/status`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to check payment status');
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

  // Cancel payment transaction
  const cancelTransaction = useCallback(async (orderCode: number, reason?: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/payment/transactions/${orderCode}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to cancel transaction');
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

  // Get transactions by assignment
  const getTransactionsByAssignment = useCallback(async (assignmentId: string): Promise<PaymentTransaction[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/payment/transactions/assignment/${assignmentId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch transactions');
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

  // Get transaction statistics
  const getTransactionStatistics = useCallback(async (filters?: PaymentTransactionFilters): Promise<PaymentTransactionStats | null> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.campaignId) params.append('campaignId', filters.campaignId);
      if (filters?.organizationId) params.append('organizationId', filters.organizationId);

      const response = await fetch(`/payment/transactions/statistics?${params}`);
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

  return {
    loading,
    error,
    createTransaction,
    getTransaction,
    getTransactionByOrderCode,
    checkPaymentStatus,
    cancelTransaction,
    getTransactionsByAssignment,
    getTransactionStatistics,
    clearError: () => setError(null),
  };
};

// Hook for real-time payment status tracking
export const usePaymentStatusTracker = (orderCode: number | null, options?: {
  pollInterval?: number;
  stopOnPaid?: boolean;
}) => {
  const [status, setStatus] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { checkPaymentStatus } = usePaymentTransactions();
  const pollInterval = options?.pollInterval || 10000; // 10 seconds default
  const stopOnPaid = options?.stopOnPaid ?? true;

  const checkStatus = useCallback(async () => {
    if (!orderCode) return;

    try {
      setLoading(true);
      const result = await checkPaymentStatus(orderCode);
      
      if (result) {
        setTransaction(result.transaction);
        setStatus(result.transaction.status);
        setError(null);
      }
    } catch (err) {
      setError('Failed to check payment status');
    } finally {
      setLoading(false);
    }
  }, [orderCode, checkPaymentStatus]);

  useEffect(() => {
    if (!orderCode) return;

    // Initial check
    checkStatus();

    // Set up polling
    const interval = setInterval(() => {
      if (stopOnPaid && status === 'PAID') {
        clearInterval(interval);
        return;
      }
      checkStatus();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [orderCode, checkStatus, pollInterval, status, stopOnPaid]);

  return {
    status,
    transaction,
    loading,
    error,
    refetch: checkStatus,
  };
};

// Hook for payment process workflow
export const usePaymentProcess = () => {
  const [currentStep, setCurrentStep] = useState<'select' | 'confirm' | 'payment' | 'result'>('select');
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<PaymentTransaction | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const { createTransaction } = usePaymentTransactions();

  const startPayment = useCallback(async (assignmentId: string, amount: number, description?: string) => {
    try {
      setProcessingError(null);
      setCurrentStep('payment');

      const transaction = await createTransaction({
        assignmentId,
        amount,
        description,
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
      });

      if (transaction) {
        setPaymentTransaction(transaction);
        setSelectedAssignment(assignmentId);
        return transaction;
      } else {
        throw new Error('Failed to create payment transaction');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment creation failed';
      setProcessingError(errorMessage);
      setCurrentStep('select');
      return null;
    }
  }, [createTransaction]);

  const resetPaymentProcess = useCallback(() => {
    setCurrentStep('select');
    setSelectedAssignment(null);
    setPaymentTransaction(null);
    setProcessingError(null);
  }, []);

  const goToStep = useCallback((step: typeof currentStep) => {
    setCurrentStep(step);
  }, []);

  return {
    currentStep,
    selectedAssignment,
    paymentTransaction,
    processingError,
    startPayment,
    resetPaymentProcess,
    goToStep,
    setSelectedAssignment,
  };
};
