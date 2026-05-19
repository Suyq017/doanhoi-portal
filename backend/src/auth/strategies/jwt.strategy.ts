import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../users/users.service";

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        "JWT_SECRET",
        "default-secret-key",
      ),
    });
  }
  async validate(payload: JwtPayload) {
    console.log("============================================");
    console.log(
      "🔍 JWT Strategy validate called with payload:",
      JSON.stringify(payload, null, 2),
    );
    console.log("============================================");

    // Use sub (user ID) as primary identifier, fallback to email for backward compatibility
    let user;

    if (payload.sub) {
      try {
        console.log(`🔍 Trying to find user by ID: ${payload.sub}`);
        user = await this.usersService.findOne(payload.sub);
        console.log(`✅ Found user by ID:`, { id: user.id, email: user.email });
      } catch (error) {
        console.log(`❌ User not found by ID: ${error.message}`);
        // User not found by ID, try email
      }
    }

    // Fallback to email if sub is not found
    if (!user && payload.email) {
      console.log(`🔍 Trying to find user by email: ${payload.email}`);
      user = await this.usersService.findByEmail(payload.email);
      if (user) {
        console.log(`✅ Found user by email:`, {
          id: user.id,
          email: user.email,
        });
      } else {
        console.log(`❌ User not found by email`);
      }
    }
    if (!user || !user.isActive) {
      console.log(
        `❌ User validation failed: user=${!!user}, isActive=${user?.isActive}`,
      );
      throw new UnauthorizedException("User not found or inactive");
    }

    // Remove password from user object
    const {
      password: _password,
      refreshToken: _refreshToken,
      ...userWithoutSensitiveData
    } = user;
    console.log(`✅ JWT Strategy returning user:`, {
      id: userWithoutSensitiveData.id,
      email: userWithoutSensitiveData.email,
    });
    console.log("============================================");
    return userWithoutSensitiveData;
  }
}
