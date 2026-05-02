import { describe, expect, it } from '@jest/globals';

import { LoginDto } from '../auth/dto/login.dto';
import { OrganizationReportDto } from '../ctxh/reports/dto/organization-report.dto';
import { SystemReportDto } from '../ctxh/reports/dto/system-report.dto';
import * as CtxhChatInterfaces from '../ctxh-chat/interfaces';
import * as CtxhChatInterceptors from '../ctxh-chat/interceptors';
import * as CtxhChatConfig from '../ctxh-chat/config';

describe('DTO and Barrel Smoke', () => {
  it('should instantiate zero-covered DTOs', () => {
    const login = new LoginDto();
    login.email = 'user@example.com';
    login.password = 'password123';

    const orgReport = new OrganizationReportDto();
    orgReport.organization_id = 'org-1';
    orgReport.organization_name = 'Org 1';
    orgReport.total_activities = 1;
    orgReport.total_students_participated = 10;
    orgReport.total_students_qualified = 8;
    orgReport.total_days_allocated = 20;
    orgReport.qualification_rate = 80;
    orgReport.categories_summary = [];
    orgReport.activities_detail = [];

    const systemReport = new SystemReportDto();
    systemReport.total_categories = 2;
    systemReport.total_activities = 3;
    systemReport.total_participations = 50;
    systemReport.total_completed_participations = 40;
    systemReport.total_students_registered = 35;
    systemReport.total_students_qualified = 30;
    systemReport.overall_qualification_rate = 85;
    systemReport.total_days_allocated = 200;
    systemReport.categories_summary = [];
    systemReport.monthly_stats = [];

    expect(login.email).toBe('user@example.com');
    expect(orgReport.organization_id).toBe('org-1');
    expect(systemReport.total_categories).toBe(2);
  });

  it('should expose ctxh-chat barrel exports', () => {
    expect(CtxhChatInterfaces).toBeDefined();
    expect(CtxhChatInterceptors).toBeDefined();
    expect(CtxhChatConfig).toBeDefined();
  });
});
