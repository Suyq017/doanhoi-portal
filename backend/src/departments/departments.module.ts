import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { DepartmentsController } from "./departments.controller";
import { DepartmentsService } from "./departments.service";
import { ImportService } from "./services/import.service";
import { ExcelParserService } from "./services/excel-parser.service";
import { ImportValidationService } from "./services/import-validation.service";
import { ImportSessionService } from "./services/import-session.service";
import { DepartmentBatchProcessingService } from "./services/batch-processing.service";
import { DepartmentTransactionService } from "./services/transaction.service";
import { DepartmentBatchImportConfigService } from "./services/batch-import-config.service";
import { DepartmentBatchImportMonitoringService } from "./services/batch-import-monitoring.service";
import { Department } from "../entities/department.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Department]), ConfigModule],
  controllers: [DepartmentsController],
  providers: [
    DepartmentsService,
    ImportService,
    ExcelParserService,
    ImportValidationService,
    ImportSessionService,
    DepartmentBatchProcessingService,
    DepartmentTransactionService,
    DepartmentBatchImportConfigService,
    DepartmentBatchImportMonitoringService,
  ],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
