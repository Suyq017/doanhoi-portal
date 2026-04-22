import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../shared/hooks';
import { useCtxhPermissions } from './useCtxhPermissions';
import { activityService } from '../services';
import {
    CtxhActivity,
    ParticipationResponse,
    UseActivityDetailReturn,
    ActivityDetailTab,
    ActivityStatistics
} from '../types';

/**
 * Custom hook for Activity Detail page
 * Handles all state and business logic for viewing and editing activity details
 */
export const useActivityDetail = (): UseActivityDetailReturn => {
    const { t } = useTranslation(['ctxh', 'common']);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const ctxhPermissions = useCtxhPermissions();

    // State
    const [activity, setActivity] = useState<CtxhActivity | null>(null);
    const [participants, setParticipants] = useState<ParticipationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [participantsLoading, setParticipantsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<ActivityDetailTab>('overview');
    const [showEditForm, setShowEditForm] = useState(false);

    // Toast notifications
    const { toasts, hideToast, showError, showSuccess } = useToast();

    // Load activity data
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

    // Load participants
    const loadParticipants = useCallback(async () => {
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
    }, [activity]);

    // Load participants when activity is loaded
    useEffect(() => {
        if (activity) {
            loadParticipants();
        }
    }, [activity?.id, loadParticipants]);

    // Calculate statistics
    const getStatistics = useCallback((): ActivityStatistics => {
        const total = participants.length;
        const completed = participants.filter(p => p.status === 'COMPLETED').length;
        const registered = participants.filter(
            p => p.status === 'APPROVED' || p.status === 'REGISTERED'
        ).length;
        const cancelled = participants.filter(p => p.status === 'CANCELLED').length;

        return { total, completed, registered, cancelled };
    }, [participants]);

    // Helper functions
    const getCategoryName = useCallback((categoryId: string | number | null | undefined): string => {
        if (!categoryId) return t('activity.uncategorized');
        return activity?.category?.name || t('activity.uncategorized');
    }, [activity, t]);

    const formatDate = useCallback((dateString: string | Date | null): string => {
        if (!dateString) return t('common:labels.unknown');
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${hours}:${minutes} ${day}/${month}/${year}`;
        } catch (error) {
            return t('common:labels.unknown');
        }
    }, [t]);

    const formatNumber = useCallback((num: number): string => {
        return num % 1 === 0 ? Math.floor(num).toString() : num.toString();
    }, []);

    const getStatusBadge = useCallback((status: string): { label: string; color: string } => {
        const statusConfig = {
            'ACTIVE': {
                label: t('activity.statusOptions.ACTIVE'),
                color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            },
            'COMPLETED': {
                label: t('activity.statusOptions.COMPLETED'),
                color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            },
            'CANCELLED': {
                label: t('activity.statusOptions.CANCELLED'),
                color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            },
            'DRAFT': {
                label: t('activity.statusOptions.DRAFT'),
                color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
            }
        };

        return statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    }, [t]);

    // Action handlers
    const handleBack = useCallback(() => {
        const navState = location.state as { from?: string; category?: any } | null;

        if (navState?.from === 'category-detail' && navState.category) {
            navigate('/portal/ctxh/categories', {
                state: {
                    openCategoryDetail: navState.category,
                },
            });
            return;
        }

        navigate('/portal/ctxh/activities');
    }, [location.state, navigate]);

    const handleActivityUpdate = useCallback(async (activityData: any) => {
        if (!activity) return;

        try {
            const updatedActivity = await activityService.update(activity.id, activityData);
            setActivity(updatedActivity);
            setShowEditForm(false);
            showSuccess(t('activity.updateSuccess'));
        } catch (error) {
            console.error('Failed to update activity:', error);
            throw error;
        }
    }, [activity, showSuccess, t]);

    return {
        // State
        activity,
        participants,
        loading,
        participantsLoading,
        activeTab,
        showEditForm,

        // Computed
        statistics: getStatistics(),

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
        canUpdate: ctxhPermissions.activities.update,
        canViewParticipants: ctxhPermissions.activities.view,

        // Toast
        toasts,
        hideToast
    };
};
