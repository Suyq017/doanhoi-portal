import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { CleanEmptyStringsMiddleware } from "../common/middleware/clean-empty-strings.middleware";

const mockImportedModule = (modulePath: string, exportName: string) => {
  jest.doMock(modulePath, () => ({
    [exportName]: class {},
  }));
};

describe("AppModule", () => {
  beforeEach(() => {
    jest.resetModules();

    mockImportedModule("../users/users.module", "UsersModule");
    mockImportedModule("../organizations/organizations.module", "OrganizationsModule");
    mockImportedModule("../auth/auth.module", "AuthModule");
    mockImportedModule("../dashboard/dashboard.module", "DashboardModule");
    mockImportedModule("../departments/departments.module", "DepartmentsModule");
    mockImportedModule("../classes/classes.module", "ClassesModule");
    mockImportedModule("../export/export.module", "ExportModule");
    mockImportedModule("../roles/roles.module", "RolesModule");
    mockImportedModule("../payment/payment.module", "PaymentModule");
    mockImportedModule("../payos/payos.module", "PayosModule");
    mockImportedModule("../ctxh/ctxh.module", "CtxhModule");
    mockImportedModule("../ctxh-chat/ctxh-chat.module", "CtxhChatModule");
    mockImportedModule("../ctxh-mcp/ctxh-mcp.module", "CtxhMcpModule");
    mockImportedModule("../metrics/metrics.module", "MetricsModule");
    mockImportedModule("../aws-config/aws-s3-config.module", "AwsS3ConfigModule");
    mockImportedModule("../templates/templates.module", "TemplatesModule");
  });

  it("should register the clean empty strings middleware for all routes", () => {
    const { AppModule } = require("../app.module");
    const routeBuilder = {
      forRoutes: jest.fn(),
    };
    const consumer = {
      apply: jest.fn().mockReturnValue(routeBuilder),
    } as any;

    new AppModule().configure(consumer);

    expect(consumer.apply).toHaveBeenCalledTimes(1);
    expect(consumer.apply.mock.calls[0][0].name).toBe(CleanEmptyStringsMiddleware.name);
    expect(routeBuilder.forRoutes).toHaveBeenCalledWith("*");
  });
});
