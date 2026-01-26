import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

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

export class CreateBulkPaymentAssignmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentAssignmentDto)
  assignments: CreatePaymentAssignmentDto[];

  @IsNotEmpty()
  @IsUUID()
  userId: string;
}
