import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentFeeLevel } from "../../entities/payment-fee-level.entity";
import { PaymentCampaign } from "../../entities/payment-campaign.entity";
import { CreatePaymentFeeLevelDto } from "../dto/create-payment-fee-level.dto";
import { UpdatePaymentFeeLevelDto } from "../dto/update-payment-fee-level.dto";

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
      where: { id: createDto.campaignId },
    });

    if (!campaign) {
      throw new NotFoundException("Payment campaign not found");
    }

    // ✅ Convert empty strings to null for nullable fields
    const processedDto = { ...createDto };
    if (processedDto.description === "") {
      processedDto.description = null;
    }

    const feeLevel = this.feeLevelRepository.create(processedDto);
    return this.feeLevelRepository.save(feeLevel);
  }

  /**
   * Get all fee levels for a campaign
   */
  async findByCampaign(campaignId: string): Promise<PaymentFeeLevel[]> {
    return this.feeLevelRepository.find({
      where: { campaignId },
      relations: ["campaign"],
    });
  }

  /**
   * Get fee level by ID
   */
  async findOne(id: string): Promise<PaymentFeeLevel> {
    const feeLevel = await this.feeLevelRepository.findOne({
      where: { id },
      relations: ["campaign"],
    });

    if (!feeLevel) {
      throw new NotFoundException("Fee level not found");
    }

    return feeLevel;
  }

  /**
   * Update fee level
   */
  async update(
    id: string,
    updateDto: UpdatePaymentFeeLevelDto,
  ): Promise<PaymentFeeLevel> {
    const feeLevel = await this.findOne(id);

    // ✅ Convert empty strings to null for nullable fields
    const processedDto = { ...updateDto };
    if (processedDto.description === undefined) {
      processedDto.description = null;
    }

    Object.assign(feeLevel, processedDto);
    return this.feeLevelRepository.save(feeLevel);
  }

  /**
   * Delete fee level
   */
  async remove(id: string): Promise<void> {
    const feeLevel = await this.findOne(id);

    // Check if this fee level is used in any assignments
    const assignmentCount = await this.feeLevelRepository
      .createQueryBuilder("feeLevel")
      .leftJoin("feeLevel.assignments", "assignment")
      .where("feeLevel.id = :id", { id })
      .andWhere("assignment.id IS NOT NULL")
      .getCount();

    if (assignmentCount > 0) {
      throw new BadRequestException(
        "Cannot delete fee level that is used in assignments",
      );
    }

    await this.feeLevelRepository.remove(feeLevel);
  }
}
