import { Module } from "@nestjs/common";
import { CategoryModule } from "./category/category.module";
import { ActivitiesModule } from "./activity/activities.module";
import { LimitConfigModule } from "./limit-config/limit-config.module";
import { ReportsModule } from "./reports/reports.module";
import { CtxhImportModule } from "./import/import.module";

@Module({
  imports: [
    CategoryModule,
    ActivitiesModule,
    LimitConfigModule,
    ReportsModule,
    CtxhImportModule,
  ],
  exports: [
    CategoryModule,
    ActivitiesModule,
    LimitConfigModule,
    ReportsModule,
    CtxhImportModule,
  ],
})
export class CtxhModule {}
