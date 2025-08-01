import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import PayosModule để sử dụng SimplePayosService
import { PayosModule } from '../payos/payos.module';

// Entities
import { PaymentCampaign } from '../entities/payment-campaign.entity';
import { PaymentFeeLevel } from '../entities/payment-fee-level.entity';
import { PaymentAssignment } from '../entities/payment-assignment.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { OrganizationPayosConfig } from '../entities/organization-payos-config.entity';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';

// Services
import { PaymentCampaignService } from './services/payment-campaign.service';
import { PaymentFeeLevelService } from './services/payment-fee-level.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { PaymentHistoryService } from './services/payment-history.service';
import { PaymentAssignmentService } from './services/payment-assignment.service';
import { PayosConfigService } from './services/payos-config.service';
import { PayosService } from './services/payos.service';

// Controllers
import { PaymentCampaignController } from './controllers/payment-campaign.controller';
import { PaymentFeeLevelController } from './controllers/payment-fee-level.controller';
import { PaymentTransactionController } from './payment-transaction.controller';
import { PaymentAssignmentController } from './payment-assignment.controller';
import { OrganizationPayOSConfigController } from './controllers/organization-payos-config.controller';
import { PayosConfigController } from './controllers/payos-config.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentBulkController } from './controllers/payment-bulk.controller';
import { PaymentController } from '../api/payment/payment.controller'; // Import API controller
import { PaymentAdminController } from '../api/payment/payment-admin.controller'; // Import Admin API controller

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentCampaign,
      PaymentFeeLevel,
      PaymentAssignment,
      PaymentTransaction,
      PaymentHistory, // Thêm PaymentHistory entity
      OrganizationPayosConfig,
      Organization,
      User,
    ]),
    forwardRef(() => PayosModule), // Forward reference để tránh circular dependency
  ],
  controllers: [
    PaymentCampaignController,
    PaymentFeeLevelController,
    PaymentTransactionController,
    PaymentAssignmentController,
    OrganizationPayOSConfigController,
    PayosConfigController,
    PaymentWebhookController,
    PaymentBulkController,
    PaymentController, // Thêm API controller
    PaymentAdminController, // Thêm Admin API controller
  ],
  providers: [
    PaymentCampaignService,
    PaymentFeeLevelService,
    PaymentTransactionService,
    PaymentHistoryService, // Thêm PaymentHistoryService
    PaymentAssignmentService,
    PayosConfigService,
    PayosService,
  ],
  exports: [
    PaymentCampaignService,
    PaymentFeeLevelService,
    PaymentTransactionService,
    PaymentHistoryService, // Export PaymentHistoryService
    PaymentAssignmentService,
    PayosConfigService, // Export để PayosModule có thể sử dụng
    PayosService,
  ],
})
export class PaymentModule {}
