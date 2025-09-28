import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Users, Settings, BarChart3 } from 'lucide-react';
import { CtxhActivity, CtxhCategory, ParticipationResponse } from '../types';
import { activityService, categoryService } from '../services';
import { useToast } from '../../../shared/hooks';
import { Toast } from '../../../shared/components';
import ParticipantManagement from '../components/ParticipantManagement';
import ActivityForm from '../components/ActivityForm';

const ActivityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [activity, setActivity] = useState<CtxhActivity | null>(null);
  const [categories, setCategories] = useState<CtxhCategory[]>([]);
  const [participants, setParticipants] = useState<ParticipationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'participants'>('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  
  // Toast notifications
  const { toasts, hideToast, showError, showSuccess } = useToast();

  // Load activity and categories
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        navigate('/ctxh/activities');
        return;
      }

      try {
        setLoading(true);
        
        // Load activity and categories in parallel
        const [activityResponse, categoriesResponse] = await Promise.all([
          activityService.findOne(id),
          categoryService.findAll({ limit: 100 })
        ]);
        
        setActivity(activityResponse);
        
        // Handle categories response format
        const categoriesData = Array.isArray(categoriesResponse) 
          ? categoriesResponse 
          : categoriesResponse.data || [];
        setCategories(categoriesData);
        
      } catch (error) {
        console.error('Failed to load activity:', error);
        showError('Không thể tải thông tin hoạt động!');
        navigate('/ctxh/activities');
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

  // Load participants when activity is loaded or tab changes to overview
  useEffect(() => {
    if (activity && (activeTab === 'overview' || activeTab === 'participants')) {
      loadParticipants();
    }
  }, [activity, activeTab]);

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
    if (!categoryId) return 'Chưa phân loại';
    const category = categories.find(cat => String(cat.id) === String(categoryId));
    return category?.name || 'Chưa phân loại';
  };

  const formatDate = (dateString: string | Date | null): string => {
    if (!dateString) return 'Không xác định';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Không xác định';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'ACTIVE': { label: 'Đang hoạt động', color: 'bg-green-100 text-green-800' },
      'COMPLETED': { label: 'Hoàn thành', color: 'bg-gray-100 text-gray-800' },
      'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
      'DRAFT': { label: 'Nháp', color: 'bg-yellow-100 text-yellow-800' }
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Đang tải thông tin hoạt động...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy hoạt động</h3>
          <p className="mt-1 text-sm text-gray-500">Hoạt động không tồn tại hoặc đã bị xóa.</p>
          <div className="mt-6">
            <button 
              onClick={() => navigate('/ctxh/activities')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/ctxh/activities')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Calendar className="mr-3 h-8 w-8 text-blue-600" />
                {activity.name}
              </h1>
              <p className="mt-2 text-gray-600">Chi tiết hoạt động CTXH</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {getStatusBadge(activity.status)}
            <button
              onClick={() => setShowEditForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
            >
              <Settings className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </button>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Danh mục</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {getCategoryName((activity as any).category_id)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tổ chức</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {activity.organization?.name || 'Chưa có thông tin tổ chức'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Thời gian</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate((activity as any).start_date)} - {formatDate((activity as any).end_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tổng số ngày</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {(activity as any).total_days || 'Chưa xác định'} ngày
              </dd>
            </div>
          </div>
          
          {activity.description && (
            <div className="mt-6">
              <dt className="text-sm font-medium text-gray-500">Mô tả</dt>
              <dd className="mt-1 text-sm text-gray-900">{activity.description}</dd>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="inline-block mr-2 h-4 w-4" />
              Tổng quan
            </button>
            
            <button
              onClick={() => setActiveTab('participants')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'participants'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline-block mr-2 h-4 w-4" />
              Sinh viên tham gia
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Thống kê hoạt động</h3>
              {participantsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Đang tải thống kê...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{getStatistics().total}</div>
                    <div className="text-sm text-gray-600">Tổng sinh viên</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{getStatistics().completed}</div>
                    <div className="text-sm text-gray-600">Đã hoàn thành</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{getStatistics().registered}</div>
                    <div className="text-sm text-gray-600">Đang tham gia</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{getStatistics().cancelled}</div>
                    <div className="text-sm text-gray-600">Đã hủy</div>
                  </div>
                </div>
              )}
              
              {/* Additional Overview Information */}
              {!participantsLoading && participants.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Chi tiết thống kê</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Tỷ lệ hoàn thành:</span>
                        <span className="ml-2 text-gray-600">
                          {getStatistics().total > 0 
                            ? `${Math.round((getStatistics().completed / getStatistics().total) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Sinh viên đang tham gia:</span>
                        <span className="ml-2 text-gray-600">
                          {getStatistics().registered} sinh viên
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {!participantsLoading && participants.length === 0 && (
                <div className="mt-8 text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h4 className="mt-2 text-sm font-medium text-gray-900">Chưa có sinh viên tham gia</h4>
                  <p className="mt-1 text-sm text-gray-500">Chuyển sang tab "Sinh viên tham gia" để thêm sinh viên.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'participants' && activity && (
            <ParticipantManagement 
              activity={activity}
              onRefresh={() => {
                // Refresh participants data for statistics
                loadParticipants();
              }}
            />
          )}

        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-4">
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
              showSuccess('Cập nhật hoạt động thành công!');
            } catch (error) {
              console.error('Failed to update activity:', error);
              // Error toast will be shown by ActivityForm
            }
          }}
          activity={activity}
          title="Chỉnh sửa hoạt động"
        />
      )}
    </div>
  );
};

export default ActivityDetail;