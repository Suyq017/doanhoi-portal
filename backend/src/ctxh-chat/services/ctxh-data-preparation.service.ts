import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { CtxhActivity, ActivityStatus } from '@/entities/ctxh-activity.entity';

/**
 * Configuration interface for data preparation
 */
export interface DataPreparationConfig {
  includeInactiveActivities: boolean;
  maxDescriptionLength: number;
  dateFormat: string;
  fallbackTexts: {
    noDescription: string;
    noCategory: string;
    noOrganization: string;
    noLocation: string;
  };
}

/**
 * Prepared activity data structure
 */
export interface PreparedActivityData {
  activityId: string;
  formattedText: string;
  metadata: ActivityMetadata;
}

export interface ActivityMetadata {
  activityId: string;
  activityName: string;
  categoryName: string;
  organizationName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  location: string;
  status: ActivityStatus;
  createdAt: Date;
}

@Injectable()
export class CtxhDataPreparationService {
  private readonly logger = new Logger(CtxhDataPreparationService.name);

  private readonly config: DataPreparationConfig = {
    includeInactiveActivities: false,
    maxDescriptionLength: 2000,
    dateFormat: 'DD/MM/YYYY',
    fallbackTexts: {
      noDescription: 'Không có mô tả',
      noCategory: 'Chưa phân loại',
      noOrganization: 'Không xác định',
      noLocation: 'Chưa xác định',
    },
  };

  constructor(
    @InjectRepository(CtxhActivity)
    private readonly activityRepository: Repository<CtxhActivity>,
  ) {}

  /**
   * Get all activities ready for processing
   * Queries with optimized joins and filters
   */
  async getAllActivities(): Promise<CtxhActivity[]> {
    this.logger.log('Fetching all activities for processing...');

    const statuses = this.config.includeInactiveActivities
      ? [ActivityStatus.ACTIVE, ActivityStatus.COMPLETED, ActivityStatus.DRAFT]
      : [ActivityStatus.ACTIVE, ActivityStatus.COMPLETED];

    const activities = await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.category', 'category')
      .leftJoinAndSelect('activity.organization', 'organization')
      .where('activity.status IN (:...statuses)', { statuses })
      .andWhere('activity.deleted_at IS NULL')
      .orderBy('activity.created_at', 'DESC')
      .getMany();

    this.logger.log(`Fetched ${activities.length} activities for processing`);
    return activities;
  }

  /**
   * Get activities updated since a specific date (for incremental updates)
   */
  async getUpdatedActivities(since: Date): Promise<CtxhActivity[]> {
    this.logger.log(`Fetching activities updated since ${since.toISOString()}...`);

    const activities = await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.category', 'category')
      .leftJoinAndSelect('activity.organization', 'organization')
      .where('activity.updated_at >= :since', { since })
      .andWhere('activity.deleted_at IS NULL')
      .orderBy('activity.updated_at', 'ASC')
      .getMany();

    this.logger.log(`Fetched ${activities.length} updated activities`);
    return activities;
  }

  /**
   * Get a single activity by ID
   */
  async getActivityById(activityId: string): Promise<CtxhActivity> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['category', 'organization'],
    });

    if (!activity) {
      throw new Error(`Activity not found: ${activityId}`);
    }

    return activity;
  }

  /**
   * Prepare and format a single activity for embedding
   */
  async prepareActivityData(activityId: string): Promise<PreparedActivityData> {
    this.logger.log(`Preparing data for activity: ${activityId}`);

    const activity = await this.getActivityById(activityId);
    return this.formatActivity(activity);
  }

  /**
   * Prepare multiple activities for embedding
   */
  async prepareMultipleActivities(activities: CtxhActivity[]): Promise<PreparedActivityData[]> {
    this.logger.log(`Preparing ${activities.length} activities...`);

    return activities.map((activity) => this.formatActivity(activity));
  }

  /**
   * Format activity into structured text suitable for RAG
   * Includes validation and sanitization
   */
  private formatActivity(activity: CtxhActivity): PreparedActivityData {
    // Validate required fields
    if (!activity.name || !activity.id) {
      throw new Error('Activity missing required fields: name or id');
    }

    // Sanitize and truncate description
    const sanitizedDescription = this.sanitizeText(
      activity.description || this.config.fallbackTexts.noDescription,
      this.config.maxDescriptionLength
    );

    // Format dates
    const startDate = this.formatDate(activity.start_date);
    const endDate = this.formatDate(activity.end_date);

    // Build structured text template
    const formattedText = 
      `Tên hoạt động: ${activity.name}

      Mô tả: ${sanitizedDescription}

      Thông tin tổ chức:
      - Danh mục: ${activity.category?.name || this.config.fallbackTexts.noCategory}
      - Tổ chức thực hiện: ${activity.organization?.name || this.config.fallbackTexts.noOrganization}

      Thời gian thực hiện:
      - Ngày bắt đầu: ${startDate}
      - Ngày kết thúc: ${endDate}
      - Tổng số ngày CTXH: ${activity.total_days || 0} ngày

      Địa điểm: ${activity.location || this.config.fallbackTexts.noLocation}

      Trạng thái: ${activity.status}`;

    // Build metadata object
    const metadata: ActivityMetadata = {
      activityId: activity.id,
      activityName: activity.name,
      categoryName: activity.category?.name || this.config.fallbackTexts.noCategory,
      organizationName: activity.organization?.name || this.config.fallbackTexts.noOrganization,
      startDate: startDate,
      endDate: endDate,
      totalDays: activity.total_days || 0,
      location: activity.location || this.config.fallbackTexts.noLocation,
      status: activity.status,
      createdAt: activity.created_at,
    };

    return {
      activityId: activity.id,
      formattedText: formattedText,
      metadata: metadata,
    };
  }

  /**
   * Sanitize text by removing HTML tags, normalizing whitespace
   */
  private sanitizeText(text: string, maxLength?: number): string {
    if (!text) return '';

    // Remove HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');

    // Normalize whitespace and line breaks
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Truncate if needed
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }

    return sanitized;
  }

  /**
   * Format date to Vietnamese format (DD/MM/YYYY)
   */
  private formatDate(date: Date | null | undefined): string {
    if (!date) return 'Chưa xác định';

    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Ngày không hợp lệ';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  }

  /**
   * Get configuration
   */
  getConfig(): DataPreparationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DataPreparationConfig>): void {
    Object.assign(this.config, updates);
    this.logger.log('Data preparation config updated');
  }
}