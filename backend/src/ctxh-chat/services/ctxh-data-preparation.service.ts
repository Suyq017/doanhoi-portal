import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CtxhActivity, ActivityStatus } from '@/entities/ctxh-activity.entity';

@Injectable()
export class CtxhDataPreparationService {
  private readonly logger = new Logger(CtxhDataPreparationService.name);

  constructor(
    @InjectRepository(CtxhActivity)
    private readonly activityRepository: Repository<CtxhActivity>,
  ) {}

  async prepareActivityData(activityId: string): Promise<string> {
    // TODO: Implement in Phase 1
    this.logger.log(`Preparing data for activity: ${activityId}`);
    
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['category', 'organization']
    });

    if (!activity) {
      throw new Error(`Activity not found: ${activityId}`);
    }

    // Format activity data into structured text
    const formattedText = `Tên hoạt động: ${activity.name}
Mô tả: ${activity.description || 'Không có mô tả'}
Danh mục: ${activity.category?.name || 'Chưa phân loại'}
Tổ chức: ${activity.organization?.name || 'Không xác định'}
Thời gian: Từ ${activity.start_date} đến ${activity.end_date}
Ngày CTXH được cấp: ${activity.total_days || 0} ngày
Địa điểm: ${activity.location || 'Chưa xác định'}`;

    return formattedText;
  }

  async getAllActiveActivities(): Promise<CtxhActivity[]> {
    // TODO: Implement in Phase 1
    return this.activityRepository.find({
      where: { status: ActivityStatus.ACTIVE }, // Adjust based on your status enum
      relations: ['category', 'organization']
    });
  }
}