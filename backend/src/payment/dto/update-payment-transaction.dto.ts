import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { PaymentTransactionStatus } from '../../entities/payment-transaction.entity';

export class UpdatePaymentTransactionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PaymentTransactionStatus)
  status?: PaymentTransactionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
