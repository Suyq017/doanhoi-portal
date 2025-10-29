import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { ImportService } from './services/import.service';
import { ExcelParserService } from './services/excel-parser.service';
import { ImportValidationService } from './services/import-validation.service';
import { ImportSessionService } from './services/import-session.service';
import { BatchProcessingService } from './services/batch-processing.service';
import { TransactionService } from './services/transaction.service';
import { ClassBatchImportService } from './services/batch-import.service';
import { Class } from '../entities/class.entity';
import { Department } from '../entities/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Class, Department])],
  controllers: [ClassesController],
  providers: [
    ClassesService,
    ImportService,
    ExcelParserService,
    ImportValidationService,
    ImportSessionService,
    BatchProcessingService,
    TransactionService,
    ClassBatchImportService,
  ],
  exports: [ClassesService],
})
export class ClassesModule { }
