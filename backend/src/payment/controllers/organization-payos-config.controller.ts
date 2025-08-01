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
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { 
  PayosConfigService,
  CreatePayOSConfigDto,
  UpdatePayOSConfigDto
} from '../services/payos-config.service';

@ApiTags('Organization PayOS Configuration')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationPayOSConfigController {
  constructor(
    private readonly payosConfigService: PayosConfigService,
  ) {}

  @Post(':id/payos-config')
  @ApiOperation({ summary: 'Create PayOS configuration for organization' })
  @ApiResponse({ status: 201, description: 'PayOS configuration created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid configuration data' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async createPayOSConfig(
    @Param('id') organizationId: string,
    @Body() createDto: Omit<CreatePayOSConfigDto, 'organizationId'>
  ) {
    const config = await this.payosConfigService.createConfig({
      ...createDto,
      organizationId
    });

    return {
      success: true,
      message: 'Cấu hình PayOS đã được tạo thành công',
      data: {
        id: config.id,
        organizationId: config.organizationId,
        clientId: config.clientId,
        apiKey: config.apiKey, // Không mask, lưu dữ liệu thật
        checksumKey: config.checksumKey, // Không mask, lưu dữ liệu thật
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    };
  }

  @Get(':id/payos-config')
  @ApiOperation({ summary: 'Get PayOS configuration for organization' })
  @ApiResponse({ status: 200, description: 'PayOS configuration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getPayOSConfig(@Param('id') organizationId: string) {
    const config = await this.payosConfigService.getConfig(organizationId);

    if (!config) {
      return {
        success: false,
        message: 'Không tìm thấy cấu hình PayOS cho tổ chức này',
        data: null
      };
    }

    return {
      success: true,
      data: {
        id: config.id,
        organizationId: config.organizationId,
        clientId: config.clientId,
        apiKey: config.apiKey, // Không mask, trả về dữ liệu thật
        checksumKey: config.checksumKey, // Không mask, trả về dữ liệu thật
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    };
  }

  @Get(':id/payos-config/effective')
  @ApiOperation({ summary: 'Get effective PayOS configuration (with inheritance)' })
  @ApiResponse({ status: 200, description: 'Effective PayOS configuration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No configuration found in hierarchy' })
  async getEffectivePayOSConfig(@Param('id') organizationId: string) {
    const config = await this.payosConfigService.getEffectiveConfig(organizationId);

    if (!config) {
      return {
        success: false,
        message: 'Không tìm thấy cấu hình PayOS cho tổ chức này hoặc tổ chức cha',
        data: null
      };
    }

    return {
      success: true,
      data: {
        id: config.id,
        organizationId: config.organizationId,
        clientId: config.clientId,
        apiKey: config.apiKey, // Không mask, trả về dữ liệu thật
        checksumKey: config.checksumKey, // Không mask, trả về dữ liệu thật
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        isInherited: config.organizationId !== organizationId
      }
    };
  }

  @Put(':id/payos-config')
  @ApiOperation({ summary: 'Update PayOS configuration for organization' })
  @ApiResponse({ status: 200, description: 'PayOS configuration updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid configuration data' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async updatePayOSConfig(
    @Param('id') organizationId: string,
    @Body() updateDto: UpdatePayOSConfigDto
  ) {
    const config = await this.payosConfigService.updateConfig(organizationId, updateDto);

    return {
      success: true,
      message: 'Cấu hình PayOS đã được cập nhật thành công',
      data: {
        id: config.id,
        organizationId: config.organizationId,
        clientId: config.clientId,
        apiKey: config.apiKey, // Không mask, trả về dữ liệu thật
        checksumKey: config.checksumKey, // Không mask, trả về dữ liệu thật
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    };
  }

  @Delete(':id/payos-config')
  @ApiOperation({ summary: 'Delete PayOS configuration for organization' })
  @ApiResponse({ status: 200, description: 'PayOS configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  @HttpCode(HttpStatus.OK)
  async deletePayOSConfig(@Param('id') organizationId: string) {
    await this.payosConfigService.deleteConfig(organizationId);

    return {
      success: true,
      message: 'Cấu hình PayOS đã được xóa thành công'
    };
  }

  @Post(':id/payos-config/toggle-active')
  @ApiOperation({ summary: 'Toggle PayOS configuration active status' })
  @ApiResponse({ status: 200, description: 'PayOS configuration status toggled successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async toggleActiveStatus(@Param('id') organizationId: string) {
    const config = await this.payosConfigService.toggleActive(organizationId);

    return {
      success: true,
      message: `Cấu hình PayOS đã được ${config.isActive ? 'bật' : 'tắt'}`,
      data: {
        id: config.id,
        organizationId: config.organizationId,
        isActive: config.isActive,
        updatedAt: config.updatedAt
      }
    };
  }

  @Post(':id/payos-config/test-connection')
  @ApiOperation({ summary: 'Test PayOS connection for organization' })
  @ApiResponse({ status: 200, description: 'PayOS connection test completed' })
  @ApiResponse({ status: 400, description: 'Connection test failed' })
  async testConnection(@Param('id') organizationId: string) {
    try {
      const config = await this.payosConfigService.getEffectiveConfig(organizationId);
      
      if (!config) {
        return {
          success: false,
          message: 'Không tìm thấy cấu hình PayOS cho tổ chức này',
          data: null
        };
      }

      const isValid = await this.payosConfigService.verifyCredentials(
        config.clientId, 
        config.apiKey, 
        config.checksumKey
      );

      return {
        success: isValid,
        message: isValid ? 'Kết nối PayOS thành công' : 'Kết nối PayOS thất bại',
        data: {
          organizationId,
          isConnectionValid: isValid,
          testedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Lỗi khi kiểm tra kết nối PayOS',
        error: error.message
      };
    }
  }
}
