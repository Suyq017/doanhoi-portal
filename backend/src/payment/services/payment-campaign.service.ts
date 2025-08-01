import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { PaymentCampaign, PaymentCampaignStatus } from '../../entities/payment-campaign.entity';
import { CreatePaymentCampaignDto } from '../dto/create-payment-campaign.dto';
import { UpdatePaymentCampaignDto } from '../dto/update-payment-campaign.dto';

@Injectable()
export class PaymentCampaignService {
  constructor(
    @InjectRepository(PaymentCampaign)
    private readonly campaignRepository: Repository<PaymentCampaign>,
  ) {}

  /**
   * Create new payment campaign
   */
  async create(createDto: CreatePaymentCampaignDto, createdById: string): Promise<PaymentCampaign> {
    const campaign = this.campaignRepository.create({
      ...createDto,
      createdById,
      status: PaymentCampaignStatus.DRAFT
    });

    return this.campaignRepository.save(campaign);
  }

  /**
   * Get all campaigns with optional filters
   */
  async findAll(options?: {
    organizationId?: string;
    status?: PaymentCampaignStatus;
    page?: number;
    limit?: number;
  }): Promise<{ campaigns: PaymentCampaign[]; total: number }> {
    const { organizationId, status, page = 1, limit = 20 } = options || {};

    const queryOptions: FindManyOptions<PaymentCampaign> = {
      relations: ['organization', 'createdByUser', 'feeLevels'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit
    };

    if (organizationId || status) {
      queryOptions.where = {};
      if (organizationId) queryOptions.where.organizationId = organizationId;
      if (status) queryOptions.where.status = status;
    }

    const [campaigns, total] = await this.campaignRepository.findAndCount(queryOptions);

    return { campaigns, total };
  }

  /**
   * Get campaign by ID
   */
  async findOne(id: string): Promise<PaymentCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['organization', 'createdByUser', 'feeLevels', 'assignments', 'assignments.user', 'assignments.feeLevel']
    });

    if (!campaign) {
      throw new NotFoundException('Payment campaign not found');
    }

    return campaign;
  }

  /**
   * Update campaign
   */
  async update(id: string, updateDto: UpdatePaymentCampaignDto): Promise<PaymentCampaign> {
    const campaign = await this.findOne(id);

    // Prevent updating active campaigns for certain fields
    if (campaign.status === PaymentCampaignStatus.ACTIVE) {
      const restrictedFields = ['organizationId', 'startDate'];
      const hasRestrictedChanges = restrictedFields.some(field => updateDto[field] !== undefined);
      
      if (hasRestrictedChanges) {
        throw new BadRequestException('Cannot modify organization or start date of active campaign');
      }
    }

    Object.assign(campaign, updateDto);
    return this.campaignRepository.save(campaign);
  }

  /**
   * Delete campaign
   */
  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);

    if (campaign.status === PaymentCampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active campaign');
    }

    await this.campaignRepository.remove(campaign);
  }

  /**
   * Activate campaign
   */
  async activate(id: string): Promise<PaymentCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== PaymentCampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be activated');
    }

    // Validate campaign has at least one fee level
    if (!campaign.feeLevels || campaign.feeLevels.length === 0) {
      throw new BadRequestException('Campaign must have at least one fee level');
    }

    campaign.status = PaymentCampaignStatus.ACTIVE;
    return this.campaignRepository.save(campaign);
  }

  /**
   * Complete campaign
   */
  async complete(id: string): Promise<PaymentCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== PaymentCampaignStatus.ACTIVE) {
      throw new BadRequestException('Only active campaigns can be completed');
    }

    campaign.status = PaymentCampaignStatus.COMPLETED;
    return this.campaignRepository.save(campaign);
  }

  /**
   * Cancel campaign
   */
  async cancel(id: string): Promise<PaymentCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status === PaymentCampaignStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed campaign');
    }

    campaign.status = PaymentCampaignStatus.CANCELLED;
    return this.campaignRepository.save(campaign);
  }

  /**
   * Get campaigns by organization ID
   */
  async findByOrganization(organizationId: string): Promise<PaymentCampaign[]> {
    return this.campaignRepository.find({
      where: { organizationId },
      relations: ['organization', 'createdByUser', 'feeLevels'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get campaign statistics
   */
  async getStatistics(id: string) {
    const campaign = await this.findOne(id);
    
    const stats = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin('campaign.assignments', 'assignment')
      .select([
        'COUNT(assignment.id) as totalAssignments',
        'COUNT(CASE WHEN assignment.status = \'PAID\' THEN 1 END) as paidCount',
        'COUNT(CASE WHEN assignment.status = \'PENDING\' THEN 1 END) as pendingCount',
        'COUNT(CASE WHEN assignment.status = \'OVERDUE\' THEN 1 END) as overdueCount',
        'SUM(CASE WHEN assignment.status = \'PAID\' THEN COALESCE(assignment.customAmount, fee_level.amount) END) as totalPaid',
        'SUM(COALESCE(assignment.customAmount, fee_level.amount)) as totalAmount'
      ])
      .leftJoin('assignment.feeLevel', 'fee_level')
      .where('campaign.id = :id', { id })
      .getRawOne();

    return {
      totalAssignments: parseInt(stats.totalAssignments) || 0,
      paidCount: parseInt(stats.paidCount) || 0,
      pendingCount: parseInt(stats.pendingCount) || 0,
      overdueCount: parseInt(stats.overdueCount) || 0,
      totalPaid: parseFloat(stats.totalPaid) || 0,
      totalAmount: parseFloat(stats.totalAmount) || 0,
      completionRate: stats.totalAssignments > 0 ? (stats.paidCount / stats.totalAssignments) * 100 : 0
    };
  }
}
