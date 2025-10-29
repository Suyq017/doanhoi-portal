import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
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
import { ImportService } from './services/import.service'; // Enhanced with 18-column & organization auto-creation
import { UserBatchProcessingService } from './services/batch-processing.service';
import { UserTransactionService } from './services/transaction.service';
import { UserImportMonitoringService } from './services/monitoring.service';
import { UserBackgroundJobService } from './services/background-job.service';
import { BatchImportService } from './services/batch-import.service'; // NEW: Client-side batch processing
import { RolesModule } from '../roles/roles.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CleanEmptyStringsMiddleware } from '../common/middleware/clean-empty-strings.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Department, Class, Organization, UserOrganization]),
    RolesModule,
    OrganizationsModule
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    ExcelParserService,
    ImportValidationService,
    ImportSessionService,
    ImportService, // Enhanced with all advanced features
    UserBatchProcessingService,
    UserTransactionService,
    UserImportMonitoringService,
    UserBackgroundJobService,
    BatchImportService // NEW: Client-side batch processing service
  ],
  exports: [UsersService],
})
export class UsersModule { }
