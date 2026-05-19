import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CtxhLimitConfig } from "../../entities/ctxh-limit-config.entity";
import { Organization } from "../../entities/organization.entity";
import { LimitConfigController } from "./limit-config.controller";
import { LimitConfigService } from "./limit-config.service";
import { RolesModule } from "../../roles/roles.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([CtxhLimitConfig, Organization]),
    RolesModule, // Cần thiết cho PermissionGuard
  ],
  controllers: [LimitConfigController],
  providers: [LimitConfigService],
  exports: [LimitConfigService],
})
export class LimitConfigModule {}
