// Payment related types

export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
    statusCode?: number;
}

export interface PaymentFeeLevel {
    id: string;
    campaignId: string;
    levelName: string;
    amount: number;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePaymentFeeLevelDto {
    levelName: string;
    amount: number;
    description?: string;
}

export interface UpdatePaymentFeeLevelDto {
    levelName?: string;
    amount?: number;
    description?: string;
}

export interface PaymentCampaign {
    id: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePaymentCampaignDto {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    organizationId: string;
    isActive?: boolean;
}

export interface UpdatePaymentCampaignDto {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
}

export interface PaymentAssignment {
    id: string;
    userId: string;
    campaignId: string;
    feeLevelId: string;
    amount: number;
    dueDate?: string;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

export interface CreatePaymentAssignmentDto {
    userId: string;
    campaignId: string;
    feeLevelId: string;
    dueDate?: string;
}

export interface UpdatePaymentAssignmentDto {
    feeLevelId?: string;
    dueDate?: string;
    status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

export interface CreateBulkPaymentAssignmentDto {
    campaignId: string;
    feeLevelId: string;
    userIds: string[];
    dueDate?: string;
}

export interface CreateMultiplePaymentAssignmentDto {
    campaignId: string;
    assignments: {
        userId: string;
        feeLevelId: string;
        dueDate?: string;
    }[];
}
