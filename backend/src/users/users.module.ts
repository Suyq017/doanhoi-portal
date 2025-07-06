import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { Department } from '../entities/department.entity';
import { Class } from '../entities/class.entity';
import { Organization } from '../entities/organization.entity';
import { UserOrganization } from '../entities/user-organization.entity';
import { ExcelParserService } from './services/excel-parser.service';
import { ImportValidationService } from './services/import-validation.service';
import { ImportSessionService } from './services/import-session.service';
import { ImportService } from './services/import.service';
import { UserBatchProcessingService } from './services/batch-processing.service';
import { UserTransactionService } from './services/transaction.service';
import { UserImportMonitoringService } from './services/monitoring.service';
import { UserBackgroundJobService } from './services/background-job.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Department, Class, Organization, UserOrganization])],
  controllers: [UsersController],
  providers: [
    UsersService,
    ExcelParserService,
    ImportValidationService,
    ImportSessionService,
    ImportService,
    UserBatchProcessingService,
    UserTransactionService,
    UserImportMonitoringService,
    UserBackgroundJobService
  ],
  exports: [UsersService],
})
export class UsersModule {}
