import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  PaymentCampaignPayosConfigService,
  CreatePayOSConfigDto,
  UpdatePayOSConfigDto,
} from "../services/payment-campaign-payos-config.service";

@ApiTags("Payment Campaign PayOS Configuration")
@Controller("payment-campaigns")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentCampaignPayOSConfigController {
  constructor(
    private readonly payosConfigService: PaymentCampaignPayosConfigService,
  ) {}

  @Post(":id/payos-config")
  @ApiOperation({ summary: "Create PayOS configuration for payment campaign" })
  @ApiResponse({
    status: 201,
    description: "PayOS configuration created successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid configuration data" })
  @ApiResponse({ status: 404, description: "Payment campaign not found" })
  async createPayOSConfig(
    @Param("id") campaignId: string,
    @Body() createDto: Omit<CreatePayOSConfigDto, "campaignId">,
    @Request() req: any,
  ) {
    const config = await this.payosConfigService.createConfig({
      ...createDto,
      campaignId,
      userId: req.user.id, // Get user ID from JWT token
    });

    return {
      success: true,
      message: "Cấu hình PayOS đã được tạo thành công",
      data: {
        id: config.id,
        campaignId: config.campaignId,
        organizationId: config.organizationId,
        userId: config.userId,
        clientId: config.clientId,
        apiKey: config.apiKey,
        checksumKey: config.checksumKey,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    };
  }

  @Get(":id/payos-config")
  @ApiOperation({ summary: "Get PayOS configuration for payment campaign" })
  @ApiResponse({
    status: 200,
    description: "PayOS configuration retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Configuration not found" })
  async getPayOSConfig(@Param("id") campaignId: string) {
    const config = await this.payosConfigService.getConfig(campaignId);

    if (!config) {
      return {
        success: false,
        message: "Không tìm thấy cấu hình PayOS cho đợt thanh toán này",
        data: null,
      };
    }

    return {
      success: true,
      data: {
        id: config.id,
        campaignId: config.campaignId,
        organizationId: config.organizationId,
        userId: config.userId,
        clientId: config.clientId,
        apiKey: config.apiKey,
        checksumKey: config.checksumKey,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    };
  }

  @Get(":id/payos-config/effective")
  @ApiOperation({
    summary:
      "Get effective PayOS configuration (with inheritance from organization hierarchy)",
  })
  @ApiResponse({
    status: 200,
    description: "Effective PayOS configuration retrieved successfully",
  })
  @ApiResponse({
    status: 404,
    description: "No configuration found in hierarchy",
  })
  async getEffectivePayOSConfig(@Param("id") campaignId: string) {
    const config = await this.payosConfigService.getEffectiveConfig(campaignId);

    if (!config) {
      return {
        success: false,
        message:
          "Không tìm thấy cấu hình PayOS cho đợt thanh toán này hoặc các tổ chức cha",
        data: null,
      };
    }

    return {
      success: true,
      data: {
        id: config.id,
        campaignId: config.campaignId,
        organizationId: config.organizationId,
        userId: config.userId,
        clientId: config.clientId,
        apiKey: config.apiKey,
        checksumKey: config.checksumKey,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        isInherited: config.campaignId !== campaignId, // Indicates if config is inherited from parent
      },
    };
  }

  @Put(":id/payos-config")
  @ApiOperation({ summary: "Update PayOS configuration for payment campaign" })
  @ApiResponse({
    status: 200,
    description: "PayOS configuration updated successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid configuration data" })
  @ApiResponse({ status: 404, description: "Configuration not found" })
  async updatePayOSConfig(
    @Param("id") campaignId: string,
    @Body() updateDto: UpdatePayOSConfigDto,
  ) {
    const config = await this.payosConfigService.updateConfig(
      campaignId,
      updateDto,
    );

    return {
      success: true,
      message: "Cấu hình PayOS đã được cập nhật thành công",
      data: {
        id: config.id,
        campaignId: config.campaignId,
        organizationId: config.organizationId,
        userId: config.userId,
        clientId: config.clientId,
        apiKey: config.apiKey,
        checksumKey: config.checksumKey,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    };
  }

  @Delete(":id/payos-config")
  @ApiOperation({ summary: "Delete PayOS configuration for payment campaign" })
  @ApiResponse({
    status: 200,
    description: "PayOS configuration deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Configuration not found" })
  @HttpCode(HttpStatus.OK)
  async deletePayOSConfig(@Param("id") campaignId: string) {
    await this.payosConfigService.deleteConfig(campaignId);

    return {
      success: true,
      message: "Cấu hình PayOS đã được xóa thành công",
    };
  }

  @Post(":id/payos-config/toggle-active")
  @ApiOperation({ summary: "Toggle PayOS configuration active status" })
  @ApiResponse({
    status: 200,
    description: "PayOS configuration status toggled successfully",
  })
  @ApiResponse({ status: 404, description: "Configuration not found" })
  async toggleActiveStatus(@Param("id") campaignId: string) {
    const config = await this.payosConfigService.toggleActive(campaignId);

    return {
      success: true,
      message: `Cấu hình PayOS đã được ${config.isActive ? "bật" : "tắt"}`,
      data: {
        id: config.id,
        campaignId: config.campaignId,
        isActive: config.isActive,
        updatedAt: config.updatedAt,
      },
    };
  }

  @Post(":id/payos-config/test-connection")
  @ApiOperation({ summary: "Test PayOS connection for payment campaign" })
  @ApiResponse({ status: 200, description: "PayOS connection test completed" })
  @ApiResponse({ status: 400, description: "Connection test failed" })
  async testConnection(@Param("id") campaignId: string) {
    try {
      const config =
        await this.payosConfigService.getEffectiveConfig(campaignId);

      if (!config) {
        return {
          success: false,
          message: "Không tìm thấy cấu hình PayOS cho đợt thanh toán này",
          data: null,
        };
      }

      const isValid = await this.payosConfigService.verifyCredentials(
        config.clientId,
        config.apiKey,
        config.checksumKey,
      );

      return {
        success: isValid,
        message: isValid
          ? "Kết nối PayOS thành công"
          : "Kết nối PayOS thất bại",
        data: {
          campaignId,
          isConnectionValid: isValid,
          testedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Lỗi khi kiểm tra kết nối PayOS",
        error: error.message,
      };
    }
  }
}
