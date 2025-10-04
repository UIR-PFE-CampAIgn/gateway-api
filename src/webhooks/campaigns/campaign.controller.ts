import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { CreateCampaignDto } from './types';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly schedulerService: CampaignSchedulerService,
  ) {}

  /**
   * POST /campaigns
   * Create and schedule a new campaign
   */
  @Post()
  async createCampaign(@Body() createCampaignDto: CreateCampaignDto) {
    // Use a default businessId for now
    const businessId = 'default-business';
    return await this.campaignService.create(businessId, createCampaignDto);
  }
  /**
   * GET /campaigns
   * Get all campaigns
   */
  @Get()
  async getAllCampaigns() {
    const businessId = 'default-business';
    return await this.campaignService.findAll(businessId);
  }

  /**
   * GET /campaigns/:id
   * Get a specific campaign details
   */
  @Get(':id')
  async getCampaign(@Param('id') id: string) {
    const businessId = 'default-business';
    return await this.campaignService.findOne(id, businessId);
  }

  /**
   * GET /campaigns/:id/logs
   * ✅ ACCEPTANCE CRITERIA: Get campaign logs showing message status
   */
  @Get(':id/logs')
  async getCampaignLogs(@Param('id') campaignId: string) {
    const businessId = 'default-business';
    return await this.campaignService.getLogs(campaignId, businessId);
  }

  /**
   * POST /campaigns/:id/execute
   * Manually trigger campaign execution (useful for testing)
   */
  @Post(':id/execute')
  async executeCampaign(@Param('id') id: string) {
    const businessId = 'default-business';
    await this.campaignService.findOne(id, businessId);

    await this.schedulerService.executeCampaign(id);
    return { message: 'Campaign execution started' };
  }

  /**
   * DELETE /campaigns/:id
   * Cancel a scheduled campaign
   */
  @Delete(':id')
  async cancelCampaign(@Param('id') id: string) {
    const businessId = 'default-business';
    return await this.campaignService.cancel(id, businessId);
  }
}
