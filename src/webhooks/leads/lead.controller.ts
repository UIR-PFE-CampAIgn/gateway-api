import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { LeadService } from './lead.service';
import { UpdateLeadScoreDto, UpdateLeadScoreResponse } from './types';

@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  async getAllLeads(
    @Request() req,
    @Query('businessId') businessIdQuery?: string,
    @Query('search') search?: string,
    @Query('provider') provider?: string,
    @Query('score') score?: 'hot' | 'warm' | 'cold',
    @Query('limit') limit?: string,
  ) {
    const businessId = businessIdQuery || req.user?.businessId;

    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }

    return await this.leadService.findAll({
      businessId,
      search,
      provider,
      score,
      limit: limit ? parseInt(limit) : 100,
    });
  }

  @Get(':id')
  async getLead(@Param('id') id: string) {
    return await this.leadService.findOne(id);
  }

  @Post('score')
  async updateLeadScore(
    @Body() updateScoreDto: UpdateLeadScoreDto,
  ): Promise<UpdateLeadScoreResponse> {
    return await this.leadService.updateScore(updateScoreDto);
  }
}
