import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Param, 
  Body, 
  UseGuards, 
  Request,
  HttpException,
  HttpStatus 
} from '@nestjs/common';
import { PayosConfigService, CreatePayOSConfigDto, UpdatePayOSConfigDto } from '../services/payos-config.service';

@Controller('organizations/:organizationId/payos-config')
export class PayosConfigController {
  constructor(private readonly payosConfigService: PayosConfigService) {}

  /**
   * Get PayOS configuration for organization
   */
  @Get()
  async getConfig(@Param('organizationId') organizationId: string) {
    try {
      const config = await this.payosConfigService.getConfig(organizationId);
      
      if (!config) {
        return {
          success: false,
          message: 'Chưa có cấu hình PayOS cho tổ chức này',
          data: null
        };
      }

      // Don't return sensitive information in full
      return {
        success: true,
        message: 'Lấy cấu hình PayOS thành công',
        data: {
          id: config.id,
          organizationId: config.organizationId,
          clientId: config.clientId,
          // Mask sensitive fields
          apiKey: this.maskSensitiveData(config.apiKey),
          checksumKey: this.maskSensitiveData(config.checksumKey),
          isActive: config.isActive,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        }
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Không thể lấy cấu hình PayOS',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create PayOS configuration for organization
   */
  @Post()
  async createConfig(
    @Param('organizationId') organizationId: string,
    @Body() createDto: Omit<CreatePayOSConfigDto, 'organizationId'>
  ) {
    try {
      const fullCreateDto: CreatePayOSConfigDto = {
        ...createDto,
        organizationId
      };

      const config = await this.payosConfigService.createConfig(fullCreateDto);

      return {
        success: true,
        message: 'Tạo cấu hình PayOS thành công',
        data: {
          id: config.id,
          organizationId: config.organizationId,
          clientId: config.clientId,
          apiKey: this.maskSensitiveData(config.apiKey),
          checksumKey: this.maskSensitiveData(config.checksumKey),
          isActive: config.isActive,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        }
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Không thể tạo cấu hình PayOS',
          error: error.message
        },
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Update PayOS configuration for organization
   */
  @Put()
  async updateConfig(
    @Param('organizationId') organizationId: string,
    @Body() updateDto: UpdatePayOSConfigDto
  ) {
    try {
      const config = await this.payosConfigService.updateConfig(organizationId, updateDto);

      return {
        success: true,
        message: 'Cập nhật cấu hình PayOS thành công',
        data: {
          id: config.id,
          organizationId: config.organizationId,
          clientId: config.clientId,
          apiKey: this.maskSensitiveData(config.apiKey),
          checksumKey: this.maskSensitiveData(config.checksumKey),
          isActive: config.isActive,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        }
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Không thể cập nhật cấu hình PayOS',
          error: error.message
        },
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Mask sensitive data for security
   */
  private maskSensitiveData(data: string): string {
    if (!data || data.length <= 8) {
      return '****';
    }
    return data.substring(0, 4) + '*'.repeat(data.length - 8) + data.substring(data.length - 4);
  }
}
