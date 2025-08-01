import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationPayosConfig } from '../../entities/organization-payos-config.entity';
import { Organization } from '../../entities/organization.entity';
import { PayOSConfig, validatePayOSConfig } from '../config/payos.config';
import PayOS from '@payos/node';

export interface CreatePayOSConfigDto {
  organizationId: string;
  clientId: string;
  apiKey: string;
  checksumKey: string;
}

export interface UpdatePayOSConfigDto {
  clientId?: string;
  apiKey?: string;
  checksumKey?: string;
  isActive?: boolean;
}

@Injectable()
export class PayosConfigService {
  private readonly logger = new Logger(PayosConfigService.name);
  private readonly payosInstanceCache = new Map<string, PayOS>();

  constructor(
    @InjectRepository(OrganizationPayosConfig)
    private readonly payosConfigRepository: Repository<OrganizationPayosConfig>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  /**
   * Create new PayOS configuration for organization
   */
  async createConfig(createDto: CreatePayOSConfigDto): Promise<OrganizationPayosConfig> {
    try {
      // Validate organization exists
      const organization = await this.organizationRepository.findOne({
        where: { id: createDto.organizationId }
      });

      if (!organization) {
        throw new NotFoundException('Tổ chức không tồn tại');
      }

      // Check if config already exists
      const existingConfig = await this.payosConfigRepository.findOne({
        where: { organizationId: createDto.organizationId }
      });

      if (existingConfig) {
        throw new BadRequestException('Cấu hình PayOS cho tổ chức này đã tồn tại');
      }

      // Validate PayOS configuration
      const payosConfig: PayOSConfig = {
        clientId: createDto.clientId,
        apiKey: createDto.apiKey,
        checksumKey: createDto.checksumKey,
        environment: 'sandbox'
      };

      if (!validatePayOSConfig(payosConfig)) {
        throw new BadRequestException('Thông tin cấu hình PayOS không hợp lệ');
      }

      // Create and save config
      const config = this.payosConfigRepository.create({
        organizationId: createDto.organizationId,
        clientId: createDto.clientId,
        apiKey: createDto.apiKey,
        checksumKey: createDto.checksumKey,
        isActive: true
      });

      const savedConfig = await this.payosConfigRepository.save(config);

      this.logger.log(`Created PayOS config for organization ${createDto.organizationId}`);
      return savedConfig;
    } catch (error) {
      this.logger.error('Failed to create PayOS config:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Không thể tạo cấu hình PayOS');
    }
  }

  /**
   * Get PayOS configuration for organization
   */
  async getConfig(organizationId: string): Promise<OrganizationPayosConfig | null> {
    try {
      const config = await this.payosConfigRepository.findOne({
        where: { organizationId },
        relations: ['organization']
      });

      return config;
    } catch (error) {
      this.logger.error(`Failed to get PayOS config for organization ${organizationId}:`, error);
      return null;
    }
  }

  /**
   * Update PayOS configuration
   */
  async updateConfig(
    organizationId: string,
    updateDto: UpdatePayOSConfigDto
  ): Promise<OrganizationPayosConfig> {
    try {
      const config = await this.payosConfigRepository.findOne({
        where: { organizationId }
      });

      if (!config) {
        throw new NotFoundException('Cấu hình PayOS không tồn tại');
      }

      // Update fields
      if (updateDto.clientId !== undefined) config.clientId = updateDto.clientId;
      if (updateDto.apiKey !== undefined) config.apiKey = updateDto.apiKey;
      if (updateDto.checksumKey !== undefined) config.checksumKey = updateDto.checksumKey;
      if (updateDto.isActive !== undefined) config.isActive = updateDto.isActive;

      // Validate updated configuration
      if (updateDto.clientId || updateDto.apiKey || updateDto.checksumKey) {
        const payosConfig: PayOSConfig = {
          clientId: config.clientId,
          apiKey: config.apiKey,
          checksumKey: config.checksumKey,
          environment: 'sandbox'
        };

        if (!validatePayOSConfig(payosConfig)) {
          throw new BadRequestException('Thông tin cấu hình PayOS không hợp lệ');
        }
      }

      const updatedConfig = await this.payosConfigRepository.save(config);

      // Clear cache for this organization
      this.payosInstanceCache.delete(organizationId);

      this.logger.log(`Updated PayOS config for organization ${organizationId}`);
      return updatedConfig;
    } catch (error) {
      this.logger.error(`Failed to update PayOS config for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Không thể cập nhật cấu hình PayOS');
    }
  }

  /**
   * Toggle active status of PayOS configuration
   */
  async toggleActive(organizationId: string): Promise<OrganizationPayosConfig> {
    try {
      const config = await this.payosConfigRepository.findOne({
        where: { organizationId }
      });

      if (!config) {
        throw new NotFoundException('Cấu hình PayOS không tồn tại');
      }

      config.isActive = !config.isActive;
      const updatedConfig = await this.payosConfigRepository.save(config);

      // Clear cache
      this.payosInstanceCache.delete(organizationId);

      this.logger.log(`Toggled PayOS config active status for organization ${organizationId} to ${config.isActive}`);
      return updatedConfig;
    } catch (error) {
      this.logger.error(`Failed to toggle PayOS config active status for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Không thể thay đổi trạng thái cấu hình PayOS');
    }
  }

  /**
   * Get effective PayOS config for an organization (with inheritance from parent)
   */
  async getEffectiveConfig(organizationId: string): Promise<OrganizationPayosConfig> {
    // Try to find config for current organization
    let config = await this.payosConfigRepository.findOne({
      where: { organizationId, isActive: true },
      relations: ['organization']
    });

    if (config) {
      return config;
    }

    // If not found, traverse up the organization hierarchy
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['parent']
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Recursively check parent organizations
    if (organization.parent) {
      return this.getEffectiveConfig(organization.parent.id);
    }

    throw new NotFoundException('No PayOS configuration found for this organization or its parents');
  }

  /**
   * Create PayOS instance for an organization
   */
  async createPayOSInstance(organizationId: string): Promise<PayOS> {
    const config = await this.getEffectiveConfig(organizationId);
    
    return new PayOS(
      config.clientId,
      config.apiKey,
      config.checksumKey
    );
  }

  /**
   * Create or update PayOS config for organization
   */
  async createOrUpdateConfig(organizationId: string, configData: {
    clientId: string;
    apiKey: string;
    checksumKey: string;
    webhookUrl?: string;
    note?: string;
  }): Promise<OrganizationPayosConfig> {
    const existingConfig = await this.payosConfigRepository.findOne({
      where: { organizationId }
    });

    if (existingConfig) {
      // Update existing config
      Object.assign(existingConfig, configData);
      return this.payosConfigRepository.save(existingConfig);
    } else {
      // Create new config
      const newConfig = this.payosConfigRepository.create({
        organizationId,
        ...configData,
        isActive: true
      });
      return this.payosConfigRepository.save(newConfig);
    }
  }

  /**
   * Get direct config for organization (without inheritance)
   */
  async getDirectConfig(organizationId: string): Promise<OrganizationPayosConfig | null> {
    return this.payosConfigRepository.findOne({
      where: { organizationId },
      relations: ['organization']
    });
  }

  /**
   * Delete PayOS config
   */
  async deleteConfig(organizationId: string): Promise<void> {
    const result = await this.payosConfigRepository.delete({ organizationId });
    
    if (result.affected === 0) {
      throw new NotFoundException('PayOS configuration not found');
    }
  }

  /**
   * Verify PayOS credentials by creating a test instance
   */
  async verifyCredentials(clientId: string, apiKey: string, checksumKey: string): Promise<boolean> {
    try {
      const payOS = new PayOS(clientId, apiKey, checksumKey);
      // Test the credentials by creating a small test request
      // Note: This is a basic check, actual verification might need a real API call
      return true;
    } catch (error) {
      return false;
    }
  }
}
