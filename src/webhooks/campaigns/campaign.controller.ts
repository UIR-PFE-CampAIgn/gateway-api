import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { CreateCampaignDto, CreateGeneratedCampaignDto } from './types';

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
  async createCampaign(
    @Body() createCampaignDto: CreateCampaignDto,
    @Body('businessId') businessId: string, // client must provide it
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    return await this.campaignService.create(businessId, createCampaignDto);
  }

  /**
   * GET /campaigns?businessId=...
   * Get all campaigns for a business
   */
  @Get()
  async getAllCampaigns(@Query('businessId') businessId: string) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    return await this.campaignService.findAll(businessId);
  }

  /**
   * GET /campaigns/:id?businessId=...
   * Get a specific campaign details
   */
  @Get(':id')
  async getCampaign(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    return await this.campaignService.findOne(id, businessId);
  }

  /**
   * GET /campaigns/:id/logs?businessId=...
   */
  @Get(':id/logs')
  async getCampaignLogs(
    @Param('id') campaignId: string,
    @Query('businessId') businessId: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    return await this.campaignService.getLogs(campaignId, businessId);
  }

  /**
   * POST /campaigns/:id/execute?businessId=...
   * Manually trigger campaign execution (useful for testing)
   */
  @Post(':id/execute')
  async executeCampaign(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    await this.campaignService.findOne(id, businessId);
    await this.schedulerService.executeCampaign(id);
    return { message: 'Campaign execution started' };
  }

  /**
   * Cancel a scheduled campaign
   */
  @Delete(':id')
  async cancelCampaign(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    return await this.campaignService.cancel(id, businessId);
  }

  @Post('generate-campaign')
  async generateCampaignPreview(
    @Body('prompt') prompt: string,
    @Body('businessId') businessId: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException('prompt is required');
    }

    return await this.campaignService.generateCampaignPreview(
      businessId,
      prompt,
    );
  }
  @Post(':businessId/generated')
  async createFromGenerated(
    @Param('businessId') businessId: string,
    @Body() dto: CreateGeneratedCampaignDto,
  ) {
    return this.campaignService.createFromGeneratedTemplate(businessId, dto);
  }
}
