import { ActivityStatus, ParticipationStatus, LimitConfigStatus } from '../types';

// Status display utilities
export const getActivityStatusDisplay = (status: ActivityStatus): { label: string; color: string; bgColor: string } => {
  switch (status) {
    case ActivityStatus.DRAFT:
      return { label: 'Nháp', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    case ActivityStatus.ACTIVE:
      return { label: 'Đang hoạt động', color: 'text-green-600', bgColor: 'bg-green-100' };
    case ActivityStatus.COMPLETED:
      return { label: 'Hoàn thành', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    case ActivityStatus.CANCELLED:
      return { label: 'Đã hủy', color: 'text-red-600', bgColor: 'bg-red-100' };
    default:
      return { label: 'Không xác định', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
};

export const getParticipationStatusDisplay = (status: ParticipationStatus): { label: string; color: string; bgColor: string } => {
  switch (status) {
    case ParticipationStatus.REGISTERED:
      return { label: 'Đã đăng ký', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    case ParticipationStatus.COMPLETED:
      return { label: 'Hoàn thành', color: 'text-green-600', bgColor: 'bg-green-100' };
    case ParticipationStatus.CANCELLED:
      return { label: 'Đã hủy', color: 'text-red-600', bgColor: 'bg-red-100' };
    default:
      return { label: 'Không xác định', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
};

export const getLimitConfigStatusDisplay = (status: LimitConfigStatus): { label: string; color: string; bgColor: string } => {
  switch (status) {
    case LimitConfigStatus.ACTIVE:
      return { label: 'Đang áp dụng', color: 'text-green-600', bgColor: 'bg-green-100' };
    case LimitConfigStatus.INACTIVE:
      return { label: 'Không áp dụng', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    case LimitConfigStatus.DRAFT:
      return { label: 'Nháp', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    default:
      return { label: 'Không xác định', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
};

// Date formatting utilities
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// File download utilities
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Excel file validation
export const validateExcelFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  if (!validTypes.includes(file.type)) {
    return { isValid: false, error: 'Chỉ chấp nhận file Excel (.xlsx, .xls)' };
  }
  
  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return { isValid: false, error: 'File quá lớn. Kích thước tối đa là 5MB' };
  }
  
  return { isValid: true };
};

// Activity validation utilities
export const canGradeActivity = (status: ActivityStatus): boolean => {
  return status === ActivityStatus.COMPLETED;
};

export const canEditActivity = (status: ActivityStatus): boolean => {
  return status === ActivityStatus.DRAFT || status === ActivityStatus.ACTIVE;
};

export const canDeleteActivity = (status: ActivityStatus): boolean => {
  return status === ActivityStatus.DRAFT;
};

// CTXH days calculation utilities
export const calculateTotalDays = (participations: any[]): number => {
  return participations
    .filter(p => p.status === ParticipationStatus.COMPLETED && p.actualDays)
    .reduce((total, p) => total + (p.actualDays || 0), 0);
};

export const calculateProgress = (currentDays: number, requiredDays: number): number => {
  if (requiredDays === 0) return 100;
  return Math.min((currentDays / requiredDays) * 100, 100);
};

// Form validation utilities
export const validateRequired = (value: any, fieldName: string): string | null => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} không được để trống`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email không đúng định dạng';
  }
  return null;
};

export const validateStudentCode = (code: string): string | null => {
  // Vietnamese student code format: 7-10 digits
  const codeRegex = /^\d{7,10}$/;
  if (!codeRegex.test(code)) {
    return 'Mã số sinh viên không đúng định dạng (7-10 chữ số)';
  }
  return null;
};

export const validatePositiveNumber = (value: number, fieldName: string): string | null => {
  if (isNaN(value) || value < 0) {
    return `${fieldName} phải là số dương`;
  }
  return null;
};

// Error handling utilities
export const getErrorMessage = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Đã xảy ra lỗi không xác định';
};

// Debounce utility for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Local storage utilities for CTXH
export const CTXH_STORAGE_KEYS = {
  CATEGORY_FILTERS: 'ctxh_category_filters',
  ACTIVITY_FILTERS: 'ctxh_activity_filters',
  LIMIT_CONFIG_FILTERS: 'ctxh_limit_config_filters',
  LAST_SELECTED_ORGANIZATION: 'ctxh_last_organization'
} as const;

export const saveToStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Could not save to localStorage:', error);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Could not load from localStorage:', error);
    return defaultValue;
  }
};