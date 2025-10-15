import { Module } from '@nestjs/common';
import { CategoryModule } from './category/category.module';
import { ActivitiesModule } from './activity/activities.module';
import { LimitConfigModule } from './limit-config/limit-config.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    CategoryModule,
    ActivitiesModule,
    LimitConfigModule,
    ReportsModule,
  ],
  exports: [
    CategoryModule,
    ActivitiesModule,
    LimitConfigModule,
    ReportsModule,
  ],
})
export class CtxhModule {}