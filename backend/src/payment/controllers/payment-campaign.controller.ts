import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { PaymentCampaignService } from '../services/payment-campaign.service';
import { CreatePaymentCampaignDto } from '../dto/create-payment-campaign.dto';
import { UpdatePaymentCampaignDto } from '../dto/update-payment-campaign.dto';
import { v4 as uuidv4 } from 'uuid';

@Controller('payment-campaigns')
export class PaymentCampaignController {
  constructor(private readonly campaignService: PaymentCampaignService) {}

  @Post()
  create(@Body() createDto: CreatePaymentCampaignDto, @Request() req: any) {
    // TODO: Get user ID from JWT token - using generated UUID for now
    const createdById = req.user?.id || "b1982741-6d51-4c5d-9723-4192eb6d2512";
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
