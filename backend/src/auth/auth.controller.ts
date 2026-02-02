import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Res,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { Response } from "express";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("login")
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials",
  })
  async login(@Request() req): Promise<AuthResponseDto> {
    return this.authService.login(req.user);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({
    status: 200,
    description: "Token refreshed successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid refresh token",
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout user" })
  @ApiResponse({
    status: 200,
    description: "Logout successful",
  })
  async logout(@Request() req): Promise<{ message: string }> {
    await this.authService.logout(req.user.id);
    return { message: "Logout successful" };
  }
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "Profile retrieved successfully",
  })
  async getProfile(@Request() req) {
    return req.user;
  }

  @Get("me/permissions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user permissions" })
  @ApiResponse({
    status: 200,
    description: "User permissions retrieved successfully",
  })
  async getCurrentUserPermissions(
    @Request() req: any,
    @Query("organizationId") organizationId?: string,
  ) {
    const userId = req.user.id;
    return this.authService.getUserPermissions(userId, organizationId);
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: "Google OAuth callback" })
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    try {
      if (!req.user) {
        console.error("No user data received from Google OAuth");
        const frontendUrl = process.env.FRONTEND_URL;
        const errorUrl = `${frontendUrl}/auth/callback?error=no_user_data`;
        return res.redirect(errorUrl);
      }

      // Check if req.user contains an error (user not found in database)
      if (req.user.error) {
        console.error("Google OAuth user validation error:", req.user.error);
        const frontendUrl = process.env.FRONTEND_URL;
        const errorUrl = `${frontendUrl}/auth/callback?error=user_not_found`;
        return res.redirect(errorUrl);
      }

      const { accessToken, refreshToken } = req.user;

      if (!accessToken || !refreshToken) {
        console.error("Missing tokens from Google OAuth response");
        const frontendUrl = process.env.FRONTEND_URL;
        const errorUrl = `${frontendUrl}/auth/callback?error=missing_tokens`;
        return res.redirect(errorUrl);
      }

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL;
      const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}&refresh_token=${refreshToken}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      const frontendUrl = process.env.FRONTEND_URL;
      const errorUrl = `${frontendUrl}/auth/callback?error=callback_error`;
      return res.redirect(errorUrl);
    }
  }

  @Get("me/permissions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user permissions" })
  @ApiResponse({
    status: 200,
    description: "User permissions retrieved successfully",
  })
  async getUserPermissions(
    @Request() req,
    @Query("organizationId") organizationId?: string,
  ) {
    return this.authService.getUserPermissions(req.user.id, organizationId);
  }
}
