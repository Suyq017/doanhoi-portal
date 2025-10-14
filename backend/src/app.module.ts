import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DepartmentsModule } from './departments/departments.module';
import { ClassesModule } from './classes/classes.module';
import { ExportModule } from './export/export.module';
import { RolesModule } from './roles/roles.module';
import { CleanEmptyStringsMiddleware } from './common/middleware/clean-empty-strings.middleware';
import { PaymentModule } from './payment/payment.module';
import { PayosModule } from './payos/payos.module';
import { CtxhModule } from './ctxh/ctxh.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 9000),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_NAME', 'doanhoi'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }), UsersModule,
    OrganizationsModule,
    AuthModule,
    DashboardModule,
    DepartmentsModule,
    ClassesModule,
    ExportModule,
    RolesModule,
    PaymentModule,
    PayosModule, // Import module PayOS của chúng ta
    CtxhModule, // CTXH Management System Module
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CleanEmptyStringsMiddleware)
      .forRoutes('*');
  }
}
