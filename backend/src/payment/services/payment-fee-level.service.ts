import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentFeeLevel } from '../../entities/payment-fee-level.entity';
import { PaymentCampaign } from '../../entities/payment-campaign.entity';
import { CreatePaymentFeeLevelDto } from '../dto/create-payment-fee-level.dto';
import { UpdatePaymentFeeLevelDto } from '../dto/update-payment-fee-level.dto';

@Injectable()
export class PaymentFeeLevelService {
  constructor(
    @InjectRepository(PaymentFeeLevel)
    private readonly feeLevelRepository: Repository<PaymentFeeLevel>,
    @InjectRepository(PaymentCampaign)
    private readonly campaignRepository: Repository<PaymentCampaign>,
  ) {}

  /**
   * Create new fee level for campaign
   */
  async create(createDto: CreatePaymentFeeLevelDto): Promise<PaymentFeeLevel> {
    // Verify campaign exists
    const campaign = await this.campaignRepository.findOne({
      where: { id: createDto.campaignId }
    });

    if (!campaign) {
      throw new NotFoundException('Payment campaign not found');
    }

    // If this is set as default, unset other defaults in the same campaign
    if (createDto.isDefault) {
      await this.feeLevelRepository.update(
        { campaignId: createDto.campaignId },
        { isDefault: false }
      );
    }

    const feeLevel = this.feeLevelRepository.create(createDto);
    return this.feeLevelRepository.save(feeLevel);
  }

  /**
   * Get all fee levels for a campaign
   */
  async findByCampaign(campaignId: string): Promise<PaymentFeeLevel[]> {
    return this.feeLevelRepository.find({
      where: { campaignId },
      relations: ['campaign'],
      order: { orderIndex: 'ASC', createdAt: 'ASC' }
    });
  }

  /**
   * Get fee level by ID
   */
  async findOne(id: string): Promise<PaymentFeeLevel> {
    const feeLevel = await this.feeLevelRepository.findOne({
      where: { id },
      relations: ['campaign']
    });

    if (!feeLevel) {
      throw new NotFoundException('Fee level not found');
    }

    return feeLevel;
  }

  /**
   * Update fee level
   */
  async update(id: string, updateDto: UpdatePaymentFeeLevelDto): Promise<PaymentFeeLevel> {
    const feeLevel = await this.findOne(id);

    // If setting as default, unset other defaults in the same campaign
    if (updateDto.isDefault) {
      await this.feeLevelRepository.update(
        { campaignId: feeLevel.campaignId, id: { $ne: id } as any },
        { isDefault: false }
      );
    }

    Object.assign(feeLevel, updateDto);
    return this.feeLevelRepository.save(feeLevel);
  }

  /**
   * Delete fee level
   */
  async remove(id: string): Promise<void> {
    const feeLevel = await this.findOne(id);

    // Check if this fee level is used in any assignments
    const assignmentCount = await this.feeLevelRepository
      .createQueryBuilder('feeLevel')
      .leftJoin('feeLevel.assignments', 'assignment')
      .where('feeLevel.id = :id', { id })
      .andWhere('assignment.id IS NOT NULL')
      .getCount();

    if (assignmentCount > 0) {
      throw new BadRequestException('Cannot delete fee level that is used in assignments');
    }

    await this.feeLevelRepository.remove(feeLevel);
  }

  /**
   * Set fee level as default
   */
  async setAsDefault(id: string): Promise<PaymentFeeLevel> {
    const feeLevel = await this.findOne(id);

    // Unset other defaults in the same campaign
    await this.feeLevelRepository.update(
      { campaignId: feeLevel.campaignId },
      { isDefault: false }
    );

    // Set this one as default
    feeLevel.isDefault = true;
    return this.feeLevelRepository.save(feeLevel);
  }

  /**
   * Get default fee level for campaign
   */
  async getDefaultForCampaign(campaignId: string): Promise<PaymentFeeLevel | null> {
    return this.feeLevelRepository.findOne({
      where: { campaignId, isDefault: true },
      relations: ['campaign']
    });
  }

  /**
   * Reorder fee levels
   */
  async reorder(campaignId: string, feeLevelIds: string[]): Promise<PaymentFeeLevel[]> {
    const feeLevels = await this.findByCampaign(campaignId);
    
    // Validate all provided IDs exist in this campaign
    const existingIds = feeLevels.map(fl => fl.id);
    const invalidIds = feeLevelIds.filter(id => !existingIds.includes(id));
    
    if (invalidIds.length > 0) {
      throw new BadRequestException(`Invalid fee level IDs: ${invalidIds.join(', ')}`);
    }

    // Update order index for each fee level
    const updatePromises = feeLevelIds.map((id, index) => 
      this.feeLevelRepository.update(id, { orderIndex: index })
    );

    await Promise.all(updatePromises);

    // Return updated fee levels
    return this.findByCampaign(campaignId);
  }
}
