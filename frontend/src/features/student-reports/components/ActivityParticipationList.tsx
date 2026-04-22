import React from 'react';
import { ActivityParticipation, ParticipationStatus } from '../types';

interface ActivityParticipationListProps {
  activities: ActivityParticipation[];
  className?: string;
}

const StatusBadge: React.FC<{ status: ParticipationStatus }> = ({ status }) => {
  const getStatusColor = (status: ParticipationStatus) => {
    switch (status) {
      case ParticipationStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case ParticipationStatus.REGISTERED:
        return 'bg-yellow-100 text-yellow-800';
      case ParticipationStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ParticipationStatus) => {
    switch (status) {
      case ParticipationStatus.COMPLETED:
        return 'Hoàn thành';
      case ParticipationStatus.REGISTERED:
        return 'Đã đăng ký';
      case ParticipationStatus.CANCELLED:
        return 'Đã hủy';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusText(status)}
    </span>
  );
};

export const ActivityParticipationList: React.FC<ActivityParticipationListProps> = ({ 
  activities, 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Danh sách hoạt động tham gia</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hoạt động
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tổ chức
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thời gian
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Số ngày
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map((activity) => (
              <tr key={activity.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{activity.activity_name}</div>
                  {activity.category_name && (
                    <div className="text-sm text-gray-500">{activity.category_name}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {activity.organization_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{new Date(activity.start_date).toLocaleDateString('vi-VN')}</div>
                  <div className="text-gray-500">đến {new Date(activity.end_date).toLocaleDateString('vi-VN')}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {activity.actual_days || activity.total_days}/{activity.total_days}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={activity.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {activities.length === 0 && (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500">Chưa có hoạt động nào được ghi nhận</p>
        </div>
      )}
    </div>
  );
};

export default ActivityParticipationList;