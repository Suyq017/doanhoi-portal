import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import PayosModule để sử dụng SimplePayosService
import { PayosModule } from '../payos/payos.module';
import { RolesModule } from '../roles/roles.module'; // Import RolesModule

// Entities
import { PaymentCampaign } from '../entities/payment-campaign.entity';
import { PaymentFeeLevel } from '../entities/payment-fee-level.entity';
import { PaymentAssignment } from '../entities/payment-assignment.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { PaymentCampaignPayosConfig } from '../entities/payment-campaign-payos-config.entity';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';

// Services
import { PaymentCampaignService } from './services/payment-campaign.service';
import { PaymentFeeLevelService } from './services/payment-fee-level.service';
import { PaymentHistoryService } from './services/payment-history.service';
import { PaymentAssignmentService } from './services/payment-assignment.service';
import { PaymentCampaignPayosConfigService } from './services/payment-campaign-payos-config.service';

// Controllers
import { PaymentCampaignController } from './controllers/payment-campaign.controller';
import { PaymentFeeLevelController } from './controllers/payment-fee-level.controller';
import { PaymentAssignmentController } from './payment-assignment.controller';
import { PaymentCampaignPayOSConfigController } from './controllers/payment-campaign-payos-config.controller';
import { PayOSController } from '../payos/payos.controller'; // Import API controller
import { PaymentAdminController } from './payment-admin.controller'; // Import Admin API controller

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentCampaign,
      PaymentFeeLevel,
      PaymentAssignment,
      PaymentHistory, // Thêm PaymentHistory entity
      PaymentCampaignPayosConfig,
      Organization,
      User,
    ]),
    forwardRef(() => PayosModule),
    forwardRef(() => RolesModule), 
  ],
  controllers: [
    PaymentCampaignController,
    PaymentFeeLevelController,
    PaymentAssignmentController,
    PaymentCampaignPayOSConfigController,
    PayOSController, 
    PaymentAdminController, 
  ],
  providers: [
    PaymentCampaignService,
    PaymentFeeLevelService,
    PaymentHistoryService, // Thêm PaymentHistoryService
    PaymentAssignmentService,
    PaymentCampaignPayosConfigService,
  ],
  exports: [
    PaymentCampaignService,
    PaymentFeeLevelService,
    PaymentHistoryService, // Export PaymentHistoryService
    PaymentAssignmentService,
    PaymentCampaignPayosConfigService, // Export để PayosModule có thể sử dụng
  ],
})
export class PaymentModule { }
