import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Logger,
} from "@nestjs/common";
import { PaymentAssignmentService } from "./services/payment-assignment.service";
import { CreateBulkPaymentAssignmentDto } from "./dto/create-payment-assignment.dto";
import { UpdatePaymentAssignmentDto } from "./dto/update-payment-assignment.dto";
import { PaymentAssignmentStatus } from "../entities/payment-assignment.entity";

@Controller("payment/assignments")
export class PaymentAssignmentController {
  private readonly logger = new Logger(PaymentAssignmentController.name);

  constructor(private readonly assignmentService: PaymentAssignmentService) { }

  /**
   * Create payment assignment
   * POST /payment/assignments
   */
  // @Post()
  // async create(@Body() createDto: CreatePaymentAssignmentDto) {
  //   this.logger.log(`Creating payment assignment for user ${createDto.userId}`);

  //   const assignment = await this.assignmentService.create(createDto);

  //   return {
  //     success: true,
  //     message: 'Payment assignment created successfully',
  //     data: assignment
  //   };
  // }

  /**
   * Create bulk assignments
   * POST /payment/assignments/bulk
   */
  @Post("bulk")
  async createBulk(@Body() requestBody: CreateBulkPaymentAssignmentDto) {
    const { assignments, userId } = requestBody;

    this.logger.log(
      `Creating ${assignments.length} payment assignments by user ${userId}`,
    );

    const created = await this.assignmentService.createBulk(
      assignments,
      userId,
    );

    return {
      success: true,
      message: `Created ${created.length} payment assignments`,
      data: created,
    };
  }

  /**
   * Get assignment statistics
   * GET /payment/assignments/statistics
   */
  @Get("statistics")
  async getStatistics(
    @Query("campaignId") campaignId?: string,
    @Query("organizationId") organizationId?: string,
  ) {
    const stats = await this.assignmentService.getStatistics(
      campaignId,
      organizationId,
    );

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get all assignments with filters
   * GET /payment/assignments
   */
  @Get()
  async findAll(
    @Query("campaignId") campaignId?: string,
    @Query("userId") userId?: string,
    @Query("status") status?: PaymentAssignmentStatus,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
  ) {
    // Convert string query params to numbers
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // Auto-check for overdue assignments before returning results
    await this.assignmentService.checkOverdueAssignments();

    const result = await this.assignmentService.findAll(
      campaignId,
      userId,
      status,
      pageNum,
      limitNum,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get assignment by ID
   * GET /payment/assignments/:id
   */
  @Get(":id")
  async findOne(@Param("id") id: string) {
    const assignment = await this.assignmentService.findOne(id);

    return {
      success: true,
      data: assignment,
    };
  }

  /**
   * Update assignment
   * PATCH /payment/assignments/:id
   */
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdatePaymentAssignmentDto,
  ) {
    this.logger.log(`Updating payment assignment ${id}`);

    const assignment = await this.assignmentService.update(id, updateDto);

    return {
      success: true,
      message: "Payment assignment updated successfully",
      data: assignment,
    };
  }

  /**
   * Mark assignment as paid
   * PATCH /payment/assignments/:id/mark-paid
   */
  @Patch(":id/mark-paid")
  async markAsPaid(@Param("id") id: string) {
    this.logger.log(`Marking assignment ${id} as paid`);

    const assignment = await this.assignmentService.markAsPaid(id, false);

    return {
      success: true,
      message: "Assignment marked as paid",
      data: assignment,
    };
  }

  /**
   * Mark assignment as overdue
   * PATCH /payment/assignments/:id/mark-overdue
   */
  @Patch(":id/mark-overdue")
  async markAsOverdue(@Param("id") id: string) {
    this.logger.log(`Marking assignment ${id} as overdue`);

    const assignment = await this.assignmentService.markAsOverdue(id);

    return {
      success: true,
      message: "Assignment marked as overdue",
      data: assignment,
    };
  }

  /**
   * Delete assignment
   * DELETE /payment/assignments/:id
   */
  @Delete(":id")
  async remove(@Param("id") id: string) {
    this.logger.log(`Deleting payment assignment ${id}`);

    await this.assignmentService.remove(id);

    return {
      success: true,
      message: "Payment assignment deleted successfully",
    };
  }

  /**
   * Check and update overdue assignments
   * POST /payment/assignments/check-overdue
   */
  @Post("check-overdue")
  async checkOverdue() {
    this.logger.log("Checking for overdue assignments");

    const updatedCount = await this.assignmentService.checkOverdueAssignments();

    return {
      success: true,
      message: `Updated ${updatedCount} assignments to overdue status`,
      data: { updatedCount },
    };
  }
}
