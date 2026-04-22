import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from "@nestjs/common";
import { PaymentCampaignService } from "../services/payment-campaign.service";
import { CreatePaymentCampaignDto } from "../dto/create-payment-campaign.dto";
import { UpdatePaymentCampaignDto } from "../dto/update-payment-campaign.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionGuard } from "../../auth/guards/permission.guard";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { RolesService } from "../../roles/roles.service";

@Controller("payment-campaigns")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PaymentCampaignController {
  constructor(
    private readonly campaignService: PaymentCampaignService,
    private readonly rolesService: RolesService,
  ) { }

  @Post()
  @RequirePermissions("payment-campaigns.create")
  async create(
    @Body() createDto: CreatePaymentCampaignDto,
    @Request() req: any,
  ) {
    // Get user ID from JWT token - this is now required due to JwtAuthGuard
    const createdById = req.user?.id;

    if (!createdById) {
      throw new Error("User not authenticated. Please login first.");
    }

    // Validate user has permission to create campaign in specified organization
    await this.validateOrganizationPermission(
      createdById,
      createDto.organizationId,
      "payment-campaigns.create",
    );

    console.log(
      `Creating payment campaign for user: ${req.user.familyName} ${req.user.givenName} (${req.user.code}) - ID: ${createdById}`,
    );

    return this.campaignService.create(createDto, createdById);
  }

  @Get()
  @RequirePermissions("payment-campaigns.access")
  async findAll(
    @Request() req: any,
    @Query("organizationId") organizationId?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const userId = req.user.id;

    // Get accessible organization IDs for current user
    const accessibleOrgIds =
      await this.campaignService.getAccessibleOrganizations(userId);

    return this.campaignService.findAll({
      organizationId,
      status: status as any,
      search,
      startDate,
      endDate,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      accessibleOrgIds: accessibleOrgIds.length === 0 ? null : accessibleOrgIds, // Pass null for super admin
    });
  }

  @Get("accessible-organizations")
  @RequirePermissions("payment-campaigns.access")
  async getAccessibleOrganizations(@Request() req: any) {
    const userId = req.user.id;
    return this.campaignService.getAccessibleOrganizationsWithDetails(userId);
  }

  @Get(":id")
  @RequirePermissions("payment-campaigns.read")
  async findOne(@Param("id") id: string, @Request() req: any) {
    const userId = req.user.id;
    await this.validateCampaignPermission(userId, id, "payment-campaigns.read");
    return this.campaignService.findOne(id);
  }
  @Patch(":id")
  @RequirePermissions("payment-campaigns.update")
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdatePaymentCampaignDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    await this.validateCampaignPermission(
      userId,
      id,
      "payment-campaigns.update",
    );
    return this.campaignService.update(id, updateDto);
  }

  @Delete(":id")
  @RequirePermissions("payment-campaigns.delete")
  async remove(@Param("id") id: string, @Request() req: any) {
    const userId = req.user.id;
    await this.validateCampaignPermission(
      userId,
      id,
      "payment-campaigns.delete",
    );
    return this.campaignService.remove(id);
  }

  @Post(":id/activate")
  activate(@Param("id") id: string) {
    return this.campaignService.activate(id);
  }

  @Post(":id/complete")
  complete(@Param("id") id: string) {
    return this.campaignService.complete(id);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string) {
    return this.campaignService.cancel(id);
  }

  @Get(":id/statistics")
  getStatistics(@Param("id") id: string) {
    return this.campaignService.getStatistics(id);
  }

  @Get("organization/:orgId")
  findByOrganization(@Param("orgId") orgId: string) {
    return this.campaignService.findByOrganization(orgId);
  }

  // Helper method to validate organization permission
  private async validateOrganizationPermission(
    userId: string,
    organizationId: string,
    permission: string,
  ): Promise<void> {
    const hasPermission = await this.rolesService.hasPermission(
      userId,
      permission,
      organizationId,
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        `Không có quyền ${permission} trong tổ chức này`,
      );
    }
  }

  // Helper method to validate campaign permission
  private async validateCampaignPermission(
    userId: string,
    campaignId: string,
    permission: string,
  ): Promise<void> {
    const campaign = await this.campaignService.findOne(campaignId);
    if (!campaign) {
      throw new ForbiddenException("Campaign không tồn tại");
    }

    const hasPermission = await this.rolesService.hasPermission(
      userId,
      permission,
      campaign.organizationId,
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        `Không có quyền ${permission} cho campaign này`,
      );
    }
  }
}
