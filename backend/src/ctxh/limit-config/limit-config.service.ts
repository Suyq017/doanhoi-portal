import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CtxhLimitConfig, LimitConfigStatus } from '../../entities/ctxh-limit-config.entity';
import { Organization } from '../../entities/organization.entity';
import { CreateLimitConfigDto } from './dto/create-limit-config.dto';
import { UpdateLimitConfigDto } from './dto/update-limit-config.dto';
import { LimitConfigResponseDto } from './dto/limit-config-response.dto';
import { plainToClass } from 'class-transformer';

interface FindAllOptions {
  page: number;
  limit: number;
  organization_id?: string;
  status?: string;
  search?: string;
}

@Injectable()
export class LimitConfigService {
  constructor(
    @InjectRepository(CtxhLimitConfig)
    private limitConfigRepository: Repository<CtxhLimitConfig>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  /**
   * Get all descendant organizations (children, grandchildren, etc.) of a given organization
   */
  private async getDescendantOrganizations(organizationId: string): Promise<Organization[]> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      return [];
    }

    // Get all descendants using TypeORM tree repository methods
    const treeRepository = this.organizationRepository.manager.getTreeRepository(Organization);
    const descendants = await treeRepository.findDescendants(organization);
    
    // Remove the parent organization itself from the list
    return descendants.filter(descendant => descendant.id !== organizationId);
  }

  /**
   * Apply the same config to all descendant organizations
   */
  private async applyConfigToDescendants(
    parentOrganizationId: string, 
    configData: CreateLimitConfigDto, 
    createdBy: string
  ): Promise<void> {
    const descendants = await this.getDescendantOrganizations(parentOrganizationId);

    if (descendants.length === 0) {
      return;
    }

    const configsToCreate: Partial<CtxhLimitConfig>[] = [];

    for (const descendant of descendants) {
      // Check if descendant already has a config
      const existingConfig = await this.limitConfigRepository.findOne({
        where: {
          organization_id: descendant.id,
          deleted_at: IsNull(),
        },
      });

      // If no existing config, create one
      if (!existingConfig) {
        configsToCreate.push({
          organization_id: descendant.id,
          max_days: configData.max_days,
          description: `Kế thừa từ tổ chức cha`,
          status: configData.status || LimitConfigStatus.ACTIVE,
          created_by: createdBy,
        });
      } else if (existingConfig.status !== LimitConfigStatus.ACTIVE) {
        // If existing config is not active, update it
        await this.limitConfigRepository.update(existingConfig.id, {
          max_days: configData.max_days,
          description: `Kế thừa từ tổ chức cha`,
          status: configData.status || LimitConfigStatus.ACTIVE,
          updated_by: createdBy,
          updated_at: new Date(),
        });
      }
    }

    // Bulk create configs for organizations without existing configs
    if (configsToCreate.length > 0) {
      await this.limitConfigRepository.save(configsToCreate);
    }
  }

  /**
   * Update descendant organizations with new config values
   */
  private async updateDescendantsConfig(
    parentOrganizationId: string,
    updateData: UpdateLimitConfigDto,
    updatedBy: string
  ): Promise<void> {
    const descendants = await this.getDescendantOrganizations(parentOrganizationId);

    if (descendants.length === 0) {
      return;
    }

    for (const descendant of descendants) {
      // Find existing config for descendant
      const existingConfig = await this.limitConfigRepository.findOne({
        where: {
          organization_id: descendant.id,
          deleted_at: IsNull(),
        },
      });

      if (existingConfig) {
        // Update existing config with parent's values
        const updatePayload: any = {
          updated_by: updatedBy,
          updated_at: new Date(),
        };

        if (updateData.max_days !== undefined) {
          updatePayload.max_days = updateData.max_days;
        }

        if (updateData.status !== undefined) {
          updatePayload.status = updateData.status;
        }

        // Update description to indicate inheritance
        updatePayload.description = `Kế thừa từ tổ chức cha`;

        await this.limitConfigRepository.update(existingConfig.id, updatePayload);
      } else if (updateData.status === LimitConfigStatus.ACTIVE) {
        // Create new config for descendant if parent is being activated
        await this.limitConfigRepository.save({
          organization_id: descendant.id,
          max_days: updateData.max_days || 50.0, // Default value
          description: `Kế thừa từ tổ chức cha`,
          status: LimitConfigStatus.ACTIVE,
          created_by: updatedBy,
        });
      }
    }
  }

  /**
   * Remove descendant configs that were inherited from parent
   */
  private async removeDescendantsConfig(
    parentOrganizationId: string,
    deletedBy: string
  ): Promise<void> {
    const descendants = await this.getDescendantOrganizations(parentOrganizationId);

    if (descendants.length === 0) {
      return;
    }

    for (const descendant of descendants) {
      // Find inherited configs (configs with "Kế thừa từ tổ chức cha" description)
      const inheritedConfigs = await this.limitConfigRepository.find({
        where: {
          organization_id: descendant.id,
          description: 'Kế thừa từ tổ chức cha',
          deleted_at: IsNull(),
        },
      });

      // Soft delete all inherited configs
      for (const config of inheritedConfigs) {
        await this.limitConfigRepository.update(config.id, {
          deleted_by: deletedBy,
          deleted_at: new Date(),
        });
      }
    }
  }

  async create(createLimitConfigDto: CreateLimitConfigDto, createdBy: string): Promise<LimitConfigResponseDto> {
    // Validate organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: createLimitConfigDto.organization_id },
    });

    if (!organization) {
      throw new NotFoundException(`Tổ chức với ID ${createLimitConfigDto.organization_id} không tồn tại`);
    }

    // Check for existing config for that organization
    const existingConfig = await this.limitConfigRepository.findOne({
      where: {
        organization_id: createLimitConfigDto.organization_id,
        deleted_at: IsNull(),
      },
    });

    if (existingConfig) {
      throw new ConflictException(
        'Đã tồn tại cấu hình cho tổ chức này'
      );
    }

    // Create config for parent organization
    const limitConfig = this.limitConfigRepository.create({
      ...createLimitConfigDto,
      created_by: createdBy,
    });

    const savedConfig = await this.limitConfigRepository.save(limitConfig);

    // Apply same config to all descendant organizations
    if (createLimitConfigDto.status === LimitConfigStatus.ACTIVE) {
      await this.applyConfigToDescendants(createLimitConfigDto.organization_id, createLimitConfigDto, createdBy);
    }
    
    return this.findOne(savedConfig.id);
  }

  async findAll(options: FindAllOptions) {
    const { page, limit, organization_id, status, search } = options;
    console.log('Service findAll called with:', options);
    
    const skip = (page - 1) * limit;

    const queryBuilder = this.limitConfigRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.organization', 'organization')
      .leftJoinAndSelect('config.creator', 'creator')
      .where('config.deleted_at IS NULL')
      .orderBy('config.created_at', 'DESC');

    if (organization_id) {
      queryBuilder.andWhere('config.organization_id = :organization_id', { organization_id });
    }

    if (status) {
      queryBuilder.andWhere('config.status = :status', { status });
    }

    if (search) {
      console.log('Adding search filter:', search);
      // Use LIKE for better compatibility with different databases
      queryBuilder.andWhere('LOWER(organization.name) LIKE LOWER(:search)', { search: `%${search}%` });
    }

    // Debug: Log the final query
    console.log('Final query SQL:', queryBuilder.getSql());
    console.log('Query parameters:', queryBuilder.getParameters());

    const [configs, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = configs.map(config => plainToClass(LimitConfigResponseDto, config));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<LimitConfigResponseDto> {
    const config = await this.limitConfigRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.organization', 'organization')
      .leftJoinAndSelect('config.creator', 'creator')
      .where('config.id = :id', { id })
      .andWhere('config.deleted_at IS NULL')
      .getOne();

    if (!config) {
      throw new NotFoundException(`Cấu hình với ID ${id} không tồn tại`);
    }

    return plainToClass(LimitConfigResponseDto, config);
  }

  async update(
    id: string,
    updateLimitConfigDto: UpdateLimitConfigDto,
    updatedBy: string,
  ): Promise<LimitConfigResponseDto> {
    const config = await this.limitConfigRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!config) {
      throw new NotFoundException(`Cấu hình với ID ${id} không tồn tại`);
    }

    // If setting status to ACTIVE, check if there's already another active config for the same organization
    if (updateLimitConfigDto.status === LimitConfigStatus.ACTIVE) {
      const existingActiveConfig = await this.limitConfigRepository.findOne({
        where: {
          organization_id: config.organization_id, // Check within same organization
          status: LimitConfigStatus.ACTIVE,
          deleted_at: IsNull(),
        },
      });

      if (existingActiveConfig && existingActiveConfig.id !== id) {
        throw new ConflictException(
          'Đã tồn tại cấu hình hoạt động khác cho tổ chức này. Vui lòng vô hiệu hóa cấu hình đó trước.'
        );
      }
    }

    // Update the current config
    await this.limitConfigRepository.update(id, {
      ...updateLimitConfigDto,
      updated_by: updatedBy,
      updated_at: new Date(),
    });

    // If updating max_days or status to ACTIVE, apply to descendants
    if (updateLimitConfigDto.max_days !== undefined || updateLimitConfigDto.status === LimitConfigStatus.ACTIVE) {
      await this.updateDescendantsConfig(config.organization_id, updateLimitConfigDto, updatedBy);
    }

    return this.findOne(id);
  }

  async remove(id: string, deletedBy: string): Promise<void> {
    const config = await this.limitConfigRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!config) {
      throw new NotFoundException(`Cấu hình với ID ${id} không tồn tại`);
    }

    // Delete the current config
    await this.limitConfigRepository.update(id, {
      deleted_by: deletedBy,
      deleted_at: new Date(),
    });

    // Also remove descendant configs that were inherited
    await this.removeDescendantsConfig(config.organization_id, deletedBy);
  }

  async restore(id: string, updatedBy: string): Promise<LimitConfigResponseDto> {
    const config = await this.limitConfigRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!config) {
      throw new NotFoundException(`Cấu hình với ID ${id} không tồn tại`);
    }

    if (!config.deleted_at) {
      throw new ConflictException(`Cấu hình với ID ${id} chưa bị xóa`);
    }

    // Check if restoring would create conflict with active status for same organization
    if (config.status === LimitConfigStatus.ACTIVE) {
      const existingActiveConfig = await this.limitConfigRepository.findOne({
        where: {
          organization_id: config.organization_id, // Check within same organization
          status: LimitConfigStatus.ACTIVE,
          deleted_at: IsNull(),
        },
      });

      if (existingActiveConfig) {
        throw new ConflictException(
          'Không thể khôi phục vì đã tồn tại cấu hình hoạt động khác cho tổ chức này'
        );
      }
    }

    await this.limitConfigRepository.update(id, {
      deleted_by: null,
      deleted_at: null,
      updated_by: updatedBy,
      updated_at: new Date(),
    });

    return this.findOne(id);
  }
}