import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PaymentHistory,
  PaymentHistoryStatus,
} from "../../entities/payment-history.entity";

@Injectable()
export class PaymentHistoryService {
  constructor(
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>,
  ) { }

  async createPaymentRecord(data: {
    assignmentId: string;
    amount: number;
    orderCode: number;
    clientId?: string;
    apiKey?: string;
    checksumKey?: string;
  }): Promise<PaymentHistory> {
    const paymentHistory = this.paymentHistoryRepository.create({
      assignment_id: data.assignmentId,
      amount: data.amount,
      order_code: data.orderCode,
      status: PaymentHistoryStatus.PENDING,
      client_id: data.clientId,
      api_key: data.apiKey,
      checksum_key: data.checksumKey,
    });

    return await this.paymentHistoryRepository.save(paymentHistory);
  }

  async findByOrderCode(orderCode: number): Promise<PaymentHistory | null> {
    return await this.paymentHistoryRepository.findOne({
      where: { order_code: orderCode },
      relations: [
        "assignment",
        "assignment.campaign",
        "assignment.campaign.organization",
      ],
    });
  }

  async updatePaymentStatus(
    orderCode: number,
    status: PaymentHistoryStatus,
    paidAt?: Date,
  ): Promise<PaymentHistory> {
    const paymentHistory = await this.findByOrderCode(orderCode);
    if (!paymentHistory) {
      throw new Error("Payment history not found");
    }

    paymentHistory.status = status;
    if (status === PaymentHistoryStatus.PAID && paidAt) {
      paymentHistory.paid_at = paidAt;
    }

    return await this.paymentHistoryRepository.save(paymentHistory);
  }

  async findByAssignmentId(assignmentId: string): Promise<PaymentHistory[]> {
    return await this.paymentHistoryRepository.find({
      where: { assignment_id: assignmentId },
      order: { created_at: "DESC" },
    });
  }

  async findById(id: string): Promise<PaymentHistory | null> {
    return await this.paymentHistoryRepository.findOne({
      where: { id },
      relations: [
        "assignment",
        "assignment.campaign",
        "assignment.campaign.organization",
      ],
    });
  }

  async findAll(): Promise<PaymentHistory[]> {
    return await this.paymentHistoryRepository.find({
      relations: [
        "assignment",
        "assignment.campaign",
        "assignment.campaign.organization",
      ],
      order: { created_at: "DESC" },
    });
  }

  async getPaymentHistoryByCampaign(
    campaignId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
    },
  ): Promise<{
    items: PaymentHistory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit, search, status } = options;
    const offset = (page - 1) * limit;

    // Build query
    const queryBuilder = this.paymentHistoryRepository
      .createQueryBuilder("ph")
      .leftJoinAndSelect("ph.assignment", "assignment")
      .leftJoinAndSelect("assignment.user", "user")
      .leftJoinAndSelect("assignment.campaign", "campaign")
      .leftJoinAndSelect("assignment.feeLevel", "feeLevel")
      .where("campaign.id = :campaignId", { campaignId })
      .andWhere("ph.status IN (:...allowedStatuses)", {
        allowedStatuses: [
          PaymentHistoryStatus.PAID,
          PaymentHistoryStatus.CANCELLED,
        ],
      });

    // Apply status filter
    if (status && status !== "all") {
      // Ensure the requested status is one of the allowed statuses
      if (
        status === PaymentHistoryStatus.PAID ||
        status === PaymentHistoryStatus.CANCELLED
      ) {
        queryBuilder.andWhere("ph.status = :status", { status });
      }
    }

    // Apply search filter
    if (search && search.trim()) {
      queryBuilder.andWhere(
        "(LOWER(CONCAT(user.familyName, ' ', user.givenName)) LIKE LOWER(:search) OR " +
        "LOWER(user.code) LIKE LOWER(:search) OR " +
        "CAST(ph.order_code AS TEXT) LIKE :search)",
        { search: `%${search.trim()}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get items with pagination
    const items = await queryBuilder
      .orderBy("ph.created_at", "DESC")
      .skip(offset)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
