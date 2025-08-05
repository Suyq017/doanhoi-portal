import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { PermissionGuard } from './guards/permission.guard';

@Module({
  imports: [
    UsersModule,
    RolesModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '30m')
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController], providers: [AuthService, JwtStrategy, LocalStrategy, GoogleStrategy, PermissionGuard],
  exports: [AuthService, JwtModule, PermissionGuard],
})
export class AuthModule { }
