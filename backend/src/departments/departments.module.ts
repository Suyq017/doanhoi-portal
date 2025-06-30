import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { ImportService } from './services/import.service';
import { ExcelParserService } from './services/excel-parser.service';
import { ImportValidationService } from './services/import-validation.service';
import { ImportSessionService } from './services/import-session.service';
import { Department } from '../entities/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Department])],
  controllers: [DepartmentsController],
  providers: [
    DepartmentsService,
    ImportService,
    ExcelParserService,
    ImportValidationService,
    ImportSessionService,
  ],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
