import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ArrowLeft, Users, Settings, BarChart3 } from 'lucide-react';
import { CtxhActivity, ParticipationResponse } from '../types';
import { activityService } from '../services';
import { useToast } from '../../../shared/hooks';
import { Toast } from '../../../shared/components';
import ParticipantManagement from '../components/ParticipantManagement';
import ActivityForm from '../components/ActivityForm';
import { useCtxhPermissions } from '../hooks';

const ActivityDetail: React.FC = () => {
  const { t } = useTranslation(['ctxh', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ctxhPermissions = useCtxhPermissions();

  const [activity, setActivity] = useState<CtxhActivity | null>(null);
  const [participants, setParticipants] = useState<ParticipationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'participants'>('overview');
  const [showEditForm, setShowEditForm] = useState(false);

  // Toast notifications
  const { toasts, hideToast, showError, showSuccess } = useToast();

  // Load activity
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        navigate('/portal/ctxh/activities');
        return;
      }

      try {
        setLoading(true);
        const activityResponse = await activityService.findOne(id);
        setActivity(activityResponse);
      } catch (error) {
        console.error('Failed to load activity:', error);
        showError('Không thể tải thông tin hoạt động!');
        navigate('/portal/ctxh/activities');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate, showError]);

  // Load participants for statistics
  const loadParticipants = async () => {
    if (!activity) return;

    try {
      setParticipantsLoading(true);
      const response = await activityService.getParticipants(activity.id);
      setParticipants(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load participants for stats:', error);
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  // Load participants when activity is loaded
  useEffect(() => {
    if (activity) {
      loadParticipants();
    }
  }, [activity?.id]); // Only reload when activity ID changes

  // Calculate statistics from participants
  const getStatistics = () => {
    const total = participants.length;
    const completed = participants.filter(p => p.status === 'COMPLETED').length;
    const registered = participants.filter(p => p.status === 'REGISTERED').length;
    const cancelled = participants.filter(p => p.status === 'CANCELLED').length;

    return { total, completed, registered, cancelled };
  };

  // Helper functions
  const getCategoryName = (categoryId: string | number | null | undefined): string => {
    if (!categoryId) return t('activity.uncategorized');
    // Use category from activity data instead of loading all categories
    return activity?.category?.name || t('activity.uncategorized');
  };

  const formatDate = (dateString: string | Date | null): string => {
    if (!dateString) return t('common:labels.unknown');
    try {
      const date = new Date(dateString);
      
      // Format: HH:mm DD/MM/YYYY
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch (error) {
      return t('common:labels.unknown');
    }
  };

  const formatNumber = (num: number): string => {
    return num % 1 === 0 ? Math.floor(num).toString() : num.toString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'ACTIVE': { label: t('activity.statusOptions.ACTIVE'), color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' },
      'COMPLETED': { label: t('activity.statusOptions.COMPLETED'), color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' },
      'CANCELLED': { label: t('activity.statusOptions.CANCELLED'), color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' },
      'DRAFT': { label: t('activity.statusOptions.DRAFT'), color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('activity.detail.loading')}</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('activity.detail.notFound')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('activity.detail.notFoundMessage')}</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/portal/ctxh/activities')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common:actions.backToList')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-6 max-w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start space-x-4 min-w-0 flex-1">
            <button
              onClick={() => navigate('/portal/ctxh/activities')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex-shrink-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common:actions.back')}
            </button>

            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white break-words word-wrap overflow-wrap-anywhere">
                <div className="flex items-start gap-3">
                  <Calendar className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <span className="break-all overflow-wrap-anywhere leading-tight">{activity.name}</span>
                </div>
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm lg:text-base">{t('activity.detail.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            {getStatusBadge(activity.status)}
            {ctxhPermissions.activities.update && (
              <button
                onClick={() => setShowEditForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
              >
                <Settings className="mr-2 h-4 w-4" />
                {t('common:actions.edit')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 max-w-full overflow-hidden">
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 min-w-0">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('activity.category')}</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white break-all overflow-wrap-anywhere">
                {getCategoryName(activity.categoryId || (activity as any).category_id)}
              </dd>
            </div>
            <div className="lg:col-span-1 min-w-0">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('activity.organization')}</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white break-all overflow-wrap-anywhere">
                {activity.organization?.name || t('activity.noOrganizationInfo')}
              </dd>
            </div>
            <div className="lg:col-span-1 min-w-0">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('activity.location')}</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white break-all overflow-wrap-anywhere">
                {activity.location || t('activity.noLocation')}
              </dd>
            </div>
            <div className="lg:col-span-1 min-w-0">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('activity.timePeriod')}</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white break-words">
                {(activity.startDate || (activity as any).start_date || activity.endDate || (activity as any).end_date)
                  ? `${formatDate(activity.startDate || (activity as any).start_date || null)} - ${formatDate(activity.endDate || (activity as any).end_date || null)}`
                  : t('activity.noTimePeriod')
                }
              </dd>
            </div>
            <div className="lg:col-span-1 min-w-0">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('activity.totalDays')}</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {(activity.totalDays || (activity as any).total_days) ? formatNumber(activity.totalDays || (activity as any).total_days) : t('common:labels.unknown')} {t('activity.days')}
              </dd>
            </div>
          </div>

          {activity.description && (
            <div className="mt-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('activity.description')}</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white break-all overflow-wrap-anywhere whitespace-pre-wrap">
                {activity.description}
              </dd>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg max-w-full overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <BarChart3 className="inline-block mr-2 h-4 w-4" />
              {t('activity.tabs.overview')}
            </button>

            {ctxhPermissions.activities.view && (
              <button
                onClick={() => setActiveTab('participants')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${activeTab === 'participants'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                <Users className="inline-block mr-2 h-4 w-4" />
                {t('activity.tabs.participants')}
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-w-full overflow-hidden">
          {activeTab === 'overview' && (
            <div className="max-w-full overflow-hidden">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('activity.statistics.title')}</h3>
              {participantsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('activity.statistics.loading')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-full overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{getStatistics().total}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('activity.statistics.totalStudents')}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{getStatistics().completed}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('activity.statistics.completed')}</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{getStatistics().registered}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('activity.statistics.participating')}</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{getStatistics().cancelled}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('activity.statistics.cancelled')}</div>
                  </div>
                </div>
              )}

              {/* Additional Overview Information */}
              {!participantsLoading && participants.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">{t('activity.statistics.detailedTitle')}</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('activity.statistics.completionRate')}:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {getStatistics().total > 0
                            ? `${Math.round((getStatistics().completed / getStatistics().total) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('activity.statistics.participatingStudents')}:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {getStatistics().registered} {t('activity.students')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!participantsLoading && participants.length === 0 && (
                <div className="mt-8 text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h4 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('activity.noParticipants')}</h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('activity.noParticipantsMessage')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'participants' && activity && ctxhPermissions.activities.view && (
            <ParticipantManagement
              activity={activity}
              participants={participants}
              onRefresh={() => {
                // Refresh participants data for statistics
                loadParticipants();
              }}
            />
          )}

        </div>
      </div>

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

      {/* Activity Edit Form Modal */}
      {activity && (
        <ActivityForm
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSubmit={async (activityData: any) => {
            try {
              const updatedActivity = await activityService.update(activity.id, activityData);
              setActivity(updatedActivity);
              setShowEditForm(false);
              showSuccess(t('activity.updateSuccess'));
            } catch (error) {
              console.error('Failed to update activity:', error);
              // Error toast will be shown by ActivityForm
            }
          }}
          activity={activity}
          title={t('activity.editTitle')}
        />
      )}
    </div>
  );
};

export default ActivityDetail;
