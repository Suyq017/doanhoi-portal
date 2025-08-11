import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentCampaignPayosConfig } from '../../entities/payment-campaign-payos-config.entity';
import { PaymentCampaign } from '../../entities/payment-campaign.entity';
import { Organization } from '../../entities/organization.entity';
import { User } from '../../entities/user.entity';
import { PayOSConfig, validatePayOSConfig } from '../config/payos.config';
import PayOS from '@payos/node';

export interface CreatePayOSConfigDto {
  campaignId: string;
  organizationId: string;
  userId: string;
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
export class PaymentCampaignPayosConfigService {
  private readonly logger = new Logger(PaymentCampaignPayosConfigService.name);
  private readonly payosInstanceCache = new Map<string, PayOS>();

  constructor(
    @InjectRepository(PaymentCampaignPayosConfig)
    private readonly payosConfigRepository: Repository<PaymentCampaignPayosConfig>,
    @InjectRepository(PaymentCampaign)
    private readonly paymentCampaignRepository: Repository<PaymentCampaign>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create new PayOS configuration for payment campaign
   */
  async createConfig(createDto: CreatePayOSConfigDto): Promise<PaymentCampaignPayosConfig> {
    try {
      // Validate campaign exists
      const campaign = await this.paymentCampaignRepository.findOne({
        where: { id: createDto.campaignId },
        relations: ['organization']
      });

      if (!campaign) {
        throw new NotFoundException('Đợt thanh toán không tồn tại');
      }

      // Validate organization exists
      const organization = await this.organizationRepository.findOne({
        where: { id: createDto.organizationId }
      });

      if (!organization) {
        throw new NotFoundException('Tổ chức không tồn tại');
      }

      // Validate user exists
      const user = await this.userRepository.findOne({
        where: { id: createDto.userId }
      });

      if (!user) {
        throw new NotFoundException('Người dùng không tồn tại');
      }

      // Check if config already exists for this campaign
      const existingConfig = await this.payosConfigRepository.findOne({
        where: { campaignId: createDto.campaignId }
      });

      if (existingConfig) {
        throw new BadRequestException('Cấu hình PayOS cho đợt thanh toán này đã tồn tại');
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
        campaignId: createDto.campaignId,
        organizationId: createDto.organizationId,
        userId: createDto.userId,
        clientId: createDto.clientId,
        apiKey: createDto.apiKey,
        checksumKey: createDto.checksumKey,
        isActive: true
      });

      const savedConfig = await this.payosConfigRepository.save(config);

      this.logger.log(`Created PayOS config for campaign ${createDto.campaignId}`);
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
   * Get PayOS configuration for campaign
   */
  async getConfig(campaignId: string): Promise<PaymentCampaignPayosConfig | null> {
    try {
      const config = await this.payosConfigRepository.findOne({
        where: { campaignId },
        relations: ['campaign', 'organization', 'user']
      });

      return config;
    } catch (error) {
      this.logger.error(`Failed to get PayOS config for campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Get effective PayOS config for a campaign (with inheritance from parent organizations)
   */
  async getEffectiveConfig(campaignId: string): Promise<PaymentCampaignPayosConfig> {
    // First, try to find config for current campaign
    let config = await this.payosConfigRepository.findOne({
      where: { campaignId, isActive: true },
      relations: ['campaign', 'organization', 'user']
    });

    if (config) {
      return config;
    }

    // If not found, get campaign to check its organization level
    const campaign = await this.paymentCampaignRepository.findOne({
      where: { id: campaignId },
      relations: ['organization', 'organization.parent', 'organization.parent.parent']
    });

    if (!campaign) {
      throw new NotFoundException('Đợt thanh toán không tồn tại');
    }

    const organization = campaign.organization;

    // Determine organization level and apply fallback logic
    if (organization.parent?.parent) {
      // This is level 3 organization
      // Fallback: Campaign (level 3) → Org level 2 → Org level 1
      
      // Try level 2 organization
      const level2Config = await this.findOrgConfig(organization.parent.id);
      if (level2Config) {
        return level2Config;
      }
      
      // Try level 1 organization
      const level1Config = await this.findOrgConfig(organization.parent.parent.id);
      if (level1Config) {
        return level1Config;
      }
      
    } else if (organization.parent) {
      // This is level 2 organization
      // Fallback: Campaign (level 2) → Org level 1
      
      const level1Config = await this.findOrgConfig(organization.parent.id);
      if (level1Config) {
        return level1Config;
      }
      
    } else {
      // This is level 1 organization (root)
      // For level 1 organizations, no fallback is available

      // Must have direct campaign config or error
      // Look for any PayOS config within this organization
      // this.logger.log('Organization is level 1 (root), checking for any config in this organization');
      // const orgConfig = await this.findOrgConfig(organization.id);
      // if (orgConfig) {
      //   this.logger.log(`Found config within level 1 organization: ${organization.id}`);
      //   return orgConfig;
      // }
      
      // At this time, we assume that level 1 organizations must have a direct PayOS config
      // If no config found, throw error
      this.logger.log('Organization is level 1 (root), no fallback available - campaign must have direct PayOS config');
    }

    throw new NotFoundException('Không tìm thấy cấu hình PayOS cho đợt thanh toán này hoặc các tổ chức cha');
  }

  /**
   * Find organization config by looking for any active campaign config in that organization
   */
  private async findOrgConfig(organizationId: string): Promise<PaymentCampaignPayosConfig | null> {
    const config = await this.payosConfigRepository.findOne({
      where: { 
        organizationId, 
        isActive: true 
      },
      relations: ['campaign', 'organization', 'user'],
      order: { createdAt: 'DESC' } // Get the most recent config
    });

    return config;
  }

  /**
   * Update PayOS configuration
   */
  async updateConfig(
    campaignId: string,
    updateDto: UpdatePayOSConfigDto
  ): Promise<PaymentCampaignPayosConfig> {
    try {
      const config = await this.payosConfigRepository.findOne({
        where: { campaignId }
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

      // Clear cache for this campaign
      this.payosInstanceCache.delete(campaignId);

      this.logger.log(`Updated PayOS config for campaign ${campaignId}`);
      return updatedConfig;
    } catch (error) {
      this.logger.error(`Failed to update PayOS config for campaign ${campaignId}:`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Không thể cập nhật cấu hình PayOS');
    }
  }

  /**
   * Toggle active status of PayOS configuration
   */
  async toggleActive(campaignId: string): Promise<PaymentCampaignPayosConfig> {
    try {
      const config = await this.payosConfigRepository.findOne({
        where: { campaignId }
      });

      if (!config) {
        throw new NotFoundException('Cấu hình PayOS không tồn tại');
      }

      config.isActive = !config.isActive;
      const updatedConfig = await this.payosConfigRepository.save(config);

      // Clear cache
      this.payosInstanceCache.delete(campaignId);

      this.logger.log(`Toggled PayOS config active status for campaign ${campaignId} to ${config.isActive}`);
      return updatedConfig;
    } catch (error) {
      this.logger.error(`Failed to toggle PayOS config active status for campaign ${campaignId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Không thể thay đổi trạng thái cấu hình PayOS');
    }
  }

  /**
   * Create PayOS instance for a campaign
   */
  async createPayOSInstance(campaignId: string): Promise<PayOS> {
    const config = await this.getEffectiveConfig(campaignId);
    
    return new PayOS(
      config.clientId,
      config.apiKey,
      config.checksumKey
    );
  }

  /**
   * Create or update PayOS config for campaign
   */
  async createOrUpdateConfig(campaignId: string, configData: {
    organizationId: string;
    userId: string;
    clientId: string;
    apiKey: string;
    checksumKey: string;
  }): Promise<PaymentCampaignPayosConfig> {
    const existingConfig = await this.payosConfigRepository.findOne({
      where: { campaignId }
    });

    if (existingConfig) {
      // Update existing config
      Object.assign(existingConfig, {
        clientId: configData.clientId,
        apiKey: configData.apiKey,
        checksumKey: configData.checksumKey
      });
      return this.payosConfigRepository.save(existingConfig);
    } else {
      // Create new config
      const newConfig = this.payosConfigRepository.create({
        campaignId,
        organizationId: configData.organizationId,
        userId: configData.userId,
        clientId: configData.clientId,
        apiKey: configData.apiKey,
        checksumKey: configData.checksumKey,
        isActive: true
      });
      return this.payosConfigRepository.save(newConfig);
    }
  }

  /**
   * Delete PayOS config
   */
  async deleteConfig(campaignId: string): Promise<void> {
    const result = await this.payosConfigRepository.delete({ campaignId });
    
    if (result.affected === 0) {
      throw new NotFoundException('Cấu hình PayOS không tồn tại');
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
