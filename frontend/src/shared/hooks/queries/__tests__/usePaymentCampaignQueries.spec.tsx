import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useAccessibleOrganizations,
  useCreatePaymentCampaign,
  useUpdatePaymentCampaign,
} from '../usePaymentCampaignQueries';
import { paymentCampaignKeys } from '../paymentCampaignKeys';
import type { CreatePaymentCampaignDto, Organization, PaymentCampaign, UpdatePaymentCampaignDto } from '../../../../features/fee-collection/types';

const { mockPaymentCampaignService } = vi.hoisted(() => ({
  mockPaymentCampaignService: {
    getAccessibleOrganizations: vi.fn(),
    createPaymentCampaign: vi.fn(),
    updatePaymentCampaign: vi.fn(),
  },
}));

vi.mock('../../../services/fee-collection-service', () => ({
  paymentCampaignService: mockPaymentCampaignService,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe('usePaymentCampaignQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches accessible organizations successfully', async () => {
    const orgs: Organization[] = [
      {
        id: 'org-1',
        name: 'Doan HCMUT',
        code: 'DOAN',
        type: 'system',
        level: 1,
        path: 'Doan HCMUT',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    mockPaymentCampaignService.getAccessibleOrganizations.mockResolvedValue(orgs);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAccessibleOrganizations(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPaymentCampaignService.getAccessibleOrganizations).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(orgs);
  });

  it('create mutation refetches list cache and sets detail cache', async () => {
    const payload: CreatePaymentCampaignDto = {
      organizationId: 'org-1',
      name: 'Campaign 2026',
      description: 'Description',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
    };

    const createdCampaign: PaymentCampaign = {
      id: 'campaign-1',
      organizationId: 'org-1',
      name: 'Campaign 2026',
      description: 'Description',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      status: 'DRAFT',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    mockPaymentCampaignService.createPaymentCampaign.mockResolvedValue({
      success: true,
      data: createdCampaign,
    });

    const { wrapper, queryClient } = createWrapper();
    const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    const { result } = renderHook(() => useCreatePaymentCampaign(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockPaymentCampaignService.createPaymentCampaign).toHaveBeenCalledWith(payload);
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: paymentCampaignKeys.lists(),
      type: 'active',
    });
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: paymentCampaignKeys.byOrganization(payload.organizationId),
      type: 'active',
    });
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      paymentCampaignKeys.detail(createdCampaign.id),
      createdCampaign
    );
  });

  it('update mutation updates detail cache and invalidates related queries', async () => {
    const id = 'campaign-2';
    const updateData: UpdatePaymentCampaignDto = {
      name: 'Campaign 2026 Updated',
      status: 'ACTIVE',
    };

    const updatedCampaign: PaymentCampaign = {
      id,
      organizationId: 'org-1',
      name: 'Campaign 2026 Updated',
      description: 'Description',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      status: 'ACTIVE',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };

    mockPaymentCampaignService.updatePaymentCampaign.mockResolvedValue({
      success: true,
      data: updatedCampaign,
    });

    const { wrapper, queryClient } = createWrapper();
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdatePaymentCampaign(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id, data: updateData });
    });

    expect(mockPaymentCampaignService.updatePaymentCampaign).toHaveBeenCalledWith(id, updateData);
    expect(setQueryDataSpy).toHaveBeenCalledWith(paymentCampaignKeys.detail(id), updatedCampaign);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: paymentCampaignKeys.lists() });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: paymentCampaignKeys.stat(id) });
  });
});
