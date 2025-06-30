import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { Organization } from '../entities/organization.entity';
import { UserOrganization } from '../entities/user-organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, UserOrganization])],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule { }
