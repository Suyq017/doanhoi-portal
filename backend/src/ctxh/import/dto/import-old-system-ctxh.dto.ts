import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
