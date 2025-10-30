import React, { useEffect } from 'react';
import { BarChart3, Users, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/context/AuthContext';
import AwsS3ConfigSection from './components/AwsS3ConfigSection';

const Dashboard: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const auth = useAuth();
  const [isCheckingPermission, setIsCheckingPermission] = React.useState(true);

  // Check dashboard.access permission on mount
  useEffect(() => {
    const hasDashboardAccess = auth.hasPermission('dashboard.access');

    if (!hasDashboardAccess) {
      console.log('User does not have dashboard.access permission, redirecting to student-reports');
      navigate('/student-reports', { replace: true });
    } else {
      setIsCheckingPermission(false);
    }
  }, [auth, navigate]);

  // Show loading while checking permission
  if (isCheckingPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-doan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {t('common:loading')}
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: t('dashboard:stats.totalMembers'),
      value: '1,234',
      change: '+12%',
      changeType: 'increase',
      icon: Users,
      color: 'bg-doan-500',
    },
    {
      name: t('dashboard:stats.doanMembers'),
      value: '856',
      change: '+8%',
      changeType: 'increase',
      icon: Users,
      color: 'bg-doan-500',
    },
    {
      name: t('dashboard:stats.hoiMembers'),
      value: '678',
      change: '+15%',
      changeType: 'increase',
      icon: Users,
      color: 'bg-hsv-500',
    },
    {
      name: t('dashboard:stats.organizations'),
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
          {t('dashboard:title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('dashboard:subtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700"
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
                    <p className={`ml-2 text-sm font-medium ${stat.changeType === 'increase'
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t('dashboard:activities.title')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-doan-500"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard:activities.added15Members')}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-hsv-500"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard:activities.updatedClub')}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard:activities.createdBranch')}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t('dashboard:actions.title')}
          </h3>
          <div className="space-y-3">
            <button className="flex items-center justify-between w-full p-3 text-left transition-colors border border-gray-200 rounded-md dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t('dashboard:actions.addUser')}
              </span>
              <Users className="w-4 h-4 text-gray-400" />
            </button>
            <button className="flex items-center justify-between w-full p-3 text-left transition-colors border border-gray-200 rounded-md dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t('dashboard:actions.createOrg')}
              </span>
              <Building className="w-4 h-4 text-gray-400" />
            </button>
            <button className="flex items-center justify-between w-full p-3 text-left transition-colors border border-gray-200 rounded-md dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t('dashboard:actions.viewReports')}
              </span>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* AWS S3 Configuration Section */}
      <AwsS3ConfigSection />
    </div>
  );
};

export default Dashboard;
