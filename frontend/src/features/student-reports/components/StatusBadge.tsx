import React from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { ParticipationStatus } from '../types';
import type { StatusBadgeProps } from '../types/components.types';

/**
 * Status configuration mapping
 */
const statusConfigs = {
    [ParticipationStatus.COMPLETED]: {
        text: 'Hoàn thành',
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
    },
    [ParticipationStatus.REGISTERED]: {
        text: 'Đã đăng ký',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Clock,
    },
    [ParticipationStatus.CANCELLED]: {
        text: 'Đã hủy',
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: XCircle,
    },
};

/**
 * StatusBadge Component
 * Displays a status badge with icon and appropriate styling
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    variant = 'default',
    className = '',
}) => {
    const config = statusConfigs[status as ParticipationStatus] || statusConfigs[ParticipationStatus.REGISTERED];
    const IconComponent = config.icon;

    if (variant === 'compact') {
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}>
                {config.text}
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${config.className} ${className}`}>
            <IconComponent className="h-3 w-3" />
            <span>{config.text}</span>
        </span>
    );
};

export default StatusBadge;
