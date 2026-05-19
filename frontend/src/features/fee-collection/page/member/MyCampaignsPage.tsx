// MyCampaignsPage - Member Page
// Refactored with custom hooks and shared components

import React from 'react';
import { CreditCard, Clock, CheckCircle, AlertCircle, Search, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PaymentAssignment } from '@/shared/hooks/queries';
import { UserTablePagination } from '@/shared/components/UserTable/UserTablePagination';
import Select, { SelectOption } from '@/shared/components/Select';
import { useMyCampaignsPage } from '../../hooks';
import {
  PageHeader,
  LoadingState,
  ErrorState,
  StatCard,
  EmptyState,
  ToastContainer,
  PermissionInfoBadge
} from '../../components/shared';

// =============================================================================
// Sub-components for better organization
// =============================================================================

interface FiltersBarProps {
  filters: ReturnType<typeof useMyCampaignsPage>['filters'];
  setFilters: ReturnType<typeof useMyCampaignsPage>['setFilters'];
  statusOptions: SelectOption[];
  sortByOptions: SelectOption[];
  sortOrderOptions: SelectOption[];
  searchPlaceholder: string;
}

const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  setFilters,
  statusOptions,
  sortByOptions,
  sortOrderOptions,
  searchPlaceholder
}) => (
  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Status Filter */}
      <div>
        <Select
          options={statusOptions}
          value={filters.status}
          onChange={(value) => setFilters(prev => ({ ...prev, status: value, page: 1 }))}
          placeholder={statusOptions[0]?.label}
        />
      </div>

      {/* Sort By */}
      <div>
        <Select
          options={sortByOptions}
          value={filters.sortBy}
          onChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}
        />
      </div>

      {/* Sort Order */}
      <div>
        <Select
          options={sortOrderOptions}
          value={filters.sortOrder}
          onChange={(value) => setFilters(prev => ({ ...prev, sortOrder: value as any }))}
        />
      </div>
    </div>
  </div>
);

interface AssignmentRowProps {
  assignment: PaymentAssignment;
  onPayNow: (id: string) => void;
  formatAmount: (amount: number) => string;
  t: (key: string) => string;
}

const AssignmentRow: React.FC<AssignmentRowProps> = ({
  assignment,
  onPayNow,
  formatAmount,
  t
}) => (
  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
    <td className="px-6 py-4 whitespace-nowrap">
      <div>
        <div className="font-medium text-gray-900 dark:text-white">
          {assignment.campaign.name}
        </div>
        {assignment.campaign.description && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {assignment.campaign.description}
          </div>
        )}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900 dark:text-white">
        {assignment.campaign.organization.name}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
        {formatAmount(Number(assignment.feeLevel?.amount) || 0)}
      </div>
      {assignment.feeLevel && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {assignment.feeLevel.levelName}
        </div>
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900 dark:text-white">
        {new Date(assignment.campaign.startDate).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })} {new Date(assignment.campaign.startDate).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900 dark:text-white">
        {new Date(assignment.campaign.endDate).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })} {new Date(assignment.campaign.endDate).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })}
      </div>
    </td>
    <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
      <PaymentButton assignment={assignment} onPayNow={onPayNow} t={t} />
    </td>
  </tr>
);

interface PaymentButtonProps {
  assignment: PaymentAssignment;
  onPayNow: (id: string) => void | Promise<void>;
  t: (key: string) => string;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ assignment, onPayNow, t }) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onPayNow(assignment.id);
    } catch {
      setIsLoading(false);
    }
  };

  if (assignment.status === 'PENDING' && assignment.campaign.status === 'ACTIVE') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-white transition-all duration-300 bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <CreditCard className="w-4 h-4" />}
        <span>{isLoading ? t('actions.processing') : t('actions.payNow')}</span>
      </button>
    );
  }

  if (assignment.status === 'PENDING' && assignment.campaign.status === 'CANCELLED') {
    return (
      <button
        disabled
        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-red-800 bg-red-200 rounded-lg shadow-sm cursor-not-allowed opacity-60 dark:bg-red-900 dark:text-red-400"
      >
        <AlertCircle className="w-4 h-4" />
        <span>{t('actions.paymentExpired')}</span>
      </button>
    );
  }

  if (assignment.status === 'OVERDUE') {
    return (
      <button
        disabled
        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-red-800 bg-red-200 rounded-lg shadow-sm cursor-not-allowed opacity-60 dark:bg-red-900 dark:text-red-400"
      >
        <AlertCircle className="w-4 h-4" />
        <span>{t('actions.paymentExpired')}</span>
      </button>
    );
  }

  if (assignment.status === 'PAID') {
    return (
      <button
        disabled
        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-green-800 bg-green-200 rounded-lg shadow-sm cursor-not-allowed opacity-60 dark:bg-green-900 dark:text-green-400"
      >
        <CheckCircle className="w-4 h-4" />
        <span>{t('actions.alreadyPaid')}</span>
      </button>
    );
  }

  return null;
};

// =============================================================================
// Main Component
// =============================================================================

export const MyCampaignsPage: React.FC = () => {
  const { t } = useTranslation('myPayments');

  const {
    // State
    filters,
    loading,
    error,
    permissionsLoading,

    // Data
    paginatedAssignments,
    summaryStats,
    totalFiltered,
    totalPages,

    // Permissions
    isSuperAdmin,
    userRoles,
    canAccessMyPaymentsInOrg,

    // Actions
    setFilters,
    handlePayNow,
    refetch,
    getOrganizationName,

    // Helpers
    formatAmount,

    // Toast
    toasts,
    hideToast
  } = useMyCampaignsPage();

  // Select options
  const statusOptions: SelectOption[] = [
    { value: '', label: t('filters.allStatus') },
    { value: 'PENDING', label: t('status.pending') },
    { value: 'OVERDUE', label: t('status.overdue') },
    { value: 'PAID', label: t('status.paid') }
  ];

  const sortByOptions: SelectOption[] = [
    { value: 'dueDate', label: t('sort.dueDate') },
    { value: 'assignedAt', label: t('sort.assignedAt') },
    { value: 'amount', label: t('sort.amount') }
  ];

  const sortOrderOptions: SelectOption[] = [
    { value: 'asc', label: t('sort.ascending') },
    { value: 'desc', label: t('sort.descending') }
  ];

  // Loading state
  if (loading || permissionsLoading) {
    return (
      <LoadingState
        title={t('title')}
        subtitle={t('description')}
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title={t('title')}
        subtitle={t('description')}
        error={error}
        onRetry={refetch}
        retryLabel={t('actions.retry')}
      />
    );
  }

  // Permission info component
  const permissionInfo = (
    <PermissionInfoBadge
      isSuperAdmin={isSuperAdmin}
      userRoles={userRoles}
      canAccessMyPaymentsInOrg={canAccessMyPaymentsInOrg}
      getOrganizationName={getOrganizationName}
      accessRightsLabel={t('accessRights')}
      organizationAccessLabel={t('organizationAccess')}
      superAdminLabel={t('superAdminRights')}
      superAdminDescription={t('superAdminDescription')}
    />
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('title')}
        subtitle={t('description')}
        permissionInfo={permissionInfo}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('stats.total')}
          value={summaryStats.total}
          icon={<CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          iconBgClass="bg-blue-100 dark:bg-blue-900"
        />
        <StatCard
          title={t('stats.pending')}
          value={summaryStats.pending}
          icon={<Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />}
          iconBgClass="bg-yellow-100 dark:bg-yellow-900"
          valueColorClass="text-yellow-600 dark:text-yellow-400"
        />
        <StatCard
          title={t('stats.overdue')}
          value={summaryStats.overdue}
          icon={<AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />}
          iconBgClass="bg-red-100 dark:bg-red-900"
          valueColorClass="text-red-600 dark:text-red-400"
        />
        <StatCard
          title={t('stats.totalAmount')}
          value={formatAmount(summaryStats.totalAmount)}
          icon={<CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />}
          iconBgClass="bg-green-100 dark:bg-green-900"
        />
      </div>

      {/* Filters */}
      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        statusOptions={statusOptions}
        sortByOptions={sortByOptions}
        sortOrderOptions={sortOrderOptions}
        searchPlaceholder={t('search.placeholder')}
      />

      {/* Assignments Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('table.campaign')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('table.organization')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('table.amount')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('table.startDate')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('table.endDate')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-400">
                  {t('table.payment')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {paginatedAssignments.map((assignment: PaymentAssignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  onPayNow={handlePayNow}
                  formatAmount={formatAmount}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {totalFiltered === 0 && (
          <EmptyState
            title={t('empty.noCampaigns')}
            message={
              filters.search || filters.status
                ? t('empty.noResults')
                : isSuperAdmin
                  ? t('empty.noAssignmentsSuperAdmin')
                  : t('empty.noAssignmentsRegular')
            }
            additionalInfo={
              !isSuperAdmin && userRoles && userRoles.length > 0 ? (
                <div className="mt-4 text-sm text-gray-400">
                  {t('empty.accessOrganizations')}{' '}
                  {userRoles
                    .filter(userRole => userRole.organizationId && canAccessMyPaymentsInOrg(userRole.organizationId))
                    .map(userRole => getOrganizationName(userRole.organizationId))
                    .join(', ')
                  }
                </div>
              ) : undefined
            }
          />
        )}
      </div>

      {/* Pagination */}
      <UserTablePagination
        currentPage={filters.page}
        totalPages={totalPages}
        total={totalFiltered}
        limit={filters.limit}
        onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </div>
  );
};

export default MyCampaignsPage;
