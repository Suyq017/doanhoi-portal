import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  CheckCircle, 
  Clock, 
  BarChart3 
} from 'lucide-react';
import { 
  StudentReport,
  ParticipationStatus 
} from '../types';
import { studentReportsService } from '../services/studentReportsService';
import { userService } from '../../../shared/services/userService';
import { useAuth } from '../../auth/context/AuthContext';

const StudentReportsPage: React.FC = () => {
  // Auth context để lấy thông tin user
  const { auth } = useAuth();
    
  // State management
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<{name?: string, email?: string}>({});
    
  // Load report data
  useEffect(() => {
    const loadReport = async () => {
      // Lấy student code từ auth context
      const studentCode = auth.user?.code || '2212870'; // fallback for testing
            
      setLoading(true);
      try {
        console.log('Loading student report for code:', studentCode);
        const reportData = await studentReportsService.getMyReport(studentCode, {});
        console.log('Report data received:', reportData);
        setReport(reportData);
                
        // Nếu không có tên hoặc email, thử tra cứu từ user service
        if (!reportData.student_name || !reportData.student_email) {
          try {
            console.log('Searching for student info by code:', studentCode);
            const usersResponse = await userService.getUsers({ search: studentCode, limit: 1 });
            if (usersResponse.users && usersResponse.users.length > 0) {
              const user = usersResponse.users[0];
              setStudentInfo({
                name: user.familyName + ' ' + user.givenName,
                email: user.email
              });
              console.log('Found student info:', { name: user.familyName + ' ' + user.givenName, email: user.email });
            }
          } catch (userError) {
            console.log('Could not fetch user info:', userError);
          }
        }
      } catch (error) {
        console.error('Error fetching student report:', error);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    // Chỉ load khi đã có thông tin auth
    if (auth.user || !auth.isLoading) {
      loadReport();
    }
  }, [auth.user, auth.isLoading]);

  // Status display helpers
  const getStatusDisplay = (status: string) => {
    const statusConfig: Record<string, {
      text: string;
      className: string;
      icon: React.ReactElement;
    }> = {
      [ParticipationStatus.COMPLETED]: {
        text: 'Hoàn thành',
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="h-3 w-3" />
      },
      [ParticipationStatus.REGISTERED]: {
        text: 'Đã đăng ký',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Clock className="h-3 w-3" />
      },
      [ParticipationStatus.CANCELLED]: {
        text: 'Đã hủy',
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
            Báo cáo cá nhân
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Xem báo cáo hoạt động công tác xã hội của bạn
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Đang tải báo cáo...</span>
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
                    Không thể tải báo cáo
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Có lỗi xảy ra khi tải dữ liệu báo cáo của bạn.
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
                  Thông tin sinh viên
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Họ và tên</label>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report?.student_name || studentInfo.name || 'Tra cứu từ MSSV: ' + (report?.student_code || 'Không xác định')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Mã số sinh viên</label>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report?.student_code || 'Không xác định'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report?.student_email || studentInfo.email || 'Tra cứu từ MSSV: ' + (report?.student_code || 'Không xác định')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Tổng ngày CTXH</label>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {report?.total_days_completed || 0} ngày
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Hoạt động cá nhân
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {report?.total_activities_participated || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Tổng hoạt động</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {report?.activities?.filter(a => a.status === 'COMPLETED').length || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Đã hoàn thành</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {report?.total_days_completed || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Ngày tích lũy</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className={`text-2xl font-bold ${(report?.total_days_completed || 0) >= 15 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(report?.total_days_completed || 0) >= 15 ? 'Đạt' : 'Chưa đạt'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Trạng thái</div>
                  </div>
                </div>
              </div>

              {/* Activities Table */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Danh sách hoạt động ({report?.activities?.length || 0})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  {!report?.activities || report.activities.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Chưa có hoạt động nào</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Bạn chưa tham gia hoạt động CTXH nào.
                      </p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Hoạt động
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Danh mục
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Số ngày
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Trạng thái
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Ngày tham gia
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {(report?.activities || []).map((activity, index) => (
                          <tr key={activity.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {activity.activity_name || 'Không có tên'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {activity.category_name || 'Không xác định'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {activity.days_completed || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusDisplay(activity.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {activity.created_at 
                                ? new Date(activity.created_at).toLocaleDateString('vi-VN')
                                : 'Chưa xác định'
                              }
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