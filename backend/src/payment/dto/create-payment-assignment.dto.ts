import { IsNotEmpty, IsUUID, IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';

export class CreatePaymentAssignmentDto {
  @IsNotEmpty()
  @IsUUID()
  campaignId: string;

  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsUUID()
  feeLevelId: string;

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
}
