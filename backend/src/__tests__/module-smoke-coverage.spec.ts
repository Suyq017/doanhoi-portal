import { describe, expect, it } from '@jest/globals';

import { CtxhModule } from '../ctxh/ctxh.module';
import { ActivitiesModule } from '../ctxh/activity/activities.module';
import { CategoryModule } from '../ctxh/category/category.module';
import { CtxhImportModule } from '../ctxh/import/import.module';
import { LimitConfigModule } from '../ctxh/limit-config/limit-config.module';
import { ReportsModule } from '../ctxh/reports/reports.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { PayosModule } from '../payos/payos.module';
import { TemplatesModule } from '../templates/templates.module';
import { PaymentModule } from '../payment/payment.module';
import * as CtxhIndex from '../ctxh';

describe('Module Smoke Coverage', () => {
  it('should load CTXH modules', () => {
    expect(CtxhModule).toBeDefined();
    expect(ActivitiesModule).toBeDefined();
    expect(CategoryModule).toBeDefined();
    expect(CtxhImportModule).toBeDefined();
    expect(LimitConfigModule).toBeDefined();
    expect(ReportsModule).toBeDefined();
  });

  it('should load other feature modules', () => {
    expect(DashboardModule).toBeDefined();
    expect(PayosModule).toBeDefined();
    expect(TemplatesModule).toBeDefined();
    expect(PaymentModule).toBeDefined();
  });

  it('should export ctxh surface from index', () => {
    expect(CtxhIndex).toBeDefined();
    expect(typeof CtxhIndex).toBe('object');
  });
});
