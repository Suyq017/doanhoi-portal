import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Edit, Trash2, Play, CheckCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/shared/hooks/useToast';
import { Toast, ConfirmDialog } from '@/shared/components';
import SearchableCombobox from '@/shared/components/SearchableCombobox';
import Select, { SelectOption } from '@/shared/components/Select';
import { UserTablePagination } from '@/shared/components/UserTable/UserTablePagination';
import { PaymentCampaign, PaymentCampaignFilters, Organization } from '../../types';
import { paymentCampaignService } from '@/shared/services/fee-collection-service';
import { usePermissions } from '@/shared/hooks/usePermissions';

interface PaymentCampaignListProps {
  organizations: Organization[];
  onEditCampaign?: (campaign: PaymentCampaign) => void;
  refreshTrigger?: number;
}

const PaymentCampaignList: React.FC<PaymentCampaignListProps> = ({
  organizations,
  onEditCampaign,
  refreshTrigger
}) => {
  const { t } = useTranslation('paymentCampaigns');
  const permissions = usePermissions();
  const { toasts, confirmDialog, showSuccess, showError, showConfirm, hideToast } = useToast();
  const [campaigns, setCampaigns] = useState<PaymentCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Track which action is loading
  const [searchTerm, setSearchTerm] = useState(''); // Local search term state
  const [filters, setFilters] = useState<PaymentCampaignFilters>({
    page: 1,
    limit: 10
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Row-level permission checks
  const canEditCampaign = (campaign: PaymentCampaign) => {
    return permissions.canUpdatePaymentCampaignInOrg(campaign.organizationId);
  };

  const canDeleteCampaign = (campaign: PaymentCampaign) => {
    return permissions.canDeletePaymentCampaignInOrg(campaign.organizationId);
  };
  const canViewCampaign = (campaign: PaymentCampaign) => {
    return permissions.canViewPaymentCampaignInOrg(campaign.organizationId);
  };

  // Only show action column if user has any action permissions
  const showActionColumn = permissions.canViewPaymentCampaignDetails() ||
    permissions.canUpdatePaymentCampaign() ||
    permissions.canDeletePaymentCampaign();


  // Debounced search function
  const debouncedSearch = useCallback(
    (searchValue: string) => {
      const timeoutId = setTimeout(() => {
        setFilters(prev => ({ 
          ...prev, 
          search: searchValue || undefined, 
          page: 1 
        }));
      }, 500); // 500ms delay

      return () => clearTimeout(timeoutId);
    },
    []
  );

  // Handle search term change
  useEffect(() => {
    const cleanup = debouncedSearch(searchTerm);
    return cleanup;
  }, [searchTerm, debouncedSearch]);

  // Create organization options for SearchableCombobox
  const organizationOptions = [
    { value: '', label: t('listComponent.allOrganizations') },
    ...organizations.map(org => ({
      value: org.id,
      label: org.name
    }))
  ];

  // Status options for Select component
  const statusOptions: SelectOption[] = [
    { value: '', label: t('listComponent.allStatus') },
    { value: 'DRAFT', label: t('listComponent.draft') },
    { value: 'ACTIVE', label: t('listComponent.active') },
    { value: 'COMPLETED', label: t('listComponent.completed') },
    { value: 'CANCELLED', label: t('listComponent.cancelled') }
  ];

  useEffect(() => {
    loadCampaigns();
  }, [filters]);

  // Reload campaigns when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadCampaigns();
    }
  }, [refreshTrigger]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const response: any = await paymentCampaignService.getPaymentCampaigns(filters);
      setCampaigns(response.campaigns);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages
      });
    } catch (err) {
      console.error('Error loading campaigns:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaigns';
      setError(errorMessage);
      showError(t('messages.errorLoading') + `: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = async (id: string, action: 'activate' | 'complete' | 'cancel') => {
    // Show confirmation dialog for activate action
    if (action === 'activate') {
      const shouldActivate = await showConfirm(
        t('confirmations.activate.title'),
        t('confirmations.activate.message'),
        {
          confirmText: t('confirmations.activate.confirm'),
          cancelText: t('confirmations.activate.cancel'),
          variant: 'warning'
        }
      );
      
      if (!shouldActivate) return;
    }

    // Show confirmation dialog for complete action
    if (action === 'complete') {
      const shouldComplete = await showConfirm(
        t('confirmations.complete.title'),
        t('confirmations.complete.message'),
        {
          confirmText: t('confirmations.complete.confirm'),
          cancelText: t('confirmations.complete.cancel'),
          variant: 'info'
        }
      );
      
      if (!shouldComplete) return;
    }

    // Show confirmation dialog for cancel action
    if (action === 'cancel') {
      const shouldCancel = await showConfirm(
        t('confirmations.cancelCampaign.title'),
        t('confirmations.cancelCampaign.message'),
        {
          confirmText: t('confirmations.cancelCampaign.confirm'),
          cancelText: t('confirmations.cancelCampaign.cancel'),
          variant: 'danger'
        }
      );
      
      if (!shouldCancel) return;
    }
    
    try {
      setActionLoading(`${id}-${action}`);
      let response;
      switch (action) {
        case 'activate':
          response = await paymentCampaignService.activatePaymentCampaign(id);
          break;
        case 'complete':
          response = await paymentCampaignService.completePaymentCampaign(id);
          break;
        case 'cancel':
          response = await paymentCampaignService.cancelPaymentCampaign(id);
          break;
      }

      // Handle response properly - it might be response.data or just response
      const updatedCampaign = response?.data || response;

      if (updatedCampaign) {
        // Update the campaign in the list
        setCampaigns(prev => prev.map(campaign =>
          campaign.id === id ? updatedCampaign : campaign
        ));

        // Show success toast
        const actionMessages = {
          activate: t('messages.activateSuccess'),
          complete: t('messages.completeSuccess'),
          cancel: t('messages.cancelSuccess')
        };
        showSuccess(actionMessages[action]);
      } else {
        showError(t('messages.errorStatusUpdate'));
      }
    } catch (err) {
      console.error('Error in handleStatusChange:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign status';
      const actionText = action === 'activate' ? t('actions.activate').toLowerCase() : 
                        action === 'complete' ? t('actions.complete').toLowerCase() : 
                        t('actions.cancel').toLowerCase();
      showError(t('messages.errorActivate', { error: errorMessage }).replace('kích hoạt', actionText));

      // Reload campaigns to ensure UI is in sync
      await loadCampaigns();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return;

    // Use custom confirm dialog
    const shouldDelete = await showConfirm(
      t('confirmations.delete.title'),
      t('confirmations.delete.message'),
      {
        confirmText: t('confirmations.delete.confirm'),
        cancelText: t('confirmations.delete.cancel'),
        variant: 'danger'
      }
    );

    if (!shouldDelete) return;

    try {
      await paymentCampaignService.deletePaymentCampaign(id);
      setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
      showSuccess(t('messages.deleteSuccess'));
    } catch (err) {
      console.error('Error in handleDelete:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete campaign';
      showError(t('messages.errorDelete', { error: errorMessage }));
    }
  };

  const getStatusIcon = (status: PaymentCampaign['status']) => {
    switch (status) {
      case 'DRAFT': return <Edit className="w-4 h-4 text-gray-500" />;
      case 'ACTIVE': return <Play className="w-4 h-4 text-green-500" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'CANCELLED': return <X className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusClass = (status: PaymentCampaign['status']) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Filters placeholder */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Empty filter placeholders */}
            <div className="h-10 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
          </div>
        </div>

        {/* Loading content */}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {t('listComponent.loadingList')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="p-4 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('listComponent.organization')}
            </label>
            <SearchableCombobox
              value={filters.organizationId || ''}
              onChange={(value) => setFilters(prev => ({ ...prev, organizationId: value || undefined, page: 1 }))}
              options={organizationOptions}
              placeholder={t('listComponent.selectOrganization', { defaultValue: 'Chọn tổ chức...' })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('listComponent.status')}
            </label>
            <Select
              options={statusOptions}
              value={filters.status || ''}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value as PaymentCampaign['status'] || undefined, page: 1 }))}
              placeholder={t('listComponent.allStatus')}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('listComponent.fromDate')}
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value || undefined, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-doan-500 focus:border-doan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('listComponent.toDate')}
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value || undefined, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-doan-500 focus:border-doan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2 dark:text-gray-500" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 mt-6 text-red-700 border border-red-200 rounded bg-red-50 dark:bg-red-900 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="mt-6 mb-6 overflow-hidden bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('listComponent.campaignColumn')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('listComponent.organizationColumn')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('listComponent.timeframeColumn')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('listComponent.statusColumn')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('listComponent.createdByColumn')}
                </th>
                {showActionColumn && (
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase dark:text-gray-400">
                    {t('listComponent.actionsColumn')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {campaigns.map((campaign) => (
                <tr key={campaign?.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{campaign.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{campaign.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {campaign.organization?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(campaign.startDate).toLocaleDateString('vi-VN')} - {new Date(campaign.endDate).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getStatusIcon(campaign.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(campaign.status)}`}>
                        {campaign.status === 'DRAFT' && t('listComponent.draft')}
                        {campaign.status === 'ACTIVE' && t('listComponent.active')}
                        {campaign.status === 'COMPLETED' && t('listComponent.completed')}
                        {campaign.status === 'CANCELLED' && t('listComponent.cancelled')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {campaign.createdByUser?.familyName} {campaign.createdByUser?.givenName}
                    </div>
                  </td>

                  {showActionColumn && (
                    <td className="px-6 py-4 text-sm font-medium text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {canViewCampaign(campaign) && (
                          <Link
                            to={`/admin/payment-campaigns/${campaign.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title={t('listComponent.viewDetail')}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                        {campaign.status === 'DRAFT' && (
                          <>
                            {canEditCampaign(campaign) && (
                              <button
                                onClick={() => onEditCampaign?.(campaign)}
                                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                                title={t('listComponent.edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteCampaign(campaign) && (
                              <button
                                onClick={() => handleDelete(campaign.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title={t('listComponent.delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {campaign.status === 'ACTIVE' && (
                          <>
                            {canEditCampaign(campaign) && (
                              <button
                                onClick={() => handleStatusChange(campaign.id, 'complete')}
                                disabled={actionLoading === `${campaign.id}-complete`}
                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                                title={t('listComponent.complete')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {canEditCampaign(campaign) && (
                              <button
                                onClick={() => handleStatusChange(campaign.id, 'cancel')}
                                disabled={actionLoading === `${campaign.id}-cancel`}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                                title={t('listComponent.cancel')}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {(campaign.status === 'CANCELLED' || campaign.status === 'COMPLETED') && (
                          <>
                            {canDeleteCampaign(campaign) && (
                              <button
                                onClick={() => handleDelete(campaign.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title={t('listComponent.deleteTooltip')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
        <UserTablePagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
      />

      {/* Empty State */}
      {campaigns.length === 0 && !loading && (
        <div className="py-12 text-center">
          <div className="mb-4 text-gray-500 dark:text-gray-400">{t('listComponent.noCampaigns')}</div>
        </div>
      )}

      {/* Toast Container */}
      <div className="fixed z-50 space-y-4 top-4 right-4">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm || (() => { })}
        onCancel={confirmDialog.onCancel || (() => { })}
      />
    </div>
  );
};

export default PaymentCampaignList;
