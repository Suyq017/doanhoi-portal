import { apiClient } from './apiClient';

export interface AwsS3Config {
    id: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3Bucket: string;
    s3Endpoint: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAwsS3ConfigRequest {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3Bucket: string;
    s3Endpoint: string;
}

export interface UpdateAwsS3ConfigRequest {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    s3Bucket?: string;
    s3Endpoint?: string;
    isActive?: boolean;
}

export const awsS3ConfigService = {
    /**
     * Get the active AWS S3 configuration
     */
    async getActiveConfig(): Promise<AwsS3Config | null> {
        try {
            const response = await apiClient.get<AwsS3Config>('/aws-s3-config/active');
            return response;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    /**
     * Get all AWS S3 configurations
     */
    async getAllConfigs(): Promise<AwsS3Config[]> {
        const response = await apiClient.get<AwsS3Config[]>('/aws-s3-config');
        return response;
    },

    /**
     * Create a new AWS S3 configuration
     */
    async createConfig(data: CreateAwsS3ConfigRequest): Promise<AwsS3Config> {
        const response = await apiClient.post<AwsS3Config>('/aws-s3-config', data);
        return response;
    },

    /**
     * Update an existing AWS S3 configuration
     */
    async updateConfig(id: string, data: UpdateAwsS3ConfigRequest): Promise<AwsS3Config> {
        const response = await apiClient.put<AwsS3Config>(`/aws-s3-config/${id}`, data);
        return response;
    },

    /**
     * Delete an AWS S3 configuration
     */
    async deleteConfig(id: string): Promise<void> {
        await apiClient.delete(`/aws-s3-config/${id}`);
    },

    /**
     * Test an AWS S3 configuration
     */
    async testConfig(id: string): Promise<boolean> {
        const response = await apiClient.post<{ success: boolean }>(`/aws-s3-config/${id}/test`);
        return response.success;
    },
};
