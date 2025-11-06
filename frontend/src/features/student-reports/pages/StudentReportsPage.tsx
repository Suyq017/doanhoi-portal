import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Calendar,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import {
  ParticipationStatus
} from '../types';
import { userService } from '../../../shared/services/userService';
import { useAuth } from '../../auth/context/AuthContext';
import { useStudentReport } from '@/shared/hooks/queries';

const StudentReportsPage: React.FC = () => {
  const { t } = useTranslation('student-reports');

  // Auth context để lấy thông tin user
  const { auth } = useAuth();

  // Get student code from auth
  const studentCode = auth.user?.code || '2212870'; // fallback for testing

  // State management
  const [studentInfo, setStudentInfo] = useState<{ name?: string, email?: string }>({});

  // ✅ Use TanStack Query for student report
  const {
    data: report,
    isLoading: loading,
  } = useStudentReport(studentCode, {}, {
    enabled: !!auth.user || !auth.isLoading
  });

  // Format days to show integers when possible (e.g., 3.0 -> 3, 3.5 -> 3.5)
  const formatDays = (days: number | null | undefined): string => {
    if (days === null || days === undefined) return '0';
    // Remove trailing zeros after decimal point
    return parseFloat(days.toString()).toString();
  };

  // Load student info if not in report
  useEffect(() => {
    const loadStudentInfo = async () => {
      // Nếu không có tên hoặc email từ report, thử tra cứu từ user service
      if (report && (!report.student_name || !report.student_email)) {
        try {
          const usersResponse = await userService.getUsers({ search: studentCode, limit: 1 });
          if (usersResponse.users && usersResponse.users.length > 0) {
            const user = usersResponse.users[0];
            setStudentInfo({
              name: user.familyName + ' ' + user.givenName,
              email: user.email
            });
          }
        } catch (userError) {
          // Silent fail
        }
      }
    };

    if (report) {
      loadStudentInfo();
    }
  }, [report, studentCode]);

  // Status display helpers
  const getStatusDisplay = (status: string) => {
    const statusConfig: Record<string, {
      text: string;
      className: string;
      icon: React.ReactElement;
    }> = {
      [ParticipationStatus.COMPLETED]: {
        text: t('activities.statusOptions.COMPLETED'),
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="h-3 w-3" />
      },
      [ParticipationStatus.REGISTERED]: {
        text: t('activities.statusOptions.REGISTERED'),
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Clock className="h-3 w-3" />
      },
      [ParticipationStatus.CANCELLED]: {
        text: t('activities.statusOptions.CANCELLED'),
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <Clock className="h-3 w-3" />
      }
    };

    const config = statusConfig[status] || statusConfig[ParticipationStatus.REGISTERED];
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${config.className}`}>
        {config.icon}
        <span>{config.text}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">{t('messages.loading')}</span>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {!report ? (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="text-center py-12">
                  <User className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {t('messages.notFound')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('messages.error')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Student Info */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  {t('studentInfo.title')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('studentInfo.name')}</label>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report?.student_name || studentInfo.name || 'Tra cứu từ MSSV: ' + (report?.student_code || t('studentInfo.unknown'))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('studentInfo.code')}</label>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report?.student_code || t('studentInfo.unknown')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('studentInfo.email')}</label>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report?.student_email || studentInfo.email || 'Tra cứu từ MSSV: ' + (report?.student_code || t('studentInfo.unknown'))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('summary.totalDays')}</label>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatDays(report?.total_days_completed)} {t('summary.days')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  {t('summary.title')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatDays(report?.ctxh_days_new_system)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Ngày hoạt động đã hoàn thành</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {formatDays(report?.ctxh_days_old_system)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Ngày hoạt động trên hệ thống cũ</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatDays(report?.total_days_completed)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Tổng số ngày hoạt động CTXH</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className={`text-2xl font-bold ${(report?.total_days_completed || 0) >= 15 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(report?.total_days_completed || 0) >= 15 ? t('summary.achieved') : t('summary.notAchieved')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('summary.status')}</div>
                  </div>
                </div>
              </div>

              {/* Activities Table */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    {t('activities.title')} ({report?.activities?.length || 0})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  {!report?.activities || report.activities.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('activities.noData')}</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('activities.noActivitiesMessage')}
                      </p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('activities.name')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('activities.category')}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('activities.actualDays')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('activities.status')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('activities.startDate')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Ghi chú
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {(report?.activities || []).map((activity, index) => (
                          <tr key={activity.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {activity.activity_name || t('studentInfo.unknown')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {activity.category_name || t('studentInfo.unknown')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {formatDays(activity.days_completed)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusDisplay(activity.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {activity.completed_date
                                ? new Date(activity.completed_date).toLocaleDateString('vi-VN')
                                : (activity.status === 'COMPLETED' ? t('studentInfo.unknown') : '-')
                              }
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {activity.note || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default StudentReportsPage;