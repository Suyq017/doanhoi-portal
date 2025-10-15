import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationImportService } from './services/import.service';
import { OrganizationBatchImportService } from './services/batch-import.service';
import { OrganizationExcelParserService } from './services/excel-parser.service';
import { OrganizationImportValidationService } from './services/import-validation.service';
import { OrganizationImportSessionService } from './services/import-session.service';
import { Organization } from '../entities/organization.entity';
import { UserOrganization } from '../entities/user-organization.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, UserOrganization, User])],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationImportService,
    OrganizationBatchImportService,
    OrganizationExcelParserService,
    OrganizationImportValidationService,
    OrganizationImportSessionService
  ],
  exports: [
    OrganizationsService,
    OrganizationImportService,
    OrganizationBatchImportService,
    OrganizationExcelParserService,
    OrganizationImportValidationService,
    OrganizationImportSessionService
  ],
})
export class OrganizationsModule { }
