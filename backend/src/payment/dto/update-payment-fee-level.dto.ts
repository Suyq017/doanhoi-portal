import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentFeeLevelDto } from './create-payment-fee-level.dto';

export class UpdatePaymentFeeLevelDto extends PartialType(CreatePaymentFeeLevelDto) {}
