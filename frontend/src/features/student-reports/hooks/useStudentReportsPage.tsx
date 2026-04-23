import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { userService } from '../../../shared/services/userService';
import { useStudentReport } from '@/shared/hooks/queries';
import { ParticipationStatus } from '../types';
import type { UseStudentReportsPageReturn, StudentInfoState } from '../types/hooks.types';

/**
 * Custom hook for StudentReportsPage
 * Handles all state management and business logic for the student reports page
 */
export const useStudentReportsPage = (): UseStudentReportsPageReturn => {
  const { t } = useTranslation('student-reports');
  const { auth } = useAuth();

  // Get student code from auth
  const studentCode = auth.user?.code || '2212870'; // fallback for testing

  // State management
  const [studentInfo, setStudentInfo] = useState<StudentInfoState>({});

  // ✅ Use TanStack Query for student report
  const {
    data: report,
    isLoading,
  } = useStudentReport(studentCode, {}, {
    enabled: !!auth.user || !auth.isLoading
  });

  /**
   * Format days to show integers when possible (e.g., 3.0 -> 3, 3.5 -> 3.5)
   */
  const formatDays = useCallback((days: number | null | undefined): string => {
    if (days === null || days === undefined) return '0';
    return parseFloat(days.toString()).toString();
  }, []);

  /**
   * Get status display component with icon and styling
   */
  const getStatusDisplay = useCallback((status: string) => {
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
  }, [t]);

  // Load student info if not in report
  useEffect(() => {
    const loadStudentInfo = async () => {
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

  // Computed values
  const isCtxhAchieved = (report?.total_days_completed || 0) >= 15;
  
  const displayName = report?.student_name || studentInfo.name || `Tra cứu từ MSSV: ${report?.student_code || t('studentInfo.unknown')}`;
  
  const displayEmail = report?.student_email || studentInfo.email || `Tra cứu từ MSSV: ${report?.student_code || t('studentInfo.unknown')}`;

  return {
    // Data
    report,
    studentInfo,
    studentCode,

    // Loading states
    isLoading,

    // Helpers
    formatDays,
    getStatusDisplay,

    // Computed values
    isCtxhAchieved,
    displayName,
    displayEmail,
  };
};

export default useStudentReportsPage;
