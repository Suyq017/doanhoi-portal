import React from 'react';
import { StudentReportQueryParams, ParticipationStatus } from '../types';

interface ReportFiltersProps {
  filters: StudentReportQueryParams;
  onChange: (filters: StudentReportQueryParams) => void;
  className?: string;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({ 
  filters, 
  onChange, 
  className = '' 
}) => {
  const handleFilterChange = (key: keyof StudentReportQueryParams, value: string) => {
    onChange({
      ...filters,
      [key]: value || undefined
    });
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Bộ lọc báo cáo</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Khoảng thời gian
          </label>
          <select
            value={filters.period || ''}
            onChange={(e) => handleFilterChange('period', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả</option>
            <option value="current_semester">Học kỳ hiện tại</option>
            <option value="current_year">Năm học hiện tại</option>
            <option value="custom">Tùy chọn</option>
          </select>
        </div>

        {filters.period === 'custom' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ ngày
              </label>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đến ngày
              </label>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả</option>
            <option value={ParticipationStatus.REGISTERED}>Đã đăng ký</option>
            <option value={ParticipationStatus.COMPLETED}>Hoàn thành</option>
            <option value={ParticipationStatus.CANCELLED}>Đã hủy</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end space-x-2">
        <button
          onClick={() => onChange({})}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Xóa bộ lọc
        </button>
      </div>
    </div>
  );
};

export default ReportFilters;