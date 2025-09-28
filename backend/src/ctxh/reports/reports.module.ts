import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CtxhActivity } from '../../entities/ctxh-activity.entity';
import { CtxhCategory } from '../../entities/ctxh-category.entity';
import { CtxhParticipation } from '../../entities/ctxh-participation.entity';
import { CtxhLimitConfig } from '../../entities/ctxh-limit-config.entity';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CtxhActivity,
      CtxhCategory,
      CtxhParticipation,
      CtxhLimitConfig,
      User,
      Organization,
    ]),
    // RolesModule, // Không cần thiết khi không dùng PermissionGuard
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}