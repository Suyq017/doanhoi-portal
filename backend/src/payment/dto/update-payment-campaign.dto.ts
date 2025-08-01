import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentCampaignDto } from './create-payment-campaign.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { PaymentCampaignStatus } from '../../entities/payment-campaign.entity';

export class UpdatePaymentCampaignDto extends PartialType(CreatePaymentCampaignDto) {
  @IsOptional()
  @IsEnum(PaymentCampaignStatus)
  status?: PaymentCampaignStatus;
}
