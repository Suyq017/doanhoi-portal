import React from 'react';
import { BarChart3, Users, Building } from 'lucide-react';

const Dashboard: React.FC = () => {
  const stats = [
    {
      name: 'Tổng số thành viên',
      value: '1,234',
      change: '+12%',
      changeType: 'increase',
      icon: Users,
      color: 'bg-doan-500',
    },
    {
      name: 'Đoàn viên',
      value: '856',
      change: '+8%',
      changeType: 'increase',
      icon: Users,
      color: 'bg-doan-500',
    },
    {
      name: 'Hội viên',
      value: '678',
      change: '+15%',
      changeType: 'increase',
      icon: Users,
      color: 'bg-hsv-500',
    },
    {
      name: 'Tổ chức',
      value: '45',
      change: '+3%',
      changeType: 'increase',
      icon: Building,
      color: 'bg-gray-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Trang chủ
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Tổng quan hệ thống quản lý Đoàn Thanh niên và Hội Sinh viên
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                    <p className={`ml-2 text-sm font-medium ${
                      stat.changeType === 'increase' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {stat.change}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Hoạt động gần đây
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-doan-500 rounded-full"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Thêm 15 thành viên mới vào Chi đoàn Khoa CNTT
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-hsv-500 rounded-full"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cập nhật thông tin CLB Tin học
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tạo mới Liên chi hội Khoa Cơ khí
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Thao tác nhanh
          </h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 text-left rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Thêm người dùng mới
              </span>
              <Users className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Tạo tổ chức mới
              </span>
              <Building className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Xem báo cáo
              </span>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
