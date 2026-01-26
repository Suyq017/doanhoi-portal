import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import {
  AwsS3ConfigService,
  CreateAwsS3ConfigDto,
  UpdateAwsS3ConfigDto,
} from "./aws-s3-config.service";

@Controller("aws-s3-config")
@UseGuards(JwtAuthGuard)
export class AwsS3ConfigController {
  constructor(private readonly awsS3ConfigService: AwsS3ConfigService) {}

  @Get("active")
  @RequirePermissions("dashboard.access")
  async getActiveConfig() {
    return this.awsS3ConfigService.getActiveConfig();
  }

  @Get()
  @RequirePermissions("dashboard.access")
  async getAllConfigs() {
    return this.awsS3ConfigService.getAllConfigs();
  }

  @Post()
  @RequirePermissions("dashboard.access")
  async createConfig(@Body() dto: CreateAwsS3ConfigDto) {
    return this.awsS3ConfigService.createConfig(dto);
  }

  @Put(":id")
  @RequirePermissions("dashboard.access")
  async updateConfig(
    @Param("id") id: string,
    @Body() dto: UpdateAwsS3ConfigDto,
  ) {
    return this.awsS3ConfigService.updateConfig(id, dto);
  }

  @Delete(":id")
  @RequirePermissions("dashboard.access")
  async deleteConfig(@Param("id") id: string) {
    await this.awsS3ConfigService.deleteConfig(id);
    return { message: "Configuration deleted successfully" };
  }

  @Post(":id/test")
  @RequirePermissions("dashboard.access")
  async testConfig(@Param("id") id: string) {
    const isValid = await this.awsS3ConfigService.testConfig(id);
    return { success: isValid };
  }
}
