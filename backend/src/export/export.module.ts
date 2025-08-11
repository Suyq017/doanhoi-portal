import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { UserOrganization } from '../entities/user-organization.entity';
import { PaymentAssignment } from '../entities/payment-assignment.entity';
import { PaymentCampaign } from '../entities/payment-campaign.entity';
import { PaymentCampaignPayosConfig } from '../entities/payment-campaign-payos-config.entity';
import { PaymentHistory } from '../entities/payment-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, 
      Organization, 
      UserOrganization, 
      PaymentAssignment, 
      PaymentCampaign,
      PaymentCampaignPayosConfig,
      PaymentHistory
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
