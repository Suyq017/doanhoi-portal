import { PartialType } from '@nestjs/swagger';
import { CreateLimitConfigDto } from './create-limit-config.dto';

export class UpdateLimitConfigDto extends PartialType(CreateLimitConfigDto) {}