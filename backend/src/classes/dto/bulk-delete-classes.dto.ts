import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BulkDeleteClassesDto {
    @ApiProperty({
        description: 'Danh sách ID lớp học cần xóa',
        example: ['uuid1', 'uuid2', 'uuid3'],
        type: [String]
    })
    @IsArray()
    @IsNotEmpty()
    @IsString({ each: true })
    ids: string[];
}
