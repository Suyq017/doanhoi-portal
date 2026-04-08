import React from 'react';
import { useTranslation } from 'react-i18next';
import { useActivityDetail } from '../hooks';
import { 
  ContainerLoading, 
  ActivityNotFound,
  ToastContainer,
  NoParticipantsState
} from '../components/shared';
import {
  ActivityDetailHeader,
  ActivitySummary,
  TabNavigation
} from '../components/shared/ActivityDetailComponents';
import { StatisticsGrid, CompletionRateDetails } from '../components/shared/Statistics';
import ParticipantManagement from '../components/ParticipantManagement';
import ActivityForm from '../components/ActivityForm';

/**
 * Activity Detail Page
 * Refactored with separation of concerns using custom hook
 */
const ActivityDetail: React.FC = () => {
  const { t } = useTranslation(['ctxh', 'common']);

  const {
    // State
    activity,
    participants,
    loading,
    participantsLoading,
    activeTab,
    showEditForm,
    
    // Computed
    statistics,
    
    // Actions
    setActiveTab,
    setShowEditForm,
    handleBack,
    handleActivityUpdate,
    loadParticipants,
    
    // Helpers
    getCategoryName,
    formatDate,
    formatNumber,
    getStatusBadge,
    
    // Permissions
    canUpdate,
    canViewParticipants,
    
    // Toast
    toasts,
    hideToast
  } = useActivityDetail();

  // Loading state
  if (loading) {
    return <ContainerLoading message={t('activity.detail.loading')} />;
  }

  // Not found state
  if (!activity) {
    return (
      <ActivityNotFound
        onBack={handleBack}
        title={t('activity.detail.notFound')}
        message={t('activity.detail.notFoundMessage')}
        backLabel={t('common:actions.backToList')}
      />
    );
  }

  const statusBadge = getStatusBadge(activity.status);

  return (
    <div className="container mx-auto px-4 py-6 max-w-full overflow-hidden">
      {/* Header */}
      <ActivityDetailHeader
        activity={activity}
        onBack={handleBack}
        onEdit={() => setShowEditForm(true)}
        canUpdate={canUpdate}
        statusBadge={statusBadge}
        labels={{
          back: t('common:actions.back'),
          edit: t('common:actions.edit'),
          subtitle: t('activity.detail.subtitle')
        }}
      />

      {/* Activity Summary */}
      <ActivitySummary
        activity={activity}
        getCategoryName={getCategoryName}
        formatDate={formatDate}
        formatNumber={formatNumber}
        labels={{
          category: t('activity.category'),
          organization: t('activity.organization'),
          location: t('activity.location'),
          timePeriod: t('activity.timePeriod'),
          totalDays: t('activity.totalDays'),
          maxParticipants: t('activity.maxParticipants'),
          description: t('activity.description'),
          noOrganization: t('activity.noOrganizationInfo'),
          noLocation: t('activity.noLocation'),
          noTimePeriod: t('activity.noTimePeriod'),
          days: t('activity.days'),
          unlimited: t('activity.unlimited'),
          unknown: t('common:labels.unknown')
        }}
      />

      {/* Tab Container */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg max-w-full overflow-hidden">
        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          canViewParticipants={canViewParticipants}
          labels={{
            overview: t('activity.tabs.overview'),
            participants: t('activity.tabs.participants')
          }}
        />

        {/* Tab Content */}
        <div className="p-6 max-w-full overflow-hidden">
          {activeTab === 'overview' && (
            <div className="max-w-full overflow-hidden">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('activity.statistics.title')}
              </h3>
              
              <StatisticsGrid
                statistics={statistics}
                isLoading={participantsLoading}
                labels={{
                  total: t('activity.statistics.totalStudents'),
                  completed: t('activity.statistics.completed'),
                  participating: t('activity.statistics.participating'),
                  loading: t('activity.statistics.loading')
                }}
              />

              {/* Additional Overview Information */}
              {!participantsLoading && participants.length > 0 && (
                <>
                  <h4 className="mt-8 text-md font-medium text-gray-900 dark:text-white mb-4">
                    {t('activity.statistics.detailedTitle')}
                  </h4>
                  <CompletionRateDetails
                    completed={statistics.completed}
                    total={statistics.total}
                    registered={statistics.registered}
                    labels={{
                      completionRate: t('activity.statistics.completionRate'),
                      participatingStudents: t('activity.statistics.participatingStudents'),
                      students: t('activity.students')
                    }}
                  />
                </>
              )}

              {!participantsLoading && participants.length === 0 && (
                <NoParticipantsState
                  title={t('activity.noParticipants')}
                  message={t('activity.noParticipantsMessage')}
                />
              )}
            </div>
          )}

          {activeTab === 'participants' && activity && canViewParticipants && (
            <ParticipantManagement
              activity={activity}
              participants={participants}
              onRefresh={loadParticipants}
            />
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onHide={hideToast} />

      {/* Activity Edit Form Modal */}
      {activity && (
        <ActivityForm
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSubmit={handleActivityUpdate}
          activity={activity}
          title={t('activity.editTitle')}
        />
      )}
    </div>
  );
};

export default ActivityDetail;
