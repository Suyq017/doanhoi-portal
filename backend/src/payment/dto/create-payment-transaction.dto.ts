import { IsNotEmpty, IsUUID, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentTransactionDto {
  @IsNotEmpty()
  @IsUUID()
  assignmentId: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
