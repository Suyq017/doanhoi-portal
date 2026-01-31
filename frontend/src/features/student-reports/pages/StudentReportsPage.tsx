import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';

// Hooks
import { useStudentReportsPage } from '../hooks';

// Components
import {
  PageHeader,
  LoadingState,
  EmptyState,
  StudentInfoCard,
  SummaryStatsGrid,
  ActivitiesTable,
} from '../components';

/**
 * StudentReportsPage Component
 * Main page for displaying student CTXH (community service) reports
 * 
 * Following principles:
 * 1. Separation of Concerns: Logic in custom hook, UI in components
 * 2. Reusable Components: Shared components for different sections
 * 3. Custom Hooks: useStudentReportsPage for state and business logic
 * 4. Type Safety: All props and return values are typed
 */
const StudentReportsPage: React.FC = () => {
  const { t } = useTranslation('student-reports');

  // Use custom hook for all state and business logic
  const {
    report,
    isLoading,
    formatDays,
    getStatusDisplay,
    isCtxhAchieved,
    displayName,
    displayEmail,
  } = useStudentReportsPage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* Loading State */}
      {isLoading && <LoadingState />}

      {/* Content */}
      {!isLoading && (
        <>
          {!report ? (
            <EmptyState
              title={t('messages.notFound')}
              description={t('messages.error')}
              icon={<User className="mx-auto h-12 w-12 text-gray-400" />}
            />
          ) : (
            <>
              {/* Student Info */}
              <StudentInfoCard
                report={report}
                displayName={displayName}
                displayEmail={displayEmail}
                formatDays={formatDays}
              />

              {/* Summary Stats */}
              <SummaryStatsGrid
                report={report}
                formatDays={formatDays}
                isAchieved={isCtxhAchieved}
                achievedText={t('summary.achieved')}
                notAchievedText={t('summary.notAchieved')}
              />

              {/* Activities Table */}
              <ActivitiesTable
                activities={report.activities || []}
                formatDays={formatDays}
                getStatusDisplay={getStatusDisplay}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default StudentReportsPage;