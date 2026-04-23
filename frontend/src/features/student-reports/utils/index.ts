import { ParticipationStatus } from '../types';

// Format date to Vietnamese locale
export const formatDate = (dateString: string | Date | null): string => {
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

// Format date range
export const formatDateRange = (startDate: string | Date | null, endDate: string | Date | null): string => {
  if (!startDate && !endDate) return 'Không xác định';
  if (!startDate) return `Đến ${formatDate(endDate)}`;
  if (!endDate) return `Từ ${formatDate(startDate)}`;
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

// Get status badge configuration
export const getStatusConfig = (status: ParticipationStatus) => {
  const configs = {
    [ParticipationStatus.REGISTERED]: {
      label: 'Đang tham gia',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '🕐'
    },
    [ParticipationStatus.COMPLETED]: {
      label: 'Hoàn thành',
      color: 'bg-green-100 text-green-800',
      icon: '✅'
    },
    [ParticipationStatus.CANCELLED]: {
      label: 'Đã hủy',
      color: 'bg-red-100 text-red-800',
      icon: '❌'
    }
  };

  return configs[status] || configs[ParticipationStatus.REGISTERED];
};

// Calculate completion percentage
export const calculateCompletionRate = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// Get period label
export const getPeriodLabel = (period: string): string => {
  const labels = {
    'all': 'Tất cả thời gian',
    'current_semester': 'Học kỳ hiện tại',
    'current_year': 'Năm học hiện tại',
    'custom': 'Tùy chọn'
  };

  return labels[period as keyof typeof labels] || 'Không xác định';
};

// Extract error message from API error
export const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Đã xảy ra lỗi không xác định';
};

// Download file from blob
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Generate export filename
export const generateExportFilename = (
  format: 'pdf' | 'excel',
  studentCode?: string,
  period?: string
): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  
  let filename = 'bao-cao-ctxh';
  
  if (studentCode) {
    filename += `-${studentCode}`;
  }
  
  if (period && period !== 'all') {
    filename += `-${period}`;
  }
  
  filename += `-${timestamp}.${extension}`;
  
  return filename;
};

// Validate student code format
export const validateStudentCode = (code: string): boolean => {
  // Assuming HCMUT student code format: 7 digits
  const pattern = /^\d{7}$/;
  return pattern.test(code);
};

// Format days with unit
export const formatDays = (days: number | null | undefined): string => {
  if (days === null || days === undefined) return 'Chưa có';
  return `${days} ngày`;
};