import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { PaymentCampaignService } from '../services/payment-campaign.service';
import { CreatePaymentCampaignDto } from '../dto/create-payment-campaign.dto';
import { UpdatePaymentCampaignDto } from '../dto/update-payment-campaign.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { v4 as uuidv4 } from 'uuid';

@Controller('payment-campaigns')
@UseGuards(JwtAuthGuard)
export class PaymentCampaignController {
  constructor(private readonly campaignService: PaymentCampaignService) { }

  @Post()
  async create(@Body() createDto: CreatePaymentCampaignDto, @Request() req: any) {
    // Get user ID from JWT token - this is now required due to JwtAuthGuard
    const createdById = req.user?.id;

    if (!createdById) {
      throw new Error('User not authenticated. Please login first.');
    }

    console.log(`Creating payment campaign for user: ${req.user.familyName} ${req.user.givenName} (${req.user.code}) - ID: ${createdById}`);

    return this.campaignService.create(createDto, createdById);
  }

  @Get()
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.campaignService.findAll({
      organizationId,
      status: status as any,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePaymentCampaignDto) {
    return this.campaignService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignService.remove(id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.campaignService.activate(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.campaignService.complete(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.campaignService.cancel(id);
  }

  @Get(':id/statistics')
  getStatistics(@Param('id') id: string) {
    return this.campaignService.getStatistics(id);
  }

  @Get('organization/:orgId')
  findByOrganization(@Param('orgId') orgId: string) {
    return this.campaignService.findByOrganization(orgId);
  }
}
