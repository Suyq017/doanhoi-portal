import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import PayosModule để sử dụng SimplePayosService
import { PayosModule } from '../payos/payos.module';

// Entities
import { PaymentCampaign } from '../entities/payment-campaign.entity';
import { PaymentFeeLevel } from '../entities/payment-fee-level.entity';
import { PaymentAssignment } from '../entities/payment-assignment.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { OrganizationPayosConfig } from '../entities/organization-payos-config.entity';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';

// Services
import { PaymentCampaignService } from './services/payment-campaign.service';
import { PaymentFeeLevelService } from './services/payment-fee-level.service';
import { PaymentHistoryService } from './services/payment-history.service';
import { PaymentAssignmentService } from './services/payment-assignment.service';
import { PayosConfigService } from './services/payos-config.service';

// Controllers
import { PaymentCampaignController } from './controllers/payment-campaign.controller';
import { PaymentFeeLevelController } from './controllers/payment-fee-level.controller';
import { PaymentAssignmentController } from './payment-assignment.controller';
import { OrganizationPayOSConfigController } from './controllers/organization-payos-config.controller';
import { PayosConfigController } from './controllers/payos-config.controller';
import { PaymentController } from '../payos/payment.controller'; // Import API controller
import { PaymentAdminController } from './payment-admin.controller'; // Import Admin API controller

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentCampaign,
      PaymentFeeLevel,
      PaymentAssignment,
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
    PaymentAssignmentController,
    OrganizationPayOSConfigController,
    PayosConfigController,
    PaymentController, // Thêm API controller
    PaymentAdminController, // Thêm Admin API controller
  ],
  providers: [
    PaymentCampaignService,
    PaymentFeeLevelService,
    PaymentHistoryService, // Thêm PaymentHistoryService
    PaymentAssignmentService,
    PayosConfigService,
  ],
  exports: [
    PaymentCampaignService,
    PaymentFeeLevelService,
    PaymentHistoryService, // Export PaymentHistoryService
    PaymentAssignmentService,
    PayosConfigService, // Export để PayosModule có thể sử dụng
  ],
})
export class PaymentModule {}
