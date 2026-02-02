import React from 'react';
import { Toast } from '../../../../shared/components';
import { ToastContainerProps } from '../../types';

/**
 * Toast container for displaying notifications
 * Positioned fixed at top-right of screen
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onHide }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    type={toast.type as 'success' | 'error' | 'info' | 'warning'}
                    message={toast.message}
                    duration={toast.duration}
                    onClose={() => onHide(toast.id)}
                />
            ))}
        </div>
    );
};

export default ToastContainer;
