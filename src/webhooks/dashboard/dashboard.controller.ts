import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStats } from './types';
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getDashboardStats(
    @Query('userId') userId: string,
    @Query('days') days?: string,
  ): Promise<DashboardStats> {
    const daysNumber = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getOverallStats(userId, daysNumber);
  }

}