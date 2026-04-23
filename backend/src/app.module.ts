import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { BullModule } from "@nestjs/bull";
import { ScheduleModule } from "@nestjs/schedule";
import { UsersModule } from "./users/users.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { AuthModule } from "./auth/auth.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DepartmentsModule } from "./departments/departments.module";
import { ClassesModule } from "./classes/classes.module";
import { ExportModule } from "./export/export.module";
import { RolesModule } from "./roles/roles.module";
import { CleanEmptyStringsMiddleware } from "./common/middleware/clean-empty-strings.middleware";
import { PaymentModule } from "./payment/payment.module";
import { PayosModule } from "./payos/payos.module";
import { CtxhModule } from "./ctxh/ctxh.module";
import { CtxhChatModule } from "./ctxh-chat/ctxh-chat.module";
import { CtxhMcpModule } from "./ctxh-mcp/ctxh-mcp.module";
import { MetricsModule } from "./metrics/metrics.module";
import { AwsS3ConfigModule } from "./aws-config/aws-s3-config.module";
import { TemplatesModule } from "./templates/templates.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DB_HOST"),
        port: configService.get("DB_PORT"),
        username: configService.get("DB_USERNAME"),
        password: configService.get("DB_PASSWORD"),
        database: configService.get("DB_NAME"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: true,
        logging: configService.get("NODE_ENV") === "development",
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    OrganizationsModule,
    AuthModule,
    DashboardModule,
    DepartmentsModule,
    ClassesModule,
    ExportModule,
    RolesModule,
    PaymentModule,
    PayosModule,
    CtxhModule,
    CtxhChatModule,
    CtxhMcpModule,
    MetricsModule,
    AwsS3ConfigModule,
    TemplatesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CleanEmptyStringsMiddleware).forRoutes("*");
  }
}
