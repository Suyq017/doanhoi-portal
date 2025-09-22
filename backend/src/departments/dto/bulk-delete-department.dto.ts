import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';

export class BulkDeleteDepartmentDto {
  @ApiProperty({
    description: 'Array of department IDs to delete',
    example: ['uuid1', 'uuid2', 'uuid3'],
    type: [String]
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one department ID must be provided' })
  @IsString({ each: true, message: 'Each ID must be a string' })
  @IsNotEmpty({ each: true, message: 'Department IDs cannot be empty' })
  ids: string[];
}