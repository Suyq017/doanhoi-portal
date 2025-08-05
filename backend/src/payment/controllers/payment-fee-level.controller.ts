import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { PaymentFeeLevelService } from '../services/payment-fee-level.service';
import { CreatePaymentFeeLevelDto } from '../dto/create-payment-fee-level.dto';
import { UpdatePaymentFeeLevelDto } from '../dto/update-payment-fee-level.dto';

@Controller('payment-fee-levels')
export class PaymentFeeLevelController {
  constructor(private readonly feeLevelService: PaymentFeeLevelService) {}

  @Post()
  create(@Body() createDto: CreatePaymentFeeLevelDto) {
    return this.feeLevelService.create(createDto);
  }

  @Get('campaign/:campaignId')
  findByCampaign(@Param('campaignId') campaignId: string) {
    return this.feeLevelService.findByCampaign(campaignId);
  }

  @Get('campaign/:campaignId/default')
  getDefaultForCampaign(@Param('campaignId') campaignId: string) {
    return this.feeLevelService.getDefaultForCampaign(campaignId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.feeLevelService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePaymentFeeLevelDto) {
    return this.feeLevelService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feeLevelService.remove(id);
  }

  @Post(':id/set-default')
  setAsDefault(@Param('id') id: string) {
    return this.feeLevelService.setAsDefault(id);
  }

  @Put('campaign/:campaignId/reorder')
  reorder(
    @Param('campaignId') campaignId: string,
    @Body('feeLevelIds') feeLevelIds: string[]
  ) {
    return this.feeLevelService.reorder(campaignId, feeLevelIds);
  }
}
