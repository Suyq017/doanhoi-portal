import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
} from "class-validator";

export class CreatePaymentFeeLevelDto {
  @IsNotEmpty()
  @IsUUID()
  campaignId: string;

  @IsNotEmpty()
  @IsString()
  levelName: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
