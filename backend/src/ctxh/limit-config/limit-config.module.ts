import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CtxhLimitConfig } from '../../entities/ctxh-limit-config.entity';
import { Organization } from '../../entities/organization.entity';
import { LimitConfigController } from './limit-config.controller';
import { LimitConfigService } from './limit-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CtxhLimitConfig,
      Organization,
    ]),
    // RolesModule, // Không cần thiết khi không dùng PermissionGuard
  ],
  controllers: [LimitConfigController],
  providers: [LimitConfigService],
  exports: [LimitConfigService],
})
export class LimitConfigModule {}