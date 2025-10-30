import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, In } from 'typeorm';
import { PaymentCampaign, PaymentCampaignStatus } from '../../entities/payment-campaign.entity';
import { PaymentAssignment, PaymentAssignmentStatus } from '../../entities/payment-assignment.entity';
import { PaymentHistory } from '../../entities/payment-history.entity';
import { PaymentCampaignPayosConfig } from '../../entities/payment-campaign-payos-config.entity';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { CreatePaymentCampaignDto } from '../dto/create-payment-campaign.dto';
import { UpdatePaymentCampaignDto } from '../dto/update-payment-campaign.dto';
import { RolesService } from '../../roles/roles.service';

@Injectable()
export class PaymentCampaignService {
  private readonly logger = new Logger(PaymentCampaignService.name);
  constructor(
    @InjectRepository(PaymentCampaign)
    private readonly campaignRepository: Repository<PaymentCampaign>,
    @InjectRepository(PaymentAssignment)
    private readonly assignmentRepository: Repository<PaymentAssignment>,
    @InjectRepository(PaymentHistory)
    private readonly paymentHistoryRepository: Repository<PaymentHistory>,
    @InjectRepository(PaymentCampaignPayosConfig)
    private readonly payosConfigRepository: Repository<PaymentCampaignPayosConfig>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly rolesService: RolesService,
  ) { }/**
   * Create new payment campaign
   */
  async create(createDto: CreatePaymentCampaignDto, createdById: string): Promise<PaymentCampaign> {
    // Validate organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: createDto.organizationId }
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${createDto.organizationId} not found`);
    }

    // Validate the user exists
    const user = await this.userRepository.findOne({
      where: { id: createdById }
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${createdById} not found`);
    }

    console.log(`Creating campaign for user: ${user.familyName} ${user.givenName} (${user.code})`);

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
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    accessibleOrgIds?: string[] | null; // Allow null for super admin case
  }): Promise<{ campaigns: PaymentCampaign[]; page: number; limit: number; total: number; totalPages: number }> {
    const { organizationId, status, search, startDate, endDate, page = 1, limit = 20, accessibleOrgIds } = options || {};

    const queryBuilder = this.campaignRepository.createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.organization', 'organization')
      .leftJoinAndSelect('campaign.createdByUser', 'createdByUser')
      .leftJoinAndSelect('campaign.feeLevels', 'feeLevels')
      .orderBy('campaign.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);    // Apply accessible organizations filter (only if there are specific organizations to filter by)
    // If accessibleOrgIds is empty array (super admin case), don't apply any filter
    // If accessibleOrgIds is null/undefined, also don't apply filter
    // Only apply filter when accessibleOrgIds is a non-empty array
    if (accessibleOrgIds && accessibleOrgIds.length > 0) {
      this.logger.log(`Filtering campaigns by accessible organizations: ${accessibleOrgIds.join(', ')}`);
      queryBuilder.andWhere('campaign.organizationId IN (:...accessibleOrgIds)', { accessibleOrgIds });
    } else {
      this.logger.log('No organization filter applied - showing all campaigns (super admin or no filter)');
    }

    // Apply basic where conditions
    if (organizationId) {
      queryBuilder.andWhere('campaign.organizationId = :organizationId', { organizationId });
    }

    if (status) {
      queryBuilder.andWhere('campaign.status = :status', { status });
    }

    // Apply search filter
    if (search) {
      queryBuilder.andWhere('campaign.name ILIKE :search', { search: `%${search}%` });
    }

    // Apply date filters
    if (startDate) {
      queryBuilder.andWhere('campaign.startDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('campaign.endDate <= :endDate', { endDate });
    }

    const [campaigns, total] = await queryBuilder.getManyAndCount(); const totalPages = Math.ceil(total / limit);

    return {
      campaigns,
      page,
      limit,
      total,
      totalPages
    };
  }
  /**
   * Get organizations that user has payment-campaigns permissions in
   */  async getAccessibleOrganizations(userId: string): Promise<string[]> {
    try {
      // Get all user roles (both global and organization-specific)
      const userRoles = await this.rolesService.getUserRoles(userId);
      this.logger.log(`User ${userId} has ${userRoles.length} total roles`);

      // Check if user has super admin role or system.access_admin permission globally
      const hasSuperAdminRole = userRoles.some(userRole =>
        userRole.organizationId === null && userRole.role.name === 'super_admin'
      );

      const hasSystemAdminPermission = userRoles.some(userRole =>
        userRole.organizationId === null &&
        userRole.role.permissions.some(permission =>
          permission.code === 'system.access_admin' && permission.isActive
        )
      );

      if (hasSuperAdminRole || hasSystemAdminPermission) {
        this.logger.log(`User ${userId} is super admin or has system admin permission - returning empty array for no filter`);
        return [];
      }

      // Get organization-specific roles with payment permissions
      const accessibleOrgIds = userRoles
        .filter(userRole => {
          // Only check organization-specific roles (not global ones)
          if (!userRole.organizationId) return false;

          const hasPaymentPermission = userRole.role.permissions.some(permission =>
            permission.code.startsWith('payment-campaigns.') && permission.isActive
          );
          if (hasPaymentPermission) {
            this.logger.log(`User ${userId} has payment permission in organization ${userRole.organizationId} via role ${userRole.role.name}`);
          }
          return hasPaymentPermission;
        })
        .map(userRole => userRole.organizationId)
        .filter(Boolean); // Remove null/undefined values

      // Remove duplicates
      const uniqueOrgIds = [...new Set(accessibleOrgIds)];
      this.logger.log(`User ${userId} final accessible organization IDs: ${uniqueOrgIds.join(', ')}`);
      return uniqueOrgIds;
    } catch (error) {
      this.logger.error(`Error getting accessible organizations for user ${userId}:`, error);
      return []; // Return empty array if error - will show no campaigns
    }
  }

  /**
   * Get organization objects that user has payment-campaigns permissions in
   */  async getAccessibleOrganizationsWithDetails(userId: string): Promise<Organization[]> {
    try {
      // Get all user roles (both global and organization-specific)
      const userRoles = await this.rolesService.getUserRoles(userId);
      this.logger.log(`User ${userId} has ${userRoles.length} total roles for organizations with details`);

      // Check if user has super admin role or system.access_admin permission globally
      const hasSuperAdminRole = userRoles.some(userRole =>
        userRole.organizationId === null && userRole.role.name === 'super_admin'
      );

      const hasSystemAdminPermission = userRoles.some(userRole =>
        userRole.organizationId === null &&
        userRole.role.permissions.some(permission =>
          permission.code === 'system.access_admin' && permission.isActive
        )
      );

      if (hasSuperAdminRole || hasSystemAdminPermission) {
        // Super admin can access all organizations
        const allOrgs = await this.organizationRepository.find({
          where: { isActive: true },
          order: { name: 'ASC' }
        });
        this.logger.log(`Super admin user ${userId} has access to ${allOrgs.length} organizations`);
        return allOrgs;
      }

      // Get organization-specific roles with payment permissions
      const accessibleOrgIds = userRoles
        .filter(userRole => {
          // Only check organization-specific roles (not global ones)
          if (!userRole.organizationId) return false;

          const hasPaymentPermission = userRole.role.permissions.some(permission =>
            permission.code.startsWith('payment-campaigns.') && permission.isActive
          );
          return hasPaymentPermission;
        })
        .map(userRole => userRole.organizationId)
        .filter(Boolean); // Remove null/undefined values

      // Remove duplicates
      const uniqueOrgIds = [...new Set(accessibleOrgIds)];

      if (uniqueOrgIds.length === 0) {
        this.logger.log(`User ${userId} has no accessible organizations for payment campaigns`);
        return [];
      }

      // Get organization objects
      const organizations = await this.organizationRepository.find({
        where: {
          id: In(uniqueOrgIds),
          isActive: true
        },
        order: { name: 'ASC' }
      });

      this.logger.log(`User ${userId} has access to ${organizations.length} organizations: ${organizations.map(o => o.name).join(', ')}`);
      return organizations;
    } catch (error) {
      this.logger.error(`Error getting accessible organizations with details for user ${userId}:`, error);
      return []; // Return empty array if error
    }
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

    // Check if status is being updated to CANCELLED or COMPLETED
    const isStatusChangedToFinished = updateDto.status &&
      (updateDto.status === PaymentCampaignStatus.CANCELLED || updateDto.status === PaymentCampaignStatus.COMPLETED) &&
      campaign.status !== updateDto.status;

    Object.assign(campaign, updateDto);
    const updatedCampaign = await this.campaignRepository.save(campaign);

    // If campaign status changed to CANCELLED or COMPLETED, update pending assignments to overdue
    if (isStatusChangedToFinished) {
      await this.updatePendingAssignmentsToOverdue(id);
    }

    return updatedCampaign;
  }

  /**
   * Update all pending assignments to overdue for a campaign
   */
  private async updatePendingAssignmentsToOverdue(campaignId: string): Promise<void> {
    this.logger.log(`Updating pending assignments to overdue for campaign ${campaignId}`);

    // Find all pending assignments for this campaign
    const pendingAssignments = await this.assignmentRepository.find({
      where: {
        campaignId: campaignId,
        status: PaymentAssignmentStatus.PENDING
      }
    });

    if (pendingAssignments.length > 0) {
      // Update all pending assignments to overdue
      await this.assignmentRepository.update(
        {
          campaignId: campaignId,
          status: PaymentAssignmentStatus.PENDING
        },
        { status: PaymentAssignmentStatus.OVERDUE }
      );

      this.logger.log(`Updated ${pendingAssignments.length} pending assignments to overdue for campaign ${campaignId}`);
    } else {
      this.logger.log(`No pending assignments found for campaign ${campaignId}`);
    }
  }

  /**
   * Delete campaign
   */
  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);

    if (campaign.status === PaymentCampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active campaign');
    }

    // Xóa cascade: payment history trước, assignment sau, campaign cuối cùng
    await this.removeWithCascade(id);
  }

  /**
   * Remove campaign with cascade delete of related data
   */
  private async removeWithCascade(campaignId: string): Promise<void> {
    this.logger.log(`Starting cascade delete for campaign ${campaignId}`);

    // Bước 1: Tìm tất cả assignments thuộc campaign này
    const assignments = await this.assignmentRepository.find({
      where: { campaignId: campaignId }
    });

    this.logger.log(`Found ${assignments.length} assignments to delete for campaign ${campaignId}`);

    // Bước 2: Xóa tất cả payment history liên quan đến các assignments
    for (const assignment of assignments) {
      const paymentHistories = await this.paymentHistoryRepository.find({
        where: { assignment_id: assignment.id }
      });

      if (paymentHistories.length > 0) {
        await this.paymentHistoryRepository.remove(paymentHistories);
        this.logger.log(`Deleted ${paymentHistories.length} payment history records for assignment ${assignment.id}`);
      }
    }

    // Bước 3: Xóa tất cả assignments
    if (assignments.length > 0) {
      await this.assignmentRepository.remove(assignments);
      this.logger.log(`Deleted ${assignments.length} assignments for campaign ${campaignId}`);
    }

    // Bước 4: Xóa PayOS config nếu có
    const payosConfigs = await this.payosConfigRepository.find({
      where: { campaignId: campaignId }
    });

    if (payosConfigs.length > 0) {
      await this.payosConfigRepository.remove(payosConfigs);
      this.logger.log(`Deleted ${payosConfigs.length} PayOS configs for campaign ${campaignId}`);
    }

    // Bước 5: Xóa campaign
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId }
    });

    if (campaign) {
      await this.campaignRepository.remove(campaign);
      this.logger.log(`Deleted campaign ${campaignId}`);
    }
  }

  /**
   * Check if campaign can be safely deleted
   */
  async canDelete(id: string): Promise<{ canDelete: boolean; reason?: string; relatedData?: any }> {
    const campaign = await this.findOne(id);

    // Không thể xóa campaign đang ACTIVE
    if (campaign.status === PaymentCampaignStatus.ACTIVE) {
      return {
        canDelete: false,
        reason: 'Cannot delete active campaign'
      };
    }

    // Đếm assignments và payment histories liên quan
    const assignments = await this.assignmentRepository.find({
      where: { campaignId: id }
    });

    let totalPaymentHistories = 0;
    let paidHistoryCount = 0;

    for (const assignment of assignments) {
      const paymentHistories = await this.paymentHistoryRepository.find({
        where: { assignment_id: assignment.id }
      });

      totalPaymentHistories += paymentHistories.length;
      paidHistoryCount += paymentHistories.filter(h => h.status === 'PAID').length;
    }

    // Có thể xóa campaign ở trạng thái CANCELLED hoặc COMPLETED
    return {
      canDelete: true,
      relatedData: {
        assignmentCount: assignments.length,
        totalPaymentHistories,
        paidHistoryCount,
        campaignStatus: campaign.status
      }
    };
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
    const updatedCampaign = await this.campaignRepository.save(campaign);

    // Update pending assignments to overdue
    await this.updatePendingAssignmentsToOverdue(id);

    return updatedCampaign;
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
    const updatedCampaign = await this.campaignRepository.save(campaign);

    // Update pending assignments to overdue
    await this.updatePendingAssignmentsToOverdue(id);

    return updatedCampaign;
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
        'SUM(CASE WHEN assignment.status = \'PAID\' THEN fee_level.amount END) as totalPaid',
        'SUM(fee_level.amount) as totalAmount'
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
