import { useState, useEffect, useCallback } from 'react';
import {
  PaymentCampaign,
  PaymentCampaignFilters,
  PaymentCampaignListState,
  CreatePaymentCampaignDto,
  UpdatePaymentCampaignDto
} from '../../features/fee-collection/types';
import { paymentCampaignService } from '../services/fee-collection-service';

export const usePaymentCampaigns = (initialFilters: PaymentCampaignFilters = {}) => {
  const [state, setState] = useState<PaymentCampaignListState>({
    campaigns: [],
    loading: true,
    error: null,
    filters: { page: 1, limit: 10, ...initialFilters },
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    }
  });

  const loadCampaigns = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await paymentCampaignService.getPaymentCampaigns(state.filters);
      
      setState(prev => ({
        ...prev,
        campaigns: response.data,
        pagination: {
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages
        },
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load campaigns',
        loading: false
      }));
    }
  };

  const updateFilters = (newFilters: Partial<PaymentCampaignFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  };

  const resetFilters = () => {
    setState(prev => ({
      ...prev,
      filters: { page: 1, limit: 10 }
    }));
  };

  // Reload when filters change
  useEffect(() => {
    loadCampaigns();
  }, [state.filters]);

  return {
    ...state,
    loadCampaigns,
    updateFilters,
    resetFilters,
    refetch: loadCampaigns
  };
};

export const usePaymentCampaign = (id?: string) => {
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampaign = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await paymentCampaignService.getPaymentCampaignById(id);
      setCampaign(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadCampaign();
    }
  }, [id]);

  return {
    campaign,
    loading,
    error,
    refetch: loadCampaign
  };
};

export const useCreatePaymentCampaign = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCampaign = async (data: CreatePaymentCampaignDto): Promise<PaymentCampaign | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await paymentCampaignService.createPaymentCampaign(data);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createCampaign,
    loading,
    error
  };
};

export const useUpdatePaymentCampaign = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCampaign = async (id: string, data: UpdatePaymentCampaignDto): Promise<PaymentCampaign | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await paymentCampaignService.updatePaymentCampaign(id, data);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateCampaign,
    loading,
    error
  };
};

export const useDeletePaymentCampaign = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCampaign = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await paymentCampaignService.deletePaymentCampaign(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteCampaign,
    loading,
    error
  };
};

export const useCampaignStatusActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activateCampaign = async (id: string): Promise<PaymentCampaign | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await paymentCampaignService.activatePaymentCampaign(id);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate campaign');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const completeCampaign = async (id: string): Promise<PaymentCampaign | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await paymentCampaignService.completePaymentCampaign(id);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete campaign');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelCampaign = async (id: string): Promise<PaymentCampaign | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await paymentCampaignService.cancelPaymentCampaign(id);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel campaign');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    activateCampaign,
    completeCampaign,
    cancelCampaign,
    loading,
    error
  };
};
