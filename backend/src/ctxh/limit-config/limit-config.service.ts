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
}

@Injectable()
export class LimitConfigService {
  constructor(
    @InjectRepository(CtxhLimitConfig)
    private limitConfigRepository: Repository<CtxhLimitConfig>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

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

    const limitConfig = this.limitConfigRepository.create({
      ...createLimitConfigDto,
      created_by: createdBy,
    });

    const savedConfig = await this.limitConfigRepository.save(limitConfig);
    
    return this.findOne(savedConfig.id);
  }

  async findAll(options: FindAllOptions) {
    const { page, limit, organization_id, status } = options;
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

    await this.limitConfigRepository.update(id, {
      ...updateLimitConfigDto,
      updated_by: updatedBy,
      updated_at: new Date(),
    });

    return this.findOne(id);
  }

  async remove(id: string, deletedBy: string): Promise<void> {
    const config = await this.limitConfigRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!config) {
      throw new NotFoundException(`Cấu hình với ID ${id} không tồn tại`);
    }

    await this.limitConfigRepository.update(id, {
      deleted_by: deletedBy,
      deleted_at: new Date(),
    });
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