import React from 'react';
import { Calendar, ArrowLeft, Settings, BarChart3, Users } from 'lucide-react';
import { CtxhActivity } from '../../types';

// =============================================================================
// Activity Detail Header
// =============================================================================

interface ActivityDetailHeaderProps {
    activity: CtxhActivity;
    onBack: () => void;
    onEdit: () => void;
    canUpdate: boolean;
    statusBadge: { label: string; color: string };
    labels: {
        back: string;
        edit: string;
        subtitle: string;
    };
}

export const ActivityDetailHeader: React.FC<ActivityDetailHeaderProps> = ({
    activity,
    onBack,
    onEdit,
    canUpdate,
    statusBadge,
    labels
}) => {
    return (
        <div className="mb-6 max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex items-start space-x-4 min-w-0 flex-1">
                    <button
                        onClick={onBack}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex-shrink-0"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {labels.back}
                    </button>

                    <div className="min-w-0 flex-1 overflow-hidden">
                        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white break-words word-wrap overflow-wrap-anywhere">
                            <div className="flex items-start gap-3">
                                <Calendar className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                                <span className="break-all overflow-wrap-anywhere leading-tight">{activity.name}</span>
                            </div>
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm lg:text-base">{labels.subtitle}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-4 flex-shrink-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}>
                        {statusBadge.label}
                    </span>
                    {canUpdate && (
                        <button
                            onClick={onEdit}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            {labels.edit}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// Activity Summary Card
// =============================================================================

interface ActivitySummaryProps {
    activity: CtxhActivity;
    getCategoryName: (categoryId: string | number | null | undefined) => string;
    formatDate: (dateString: string | Date | null) => string;
    formatNumber: (num: number) => string;
    labels: {
        category: string;
        organization: string;
        location: string;
        timePeriod: string;
        totalDays: string;
        maxParticipants: string;
        description: string;
        noOrganization: string;
        noLocation: string;
        noTimePeriod: string;
        days: string;
        unlimited: string;
        unknown: string;
    };
}

export const ActivitySummary: React.FC<ActivitySummaryProps> = ({
    activity,
    getCategoryName,
    formatDate,
    formatNumber,
    labels
}) => {
    const startDate = activity.startDate || (activity as any).start_date;
    const endDate = activity.endDate || (activity as any).end_date;
    const totalDays = activity.totalDays || (activity as any).total_days;
    const maxParticipants = activity.maxParticipants || (activity as any).max_participants;

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 max-w-full overflow-hidden">
            <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SummaryField
                        label={labels.category}
                        value={getCategoryName(activity.categoryId || (activity as any).category_id)}
                    />
                    <SummaryField
                        label={labels.organization}
                        value={activity.organization?.name || labels.noOrganization}
                    />
                    <SummaryField
                        label={labels.location}
                        value={activity.location || labels.noLocation}
                    />
                    <SummaryField
                        label={labels.timePeriod}
                        value={
                            (startDate || endDate)
                                ? `${formatDate(startDate || null)} - ${formatDate(endDate || null)}`
                                : labels.noTimePeriod
                        }
                    />
                    <SummaryField
                        label={labels.totalDays}
                        value={totalDays ? `${formatNumber(totalDays)} ${labels.days}` : labels.unknown}
                    />
                    <SummaryField
                        label={labels.maxParticipants}
                        value={maxParticipants ? formatNumber(maxParticipants) : labels.unlimited}
                    />
                </div>

                {activity.description && (
                    <div className="mt-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{labels.description}</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white break-all overflow-wrap-anywhere whitespace-pre-wrap">
                            {activity.description}
                        </dd>
                    </div>
                )}
            </div>
        </div>
    );
};

interface SummaryFieldProps {
    label: string;
    value: string;
}

const SummaryField: React.FC<SummaryFieldProps> = ({ label, value }) => (
    <div className="lg:col-span-1 min-w-0">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-white break-all overflow-wrap-anywhere">
            {value}
        </dd>
    </div>
);

// =============================================================================
// Tab Navigation
// =============================================================================

interface TabNavigationProps {
    activeTab: 'overview' | 'participants';
    onTabChange: (tab: 'overview' | 'participants') => void;
    canViewParticipants: boolean;
    labels: {
        overview: string;
        participants: string;
    };
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
    activeTab,
    onTabChange,
    canViewParticipants,
    labels
}) => {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
                <TabButton
                    active={activeTab === 'overview'}
                    onClick={() => onTabChange('overview')}
                    icon={<BarChart3 className="inline-block mr-2 h-4 w-4" />}
                    label={labels.overview}
                />

                {canViewParticipants && (
                    <TabButton
                        active={activeTab === 'participants'}
                        onClick={() => onTabChange('participants')}
                        icon={<Users className="inline-block mr-2 h-4 w-4" />}
                        label={labels.participants}
                    />
                )}
            </nav>
        </div>
    );
};

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${active
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
    >
        {icon}
        {label}
    </button>
);
