import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Download, Search, Filter, User, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { PaymentAssignment, PaymentCampaign } from '../../../types';
import { UserTablePagination } from '../../../../../shared/components/UserTable/UserTablePagination';
import { useToast } from '../../../../../shared/hooks/useToast';
import Toast from '../../../../../shared/components/Toast';
import ConfirmDialog from '../../../../../shared/components/ConfirmDialog';
import { paymentAssignmentService } from '../../../../../shared/services/fee-collection-service/paymentAssignmentService';

interface AssignmentListProps {
  assignments: PaymentAssignment[];
  campaign: PaymentCampaign;
  campaignEndDate: string;
  onDeleteAssignment?: (assignmentId: string) => void;
  onMarkAsPaid?: (assignmentId: string) => void;
  onExportList: () => void;
  onBulkCreate?: () => void;
  loading?: boolean;
  feeLevelsCount?: number;
  readOnly?: boolean;
}

interface AssignmentFilters {
  search: string;
  status: string;
  sortBy: 'createdAt' | 'user' | 'amount' | 'status';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

const AssignmentList: React.FC<AssignmentListProps> = ({
  assignments,
  campaign,
  campaignEndDate,
  onDeleteAssignment,
  onMarkAsPaid,
  onExportList,
  onBulkCreate,
  loading = false,
  feeLevelsCount = 0,
  readOnly = false
}) => {
  const { t } = useTranslation('memberAssignments');
  const { toasts, confirmDialog, showSuccess, showError, showConfirm, hideToast } = useToast();
  const [filters, setFilters] = useState<AssignmentFilters>({
    search: '',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });

  const [showFilters, setShowFilters] = useState(false);

  // Handle mark assignment as paid with confirmation
  const handleMarkAsPaid = async (assignment: PaymentAssignment) => {
    const confirmed = await showConfirm(
      t('confirmDialog.markAsPaid.title'),
      t('confirmDialog.markAsPaid.message', {
        userName: `${assignment.user?.familyName || ''} ${assignment.user?.givenName || ''}`.trim(),
        amount: formatAmount(assignment.feeLevel?.amount || 0)
      }),
      {
        confirmText: t('confirmDialog.markAsPaid.confirm'),
        cancelText: t('confirmDialog.markAsPaid.cancel'),
        variant: 'info'
      }
    );

    if (confirmed) {
      try {
        await paymentAssignmentService.markAsPaid(assignment.id);
        showSuccess(t('messages.markAsPaidSuccess'));
        // Call parent callback to refresh data
        if (onMarkAsPaid) {
          onMarkAsPaid(assignment.id);
        }
      } catch (error) {
        console.error('Error marking assignment as paid:', error);
        showError(t('messages.markAsPaidError'));
      }
    }
  };

  // Handle delete assignment with confirmation
  const handleDeleteAssignment = async (assignment: PaymentAssignment) => {
    const confirmed = await showConfirm(
      t('confirmDialog.deleteAssignment.title'),
      t('confirmDialog.deleteAssignment.message', {
        userName: `${assignment.user?.familyName || ''} ${assignment.user?.givenName || ''}`.trim(),
        amount: formatAmount(assignment.feeLevel?.amount || 0)
      }),
      {
        confirmText: t('confirmDialog.deleteAssignment.confirm'),
        cancelText: t('confirmDialog.deleteAssignment.cancel'),
        variant: 'danger'
      }
    );

    if (confirmed) {
      // Call parent callback to delete assignment
      if (onDeleteAssignment) {
        onDeleteAssignment(assignment.id);
      }
    }
  };

  // Calculate status including overdue based on campaign end date
  const getAssignmentStatus = (assignment: PaymentAssignment) => {
    if (assignment.status === 'PAID') return 'PAID';

    const now = new Date();
    const endDate = new Date(campaignEndDate);

    if (now > endDate && assignment.status === 'PENDING') {
      return 'OVERDUE';
    }

    return assignment.status;
  };

  // Filter and sort assignments
  const filteredAssignments = useMemo(() => {
    let result = assignments.map(assignment => ({
      ...assignment,
      computedStatus: getAssignmentStatus(assignment)
    }));

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(assignment => {
        const fullName = `${assignment.user?.familyName || ''} ${assignment.user?.givenName || ''}`.toLowerCase();
        const userCode = assignment.user?.code?.toLowerCase() || '';
        const levelName = assignment.feeLevel?.levelName?.toLowerCase() || '';

        return fullName.includes(searchTerm) ||
          userCode.includes(searchTerm) ||
          levelName.includes(searchTerm);
      });
    }

    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter(assignment => assignment.computedStatus === filters.status);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'user':
          aValue = a.user?.givenName || '';
          bValue = b.user?.givenName || '';
          break;
        case 'amount':
          aValue = a.feeLevel?.amount || 0;
          bValue = b.feeLevel?.amount || 0;
          break;
        case 'status':
          aValue = a.computedStatus;
          bValue = b.computedStatus;
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [assignments, filters, campaignEndDate]);

  // Pagination calculations
  const totalFiltered = filteredAssignments.length;
  const totalPages = Math.ceil(totalFiltered / filters.limit);
  const startIndex = (filters.page - 1) * filters.limit;
  const endIndex = startIndex + filters.limit;
  const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'OVERDUE':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID': return t('status.paid');
      case 'OVERDUE': return t('status.overdue');
      default: return t('status.pending');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800';
      case 'OVERDUE':
        return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800';
      default:
        return 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800';
    }
  };

  const handleFilterChange = (key: keyof AssignmentFilters, value: string) => {
    if (key === 'search' || key === 'status') {
      setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 10
    });
  };

  const getFilteredStats = () => {
    const total = filteredAssignments.length;
    const pending = filteredAssignments.filter(a => a.computedStatus === 'PENDING').length;
    const paid = filteredAssignments.filter(a => a.computedStatus === 'PAID').length;
    const overdue = filteredAssignments.filter(a => a.computedStatus === 'OVERDUE').length;

    return { total, pending, paid, overdue };
  };

  const stats = getFilteredStats();

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('title')}
            {readOnly && (
              <span className="ml-2 text-orange-600 dark:text-orange-400">
                ({t('readOnlyMode', { status: campaign.status === 'COMPLETED' ? t('common:status.completed') : t('common:status.cancelled') })})
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center space-x-2 ${showFilters ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800' : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
              }`}
          >
            <Filter className="w-4 h-4" />
            <span>{t('filters.label')}</span>
          </button>

          {!readOnly && onBulkCreate && (
            <button
              onClick={onBulkCreate}
              disabled={loading || feeLevelsCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600"
              title={feeLevelsCount === 0 ? t('warnings.noFeeLevels') : ''}
            >
              <Plus className="inline w-4 h-4 mr-2" />
              {t('buttons.assignMembers')}
            </button>
          )}

          <button
            onClick={onExportList}
            className="flex items-center px-3 py-2 space-x-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            <Download className="w-4 h-4" />
            <span>{t('buttons.exportExcel')}</span>
          </button>
        </div>
      </div>

      {/* Campaign Status Warning */}
      {feeLevelsCount === 0 && !loading && (
        <div className="p-4 border border-yellow-200 rounded-md bg-yellow-50 dark:bg-yellow-900 dark:border-yellow-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400 dark:text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {t('warnings.noFeeLevelsTitle')}
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                {t('warnings.noFeeLevelsMessage')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-4 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('stats.total')}</div>
        </div>
        <div className="p-4 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('stats.pending')}</div>
        </div>
        <div className="p-4 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.paid}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('stats.paid')}</div>
        </div>
        <div className="p-4 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('stats.overdue')}</div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Search */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('filters.search')}
              </label>
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 dark:text-gray-500 left-3 top-1/2" />
                <input
                  type="text"
                  placeholder={t('filters.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('filters.status')}
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">{t('filters.statusOptions.all')}</option>
                <option value="PENDING">{t('filters.statusOptions.pending')}</option>
                <option value="PAID">{t('filters.statusOptions.paid')}</option>
                <option value="OVERDUE">{t('filters.statusOptions.overdue')}</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('filters.sortBy')}
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="createdAt">{t('filters.sortOptions.createdAt')}</option>
                <option value="user">{t('filters.sortOptions.user')}</option>
                <option value="amount">{t('filters.sortOptions.amount')}</option>
                <option value="status">{t('filters.sortOptions.status')}</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('filters.sortOrder')}
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="desc">{t('filters.sortOrderOptions.desc')}</option>
                <option value="asc">{t('filters.sortOrderOptions.asc')}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {t('filters.clearFilters')}
            </button>
          </div>
        </div>
      )}

      {/* Assignment List */}
      <div className="overflow-hidden bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-600 border-t-doan-500 dark:border-t-doan-400 rounded-full animate-spin"></div>
          </div>
        ) : totalFiltered === 0 ? (
          <div className="p-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              {t('assignmentsList.noAssignments')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filters.search || filters.status !== 'all' ? t('assignmentsList.noMatchingAssignments') : t('assignmentsList.noAssignmentsYet')}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-6 py-3 border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <div className="grid grid-cols-6 gap-4 text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                <div>{t('assignmentsList.tableHeaders.member')}</div>
                <div>{t('assignmentsList.tableHeaders.feeLevel')}</div>
                <div>{t('assignmentsList.tableHeaders.amount')}</div>
                <div>{t('assignmentsList.tableHeaders.status')}</div>
                <div>{t('assignmentsList.tableHeaders.createdDate')}</div>
                <div className="text-right">{t('assignmentsList.tableHeaders.actions')}</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedAssignments.map((assignment) => (
                <div key={assignment.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="grid items-center grid-cols-6 gap-4">
                    {/* Member Info */}
                    <div className="flex items-center space-x-3">
                      <User className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {assignment.user?.familyName} {assignment.user?.givenName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {assignment.user?.code}
                        </div>
                      </div>
                    </div>

                    {/* Fee Level */}
                    <div className="text-sm">
                      {assignment.feeLevel ? (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {assignment.feeLevel.levelName}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">{t('assignmentsList.custom')}</span>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatAmount(assignment.feeLevel?.amount || 0)}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(assignment.computedStatus)}`}>
                        {getStatusIcon(assignment.computedStatus)}
                        <span className="ml-1">{getStatusText(assignment.computedStatus)}</span>
                      </span>
                    </div>

                    {/* Created Date */}
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(assignment.createdAt)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-2">
                      {/* Mark as Paid Button - only show for pending/overdue assignments */}
                      {!readOnly && (assignment.computedStatus === 'PENDING' || assignment.computedStatus === 'OVERDUE') && (
                        <button
                          onClick={() => handleMarkAsPaid(assignment)}
                          className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          title={t('assignmentsList.markAsPaidButton')}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Button */}
                      {!readOnly && onDeleteAssignment && (
                        <button
                          onClick={() => handleDeleteAssignment(assignment)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title={t('assignmentsList.deleteButton')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {assignment.note && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">{t('assignmentsList.note')}:</span> {assignment.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
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

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
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

export default AssignmentList;
