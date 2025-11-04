import { IsString, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OldSystemCtxhRecordDto {
  @ApiProperty({ description: 'Mã số sinh viên' })
  @IsString()
  studentCode: string;

  @ApiProperty({ description: 'Số ngày CTXH từ hệ thống cũ' })
  @IsNumber()
  @Min(0)
  days: number;
}

export class ImportOldSystemCtxhDto {
  @ApiProperty({ 
    type: [OldSystemCtxhRecordDto],
    description: 'Danh sách bản ghi CTXH từ hệ thống cũ'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OldSystemCtxhRecordDto)
  records: OldSystemCtxhRecordDto[];
}

export class ImportOldSystemCtxhResultDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  successful: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ type: [String] })
  errors: string[];

  @ApiProperty()
  message: string;
}
