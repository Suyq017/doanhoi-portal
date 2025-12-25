import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { CtxhActivity } from "../../entities/ctxh-activity.entity";
import { CtxhCategory } from "../../entities/ctxh-category.entity";
import { CtxhLimitConfig } from "../../entities/ctxh-limit-config.entity";
import { CtxhParticipation } from "../../entities/ctxh-participation.entity";
import { User } from "../../entities/user.entity";
import { Organization } from "../../entities/organization.entity";
import { ActivitiesController } from "./activities.controller";
import { ActivitiesService } from "./activities.service";
import { ParticipationService } from "./services/participation.service";
import { ExcelService } from "./services/excel.service";
import { ExcelParserService } from "../../users/services/excel-parser.service";
import { RolesModule } from "../../roles/roles.module";
import { OrganizationsModule } from "../../organizations/organizations.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CtxhActivity,
      CtxhCategory,
      CtxhLimitConfig,
      CtxhParticipation,
      User,
      Organization,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
    RolesModule, // Required for PermissionGuard
    OrganizationsModule, // Required for organization access filtering
  ],
  controllers: [ActivitiesController],
  providers: [
    ActivitiesService,
    ParticipationService,
    ExcelService,
    ExcelParserService,
  ],
  exports: [ActivitiesService, ParticipationService],
})
export class ActivitiesModule {}
