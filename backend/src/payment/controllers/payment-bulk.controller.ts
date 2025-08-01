import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  BadRequestException,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentAssignmentService } from '../services/payment-assignment.service';
import { PaymentTransactionService } from '../services/payment-transaction.service';
import { PaymentCampaignService } from '../services/payment-campaign.service';

class BulkAssignmentDto {
  campaignId: string;
  userIds: string[];
  feeLevelId?: string;
  dueDate?: Date;
  notes?: string;
}

class BulkTransactionDto {
  assignmentIds: string[];
  notes?: string;
}

class BulkStatusUpdateDto {
  transactionIds?: string[];
  assignmentIds?: string[];
  status: string;
  reason?: string;
}

@ApiTags('Payment Bulk Operations')
@Controller('payment/bulk')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentBulkController {
  private readonly logger = new Logger(PaymentBulkController.name);

  constructor(
    private readonly assignmentService: PaymentAssignmentService,
    private readonly transactionService: PaymentTransactionService,
    private readonly campaignService: PaymentCampaignService,
  ) {}

  @Post('assignments')
  @ApiOperation({ summary: 'Create bulk payment assignments' })
  @ApiResponse({ status: 201, description: 'Assignments created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createBulkAssignments(@Body() bulkDto: BulkAssignmentDto) {
    this.logger.log(`Creating bulk assignments for campaign ${bulkDto.campaignId} with ${bulkDto.userIds.length} users`);

    try {
      // Validate campaign exists and is active
      const campaign = await this.campaignService.findOne(bulkDto.campaignId);
      if (!campaign) {
        throw new BadRequestException('Campaign not found');
      }

      if (campaign.status !== 'ACTIVE') {
        throw new BadRequestException('Campaign must be active to create assignments');
      }

      // Create assignments for all users
      const results = [];
      const errors = [];

      for (const userId of bulkDto.userIds) {
        try {
          const assignment = await this.assignmentService.create({
            campaignId: bulkDto.campaignId,
            userId: userId,
            feeLevelId: bulkDto.feeLevelId,
            dueDate: bulkDto.dueDate,
            notes: bulkDto.notes,
          });
          results.push(assignment);
        } catch (error) {
          errors.push({
            userId,
            error: error.message
          });
        }
      }

      this.logger.log(`Bulk assignment completed: ${results.length} successful, ${errors.length} failed`);

      return {
        success: true,
        data: {
          created: results.length,
          failed: errors.length,
          assignments: results,
          errors: errors
        }
      };
    } catch (error) {
      this.logger.error('Bulk assignment creation failed:', error);
      throw new BadRequestException('Failed to create bulk assignments: ' + error.message);
    }
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Create bulk payment transactions' })
  @ApiResponse({ status: 201, description: 'Transactions created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createBulkTransactions(@Body() bulkDto: BulkTransactionDto) {
    this.logger.log(`Creating bulk transactions for ${bulkDto.assignmentIds.length} assignments`);

    try {
      const results = [];
      const errors = [];

      for (const assignmentId of bulkDto.assignmentIds) {
        try {
          // Validate assignment exists and is pending
          const assignment = await this.assignmentService.findOne(assignmentId);
          if (!assignment) {
            errors.push({
              assignmentId,
              error: 'Assignment not found'
            });
            continue;
          }

          if (assignment.status !== 'PENDING') {
            errors.push({
              assignmentId,
              error: 'Assignment must be pending to create transaction'
            });
            continue;
          }

          const transaction = await this.transactionService.create({
            assignmentId: assignmentId,
            amount: assignment.customAmount || assignment.feeLevel.amount,
            description: bulkDto.notes,
          });

          results.push(transaction);
        } catch (error) {
          errors.push({
            assignmentId,
            error: error.message
          });
        }
      }

      this.logger.log(`Bulk transaction completed: ${results.length} successful, ${errors.length} failed`);

      return {
        success: true,
        data: {
          created: results.length,
          failed: errors.length,
          transactions: results,
          errors: errors
        }
      };
    } catch (error) {
      this.logger.error('Bulk transaction creation failed:', error);
      throw new BadRequestException('Failed to create bulk transactions: ' + error.message);
    }
  }

  @Post('status-update')
  @ApiOperation({ summary: 'Bulk update payment status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateBulkStatus(@Body() bulkDto: BulkStatusUpdateDto) {
    this.logger.log(`Bulk status update: ${bulkDto.status}`);

    try {
      const results = [];
      const errors = [];

      // Update transactions if provided
      if (bulkDto.transactionIds && bulkDto.transactionIds.length > 0) {
        for (const transactionId of bulkDto.transactionIds) {
          try {
            const transaction = await this.transactionService.findOne(transactionId);
            if (!transaction) {
              errors.push({
                transactionId,
                error: 'Transaction not found'
              });
              continue;
            }

            // Update transaction status
            await this.transactionService.updateOrderStatus(
              transaction.payosOrderCode,
              {
                status: bulkDto.status as any,
                description: bulkDto.reason
              }
            );

            results.push({
              type: 'transaction',
              id: transactionId,
              status: bulkDto.status
            });
          } catch (error) {
            errors.push({
              transactionId,
              error: error.message
            });
          }
        }
      }

      // Update assignments if provided
      if (bulkDto.assignmentIds && bulkDto.assignmentIds.length > 0) {
        for (const assignmentId of bulkDto.assignmentIds) {
          try {
            const assignment = await this.assignmentService.findOne(assignmentId);
            if (!assignment) {
              errors.push({
                assignmentId,
                error: 'Assignment not found'
              });
              continue;
            }

            // Update assignment status
            await this.assignmentService.updateStatus(assignmentId, bulkDto.status as any);

            results.push({
              type: 'assignment',
              id: assignmentId,
              status: bulkDto.status
            });
          } catch (error) {
            errors.push({
              assignmentId,
              error: error.message
            });
          }
        }
      }

      this.logger.log(`Bulk status update completed: ${results.length} successful, ${errors.length} failed`);

      return {
        success: true,
        data: {
          updated: results.length,
          failed: errors.length,
          results: results,
          errors: errors
        }
      };
    } catch (error) {
      this.logger.error('Bulk status update failed:', error);
      throw new BadRequestException('Failed to update bulk status: ' + error.message);
    }
  }

  @Post('generate-payment-links')
  @ApiOperation({ summary: 'Generate bulk payment links' })
  @ApiResponse({ status: 200, description: 'Payment links generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async generateBulkPaymentLinks(
    @Body() bulkDto: { assignmentIds: string[] },
    @Query('organizationId') organizationId?: string
  ) {
    this.logger.log(`Generating bulk payment links for ${bulkDto.assignmentIds.length} assignments`);

    try {
      const results = [];
      const errors = [];

      for (const assignmentId of bulkDto.assignmentIds) {
        try {
          const assignment = await this.assignmentService.findOne(assignmentId);
          if (!assignment) {
            errors.push({
              assignmentId,
              error: 'Assignment not found'
            });
            continue;
          }

          // Create transaction with payment link
          const transaction = await this.transactionService.create({
            assignmentId: assignmentId,
            amount: assignment.customAmount || assignment.feeLevel.amount,
          });

          results.push({
            assignmentId,
            transactionId: transaction.id,
            paymentLink: transaction.checkoutUrl,
            orderCode: transaction.payosOrderCode
          });
        } catch (error) {
          errors.push({
            assignmentId,
            error: error.message
          });
        }
      }

      this.logger.log(`Bulk payment link generation completed: ${results.length} successful, ${errors.length} failed`);

      return {
        success: true,
        data: {
          generated: results.length,
          failed: errors.length,
          paymentLinks: results,
          errors: errors
        }
      };
    } catch (error) {
      this.logger.error('Bulk payment link generation failed:', error);
      throw new BadRequestException('Failed to generate bulk payment links: ' + error.message);
    }
  }
}
