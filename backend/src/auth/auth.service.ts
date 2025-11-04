import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { User, AuthProvider } from '../entities/user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await this.usersService.validatePassword(user, password);

    if (!isPasswordValid) {
      return null;
    }

    // Remove password from user object
    const { password: userPassword, refreshToken, ...result } = user;
    return result;
  }

  async login(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'default-secret-key'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '30m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'default-refresh-secret'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Update user's refresh token and last login
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    // Remove sensitive data from user object
    const { password, refreshToken: _, ...userWithoutSensitiveData } = user;

    return {
      user: {
        ...userWithoutSensitiveData,
        fullName: user.fullName, // Include the getter property
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'default-refresh-secret'),
      });

      const user = await this.usersService.findByEmail(payload.email);

      if (!user || !user.isActive || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload: JwtPayload = {
        email: user.email,
        sub: user.id
      };

      const accessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET', 'default-secret-key'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '30m'),
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async googleLogin(profile: any): Promise<AuthResponseDto> {
    const { id, emails, name } = profile;
    const email = emails[0].value;

    let user = await this.usersService.findByEmail(email);

    if (user) {
      // User exists, update Google ID if not set
      if (!user.googleId) {
        await this.usersService.updateGoogleId(user.id, id);
        user.googleId = id;
        user.authProvider = AuthProvider.GOOGLE;
      }
    } else {
      // User doesn't exist, return error since we only allow existing users
      throw new UnauthorizedException('User not found. Please contact administrator.');
    }

    return this.login(user);
  }

  async getUserPermissions(userId: string, organizationId?: string) {
    // Get user roles with permissions
    const userRoles = await this.rolesService.getUserRoles(userId, organizationId);

    return {
      userId,
      organizationId,
      roles: userRoles.map(userRole => ({
        id: userRole.role.id,
        name: userRole.role.name,
        organizationId: userRole.organizationId,
        permissions: userRole.role.permissions.filter(p => p.isActive),
      })),
    };
  }
}
