import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { PaymentAssignment, PaymentAssignmentStatus } from '../../entities/payment-assignment.entity';
import { PaymentCampaign } from '../../entities/payment-campaign.entity';
import { PaymentFeeLevel } from '../../entities/payment-fee-level.entity';
import { User } from '../../entities/user.entity';
import { PaymentHistory, PaymentHistoryStatus, PaymentMethod } from '../../entities/payment-history.entity';
import { CreatePaymentAssignmentDto } from '../dto/create-payment-assignment.dto';
import { UpdatePaymentAssignmentDto } from '../dto/update-payment-assignment.dto';

@Injectable()
export class PaymentAssignmentService {
  private readonly logger = new Logger(PaymentAssignmentService.name);

  constructor(
    @InjectRepository(PaymentAssignment)
    private readonly assignmentRepository: Repository<PaymentAssignment>,
    @InjectRepository(PaymentCampaign)
    private readonly campaignRepository: Repository<PaymentCampaign>,
    @InjectRepository(PaymentFeeLevel)
    private readonly feeLevelRepository: Repository<PaymentFeeLevel>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PaymentHistory)
    private readonly paymentHistoryRepository: Repository<PaymentHistory>,
  ) {}

  /**
   * Create payment assignment
   */
  async create(createDto: CreatePaymentAssignmentDto, userId: string): Promise<PaymentAssignment> {
    // Verify campaign exists
    const campaign = await this.campaignRepository.findOne({
      where: { id: createDto.campaignId },
      relations: ['organization']
    });

    if (!campaign) {
      throw new NotFoundException('Payment campaign not found');
    }

    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: createDto.userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify fee level exists
    const feeLevel = await this.feeLevelRepository.findOne({
      where: { id: createDto.feeLevelId }
    });

    if (!feeLevel) {
      throw new NotFoundException('Fee level not found');
    }

    // Check if assignment already exists for this user and campaign
    const existingAssignment = await this.assignmentRepository.findOne({
      where: {
        campaignId: createDto.campaignId,
        userId: createDto.userId
      }
    });

    if (existingAssignment) {
      throw new BadRequestException(`Payment assignment already exists for user ${createDto.userId} in campaign ${createDto.campaignId}`);
    }

    // Create assignment
    const assignment = this.assignmentRepository.create({
      campaignId: createDto.campaignId,
      userId: createDto.userId,
      feeLevelId: createDto.feeLevelId,
      dueDate: createDto.dueDate,
      note: createDto.notes,
      status: PaymentAssignmentStatus.PENDING,
      assignedById: userId,
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    this.logger.log(`Created payment assignment ${savedAssignment.id} for user ${createDto.userId}`);

    return savedAssignment;
  }

  /**
   * Create bulk assignments
   */
  async createBulk(assignments: CreatePaymentAssignmentDto[], userId: string): Promise<PaymentAssignment[]> {
    const created: PaymentAssignment[] = [];
    const errors: any[] = [];

    this.logger.log(`Processing ${assignments.length} assignment requests`);

    for (const assignmentDto of assignments) {
      try {
        this.logger.log(`Creating assignment for user ${assignmentDto.userId} in campaign ${assignmentDto.campaignId}`);
        const assignment = await this.create(assignmentDto, userId);
        created.push(assignment);
        this.logger.log(`Successfully created assignment ${assignment.id}`);
      } catch (error) {
        this.logger.error(`Failed to create assignment for user ${assignmentDto.userId}:`, error.message);
        errors.push({
          assignment: assignmentDto,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`Bulk assignment creation had ${errors.length} errors:`, errors);
    }

    this.logger.log(`Bulk creation complete: ${created.length} created, ${errors.length} errors`);
    return created;
  }

  /**
   * Find all assignments with filters
   */
  async findAll(
    campaignId?: string,
    userId?: string,
    status?: PaymentAssignmentStatus,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const whereConditions: any = {};
      
      if (campaignId) {
        whereConditions.campaignId = campaignId;
      }
      
      if (userId) {
        whereConditions.userId = userId;
      }
      
      if (status) {
        whereConditions.status = status;
      }

      const offset = (page - 1) * limit;
      
      const [assignments, total] = await this.assignmentRepository.findAndCount({
        where: whereConditions,
        relations: ['campaign', 'user', 'feeLevel'],
        order: { createdAt: 'DESC' },
        skip: offset,
        take: limit
      });

      return {
        assignments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw error;
    }
  }

  /**
   * Find assignment by ID
   */
  async findOne(id: string): Promise<PaymentAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['campaign', 'user', 'feeLevel']
    });

    if (!assignment) {
      throw new NotFoundException('Payment assignment not found');
    }

    return assignment;
  }

  /**
   * Update assignment
   */
  async update(id: string, updateDto: UpdatePaymentAssignmentDto): Promise<PaymentAssignment> {
    const assignment = await this.findOne(id);

    // Validate status transitions
    if (updateDto.status && !this.isValidStatusTransition(assignment.status, updateDto.status)) {
      throw new BadRequestException(`Invalid status transition from ${assignment.status} to ${updateDto.status}`);
    }

    // Update assignment
    Object.assign(assignment, updateDto);

    const updatedAssignment = await this.assignmentRepository.save(assignment);

    this.logger.log(`Updated payment assignment ${id}`);

    return updatedAssignment;
  }

  /**
   * Mark assignment as paid
   */
  async markAsPaid(id: string): Promise<PaymentAssignment> {
    const assignment = await this.findOne(id);

    if (assignment.status === PaymentAssignmentStatus.PAID) {
      throw new BadRequestException('Assignment is already marked as paid');
    }

    // Update assignment status
    assignment.status = PaymentAssignmentStatus.PAID;
    assignment.paidAt = new Date();

    const updatedAssignment = await this.assignmentRepository.save(assignment);

    // Create payment history record for manual payment
    const paymentHistory = this.paymentHistoryRepository.create({
      assignment_id: assignment.id,
      amount: assignment.feeLevel.amount,
      status: PaymentHistoryStatus.PAID,
      payment_method: PaymentMethod.MANUAL,
      order_code: Number(String(Date.now()).slice(-6)), // Generate a simple order code based on timestamp
      paid_at: new Date(),
      // PayOS fields can be null for manual payments
      client_id: null,
      api_key: null,
      checksum_key: null
    });

    await this.paymentHistoryRepository.save(paymentHistory);

    this.logger.log(`Marked assignment ${id} as paid manually and created payment history`);

    return updatedAssignment;
  }

  /**
   * Mark assignment as overdue
   */
  async markAsOverdue(id: string): Promise<PaymentAssignment> {
    const assignment = await this.findOne(id);

    if (assignment.status !== PaymentAssignmentStatus.PENDING) {
      throw new BadRequestException('Only pending assignments can be marked as overdue');
    }

    assignment.status = PaymentAssignmentStatus.OVERDUE;

    const updatedAssignment = await this.assignmentRepository.save(assignment);

    this.logger.log(`Marked assignment ${id} as overdue`);

    return updatedAssignment;
  }

  /**
   * Delete assignment
   */
  async remove(id: string): Promise<void> {
    // Kiểm tra xem có thể xóa được không (giai đoạn này bỏ qua việc kiểm tra)
    // const deleteCheck = await this.canDelete(id);
    
    // if (!deleteCheck.canDelete) {
    //   throw new BadRequestException(deleteCheck.reason);
    // }

    // Xóa cascade: payment history trước, assignment sau
    await this.removeWithCascade(id);
  }

  /**
   * Remove assignment with cascade delete of related data
   */
  private async removeWithCascade(assignmentId: string): Promise<void> {
    // Bước 1: Xóa tất cả payment history liên quan
    const paymentHistories = await this.paymentHistoryRepository.find({
      where: { assignment_id: assignmentId }
    });

    if (paymentHistories.length > 0) {
      await this.paymentHistoryRepository.remove(paymentHistories);
      this.logger.log(`Deleted ${paymentHistories.length} payment history records for assignment ${assignmentId}`);
    }

    // Bước 2: Xóa assignment
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId }
    });

    if (assignment) {
      await this.assignmentRepository.remove(assignment);
      this.logger.log(`Deleted assignment ${assignmentId}`);
    }
  }

  /**
   * Check if assignment can be safely deleted
   */
  async canDelete(id: string): Promise<{ canDelete: boolean; reason?: string; relatedData?: any }> {
    const assignment = await this.findOne(id);

    // Không thể xóa assignment đã thanh toán
    if (assignment.status === PaymentAssignmentStatus.PAID) {
      return {
        canDelete: false,
        reason: 'Cannot delete paid assignments'
      };
    }

    // Kiểm tra payment history liên quan
    const paymentHistories = await this.paymentHistoryRepository.find({
      where: { assignment_id: id }
    });

    const paidHistories = paymentHistories.filter(h => h.status === 'PAID');
    
    if (paidHistories.length > 0) {
      return {
        canDelete: false,
        reason: 'Assignment has paid payment history records',
        relatedData: {
          paymentHistoryCount: paymentHistories.length,
          paidHistoryCount: paidHistories.length
        }
      };
    }

    return {
      canDelete: true,
      relatedData: {
        paymentHistoryCount: paymentHistories.length,
        paidHistoryCount: 0
      }
    };
  }

  /**
   * Get assignment statistics
   */
  async getStatistics(campaignId?: string, organizationId?: string) {
    try {
      const whereConditions: any = {};
      
      if (campaignId) {
        whereConditions.campaignId = campaignId;
      }

      // If organizationId is provided, we need to filter through campaign
      const queryOptions: any = {
        where: whereConditions,
        relations: ['campaign', 'feeLevel']
      };

      if (organizationId && !campaignId) {
        queryOptions.where = {
          campaign: { organizationId }
        };
      }

      const assignments = await this.assignmentRepository.find(queryOptions);

      // Calculate statistics from the retrieved assignments
      const totalAssignments = assignments.length;
      const pendingCount = assignments.filter(a => a.status === PaymentAssignmentStatus.PENDING).length;
      const paidCount = assignments.filter(a => a.status === PaymentAssignmentStatus.PAID).length;
      const overdueCount = assignments.filter(a => a.status === PaymentAssignmentStatus.OVERDUE).length;
      const exemptedCount = assignments.filter(a => a.status === PaymentAssignmentStatus.EXEMPTED).length;
      
      const totalPaidAmount = assignments
        .filter(a => a.status === PaymentAssignmentStatus.PAID)
        .reduce((sum, a) => sum + (a.feeLevel?.amount || 0), 0);
      
      const totalAmount = assignments.reduce((sum, a) => sum + (a.feeLevel?.amount || 0), 0);
      const averageAmount = totalAssignments > 0 ? totalAmount / totalAssignments : 0;
      const paymentRate = totalAssignments > 0 ? (paidCount / totalAssignments) * 100 : 0;

      return {
        totalAssignments,
        pendingCount,
        paidCount,
        overdueCount,
        exemptedCount,
        totalPaidAmount,
        totalAmount,
        averageAmount,
        paymentRate
      };
    } catch (error) {
      this.logger.error('Error in getStatistics:', error);
      throw error;
    }
  }

  /**
   * Check overdue assignments and update status
   */
  async checkOverdueAssignments(): Promise<number> {
    const now = new Date();
    
    const overdueAssignments = await this.assignmentRepository.find({
      where: {
        status: PaymentAssignmentStatus.PENDING,
        dueDate: LessThan(now)
      }
    });

    if (overdueAssignments.length > 0) {
      await this.assignmentRepository.update(
        { id: In(overdueAssignments.map(a => a.id)) },
        { status: PaymentAssignmentStatus.OVERDUE }
      );

      this.logger.log(`Updated ${overdueAssignments.length} assignments to overdue status`);
    }

    return overdueAssignments.length;
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(current: PaymentAssignmentStatus, target: PaymentAssignmentStatus): boolean {
    const validTransitions = {
      [PaymentAssignmentStatus.PENDING]: [
        PaymentAssignmentStatus.PAID,
        PaymentAssignmentStatus.OVERDUE,
        PaymentAssignmentStatus.EXEMPTED
      ],
      [PaymentAssignmentStatus.OVERDUE]: [
        PaymentAssignmentStatus.PAID,
        PaymentAssignmentStatus.EXEMPTED
      ],
      [PaymentAssignmentStatus.PAID]: [], // Paid assignments cannot be changed
      [PaymentAssignmentStatus.EXEMPTED]: [
        PaymentAssignmentStatus.PENDING
      ]
    };

    return validTransitions[current]?.includes(target) || false;
  }

  /**
   * Update assignment status
   */
  async updateStatus(id: string, status: PaymentAssignmentStatus): Promise<PaymentAssignment> {
    const assignment = await this.findOne(id);

    // Validate status transition
    if (!this.isValidStatusTransition(assignment.status, status)) {
      throw new BadRequestException(`Cannot change status from ${assignment.status} to ${status}`);
    }

    assignment.status = status;
    
    if (status === PaymentAssignmentStatus.PAID) {
      assignment.paidAt = new Date();
    }

    await this.assignmentRepository.save(assignment);

    this.logger.log(`Updated assignment ${id} status to ${status}`);
    return assignment;
  }
}
