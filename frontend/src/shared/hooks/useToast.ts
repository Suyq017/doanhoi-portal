import { useState, useCallback, useRef } from 'react';
import { ToastType } from '../components/Toast';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: ''
  });
  const toastIdRef = useRef(0);

  const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = (++toastIdRef.current).toString();
    const newToast: ToastMessage = {
      id,
      type,
      message,
      duration,
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    return showToast('success', message, duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    return showToast('error', message, duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    return showToast('warning', message, duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    return showToast('info', message, duration);
  }, [showToast]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      variant?: 'danger' | 'warning' | 'info';
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        variant: options?.variant || 'danger',
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    toasts,
    confirmDialog,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    hideConfirm,
  };
};
