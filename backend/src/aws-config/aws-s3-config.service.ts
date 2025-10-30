import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { AwsS3Config } from '../entities/aws-s3-config.entity';

export interface CreateAwsS3ConfigDto {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3Bucket: string;
    s3Endpoint: string;
}

export interface UpdateAwsS3ConfigDto {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    s3Bucket?: string;
    s3Endpoint?: string;
    isActive?: boolean;
}

@Injectable()
export class AwsS3ConfigService {
    constructor(
        @InjectRepository(AwsS3Config)
        private readonly awsS3ConfigRepository: Repository<AwsS3Config>,
    ) { }

    /**
     * Get the active AWS S3 configuration
     * There should only be one active config at a time
     */
    async getActiveConfig(): Promise<AwsS3Config | null> {
        const config = await this.awsS3ConfigRepository.findOne({
            where: { isActive: true },
            order: { createdAt: 'DESC' },
        });
        return config;
    }

    /**
     * Get all configurations (for admin purposes)
     */
    async getAllConfigs(): Promise<AwsS3Config[]> {
        return this.awsS3ConfigRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Create a new AWS S3 configuration
     * Automatically deactivates other configs
     */
    async createConfig(dto: CreateAwsS3ConfigDto): Promise<AwsS3Config> {
        // Deactivate all existing configs
        await this.awsS3ConfigRepository.update(
            { isActive: true },
            { isActive: false },
        );

        const config = this.awsS3ConfigRepository.create({
            ...dto,
            isActive: true,
        });

        return this.awsS3ConfigRepository.save(config);
    }

    /**
     * Update an existing configuration
     */
    async updateConfig(
        id: string,
        dto: UpdateAwsS3ConfigDto,
    ): Promise<AwsS3Config> {
        const config = await this.awsS3ConfigRepository.findOne({
            where: { id },
        });

        if (!config) {
            throw new Error('AWS S3 configuration not found');
        }

        // If activating this config, deactivate others
        if (dto.isActive === true) {
            await this.awsS3ConfigRepository.update(
                { id: Not(id), isActive: true },
                { isActive: false },
            );
        }

        Object.assign(config, dto);
        return this.awsS3ConfigRepository.save(config);
    }

    /**
     * Delete a configuration
     */
    async deleteConfig(id: string): Promise<void> {
        const config = await this.awsS3ConfigRepository.findOne({
            where: { id },
        });

        if (!config) {
            throw new Error('AWS S3 configuration not found');
        }

        await this.awsS3ConfigRepository.remove(config);
    }

    /**
     * Test configuration by attempting to connect
     */
    async testConfig(id: string): Promise<boolean> {
        const config = await this.awsS3ConfigRepository.findOne({
            where: { id },
        });

        if (!config) {
            throw new Error('AWS S3 configuration not found');
        }

        // TODO: Implement actual S3 connection test
        // For now, just return true
        return true;
    }
}
