import { Controller, Get, Query, Request } from '@nestjs/common';
import { LeadService } from './lead.service';

@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  async getAllLeads(
    @Request() req,
    @Query('search') search?: string,
    @Query('provider') provider?: string,
    @Query('limit') limit?: string,
  ) {
    const businessId = req.user?.businessId || 'default-business';

    return await this.leadService.findAll({
      businessId,
      search,
      provider,
      limit: limit ? parseInt(limit) : 100,
    });
  }

  @Get(':id')
  async getLead(@Request() req, @Query('id') id: string) {
    return await this.leadService.findOne(id);
  }
}
