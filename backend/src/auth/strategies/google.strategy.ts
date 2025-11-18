import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      console.log('Google OAuth profile received:', {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName
      });
      
      const result = await this.authService.googleLogin(profile);
      console.log('Google OAuth login successful:', result.user.email);
      return done(null, result);
    } catch (error) {
      console.error('Google OAuth validation error:', error.message);
      
      // If user not found, return error object instead of throwing
      if (error.message.includes('User not found')) {
        return done(null, { error: 'user_not_found', message: error.message });
      }
      
      return done(error, null);
    }
  }
}
