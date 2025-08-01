import { IsOptional, IsNumber, IsString, IsDateString, IsEnum, Min } from 'class-validator';
import { PaymentAssignmentStatus } from '../../entities/payment-assignment.entity';

export class UpdatePaymentAssignmentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(PaymentAssignmentStatus)
  status?: PaymentAssignmentStatus;
}
