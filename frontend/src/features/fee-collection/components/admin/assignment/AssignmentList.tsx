import React, { useState, useMemo } from 'react';
import { Edit, Trash2, Download, Search, Filter, User, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { PaymentAssignment } from '../../../types';

interface AssignmentListProps {
  assignments: PaymentAssignment[];
  campaignEndDate: string;
  campaignStatus: string;
  onEditAssignment: (assignment: PaymentAssignment) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onExportList: () => void;
  onBulkCreate: () => void;
  loading?: boolean;
  feeLevelsCount?: number;
}

interface AssignmentFilters {
  search: string;
  status: string;
  sortBy: 'createdAt' | 'user' | 'amount' | 'status';
  sortOrder: 'asc' | 'desc';
}

const AssignmentList: React.FC<AssignmentListProps> = ({
  assignments,
  campaignEndDate,
  campaignStatus,
  onEditAssignment,
  onDeleteAssignment,
  onExportList,
  onBulkCreate,
  loading = false,
  feeLevelsCount = 0
}) => {
  const [filters, setFilters] = useState<AssignmentFilters>({
    search: '',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);

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
      result = result.filter(assignment =>
        ( assignment.user?.familyName.toLowerCase().includes(searchTerm) &&
        assignment.user?.givenName.toLowerCase().includes(searchTerm) )||
        assignment.note?.toLowerCase().includes(searchTerm) ||
        assignment.feeLevel?.levelName.toLowerCase().includes(searchTerm)
      );
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
          aValue = (a.customAmount ? parseFloat(a.customAmount) : 0) || a.feeLevel?.amount || 0;
          bValue = (b.customAmount ? parseFloat(b.customAmount) : 0) || b.feeLevel?.amount || 0;
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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
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
      case 'PAID': return 'Đã đóng';
      case 'OVERDUE': return 'Quá hạn';
      default: return 'Chờ đóng';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'OVERDUE':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    }
  };

  const handleFilterChange = (key: keyof AssignmentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
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
          <h3 className="text-lg font-medium text-gray-900">
            Danh Sách Phân Công
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Quản lý assignment cho từng thành viên. Hạn thanh toán: {formatDate(campaignEndDate)}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center space-x-2 ${
              showFilters ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Bộ lọc</span>
          </button>
          
          <button
            onClick={onBulkCreate}
            disabled={loading || feeLevelsCount === 0 || campaignStatus !== 'ACTIVE'}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title={campaignStatus !== 'ACTIVE' ? 'Cần kích hoạt đợt thu phí trước khi phân công thành viên' : (feeLevelsCount === 0 ? 'Cần có ít nhất một mức phí' : '')}
          >
            <Plus className="inline w-4 h-4 mr-2" />
            Phân công thành viên
          </button>
          
          <button
            onClick={onExportList}
            className="flex items-center px-3 py-2 space-x-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Campaign Status Warning */}
      {(campaignStatus !== 'ACTIVE' || feeLevelsCount === 0) && !loading && (
        <div className="p-4 border border-yellow-200 rounded-md bg-yellow-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {campaignStatus !== 'ACTIVE' ? 'Đợt thu phí chưa được kích hoạt' : 'Chưa có mức phí nào được thiết lập'}
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                {campaignStatus !== 'ACTIVE' 
                  ? 'Vui lòng kích hoạt đợt thu phí trước khi phân công thành viên.' 
                  : 'Vui lòng thiết lập ít nhất một mức phí ở tab "Mức Phí" trước khi tạo assignment.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Tổng cộng</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Chờ đóng</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          <div className="text-sm text-gray-600">Đã đóng</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          <div className="text-sm text-gray-600">Quá hạn</div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-white border rounded-lg">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Search */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Tìm kiếm
              </label>
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  placeholder="Tên, username, ghi chú..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Trạng thái
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                <option value="PENDING">Chờ đóng</option>
                <option value="PAID">Đã đóng</option>
                <option value="OVERDUE">Quá hạn</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Sắp xếp theo
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="createdAt">Ngày tạo</option>
                <option value="user">Tên thành viên</option>
                <option value="amount">Số tiền</option>
                <option value="status">Trạng thái</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Thứ tự
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      )}

      {/* Assignment List */}
      <div className="overflow-hidden bg-white border rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Chưa có assignment nào
            </h3>
            <p className="text-gray-500">
              {filters.search || filters.status !== 'all' ? 'Không có assignment nào phù hợp với bộ lọc' : 'Chưa có thành viên nào được phân công'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-6 py-3 border-b bg-gray-50">
              <div className="grid grid-cols-6 gap-4 text-xs font-medium tracking-wider text-gray-500 uppercase">
                <div>Thành viên</div>
                <div>Mức phí</div>
                <div>Số tiền</div>
                <div>Trạng thái</div>
                <div>Ngày tạo</div>
                <div className="text-right">Thao tác</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {filteredAssignments.map((assignment) => (
                <div key={assignment.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid items-center grid-cols-6 gap-4">
                    {/* Member Info */}
                    <div className="flex items-center space-x-3">
                      <User className="w-8 h-8 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.user?.familyName} {assignment.user?.givenName}
                        </div>
                        <div className="text-xs text-gray-500">
                          @{assignment.user?.code}
                        </div>
                      </div>
                    </div>

                    {/* Fee Level */}
                    <div className="text-sm">
                      {assignment.feeLevel ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {assignment.feeLevel.levelName}
                          </div>
                          {assignment.customAmount && (
                            <div className="text-xs text-blue-600">
                              (Tùy chỉnh)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Tùy chỉnh</span>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-sm font-medium text-gray-900">
                      {formatAmount((assignment.customAmount ? parseFloat(assignment.customAmount) : 0) || assignment.feeLevel?.amount || 0)}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(assignment.computedStatus)}`}>
                        {getStatusIcon(assignment.computedStatus)}
                        <span className="ml-1">{getStatusText(assignment.computedStatus)}</span>
                      </span>
                    </div>

                    {/* Created Date */}
                    <div className="text-sm text-gray-500">
                      {formatDateTime(assignment.createdAt)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onEditAssignment(assignment)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteAssignment(assignment.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  {assignment.note && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Ghi chú:</span> {assignment.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Results Summary */}
      {filteredAssignments.length > 0 && (
        <div className="text-sm text-center text-gray-600">
          Hiển thị {filteredAssignments.length} / {assignments.length} thành viên
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
