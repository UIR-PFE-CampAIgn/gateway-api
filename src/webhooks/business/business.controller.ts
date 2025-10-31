import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto, UpdateBusinessDto } from './types';

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  /**
   * POST /businesses
   * Create a new business
   */
  @Post()
  async create(
    @Query('userId') userId: string, // Temporary - replace with auth decorator
    @Body() createBusinessDto: CreateBusinessDto,
  ) {
    return await this.businessService.create(userId, createBusinessDto);
  }

  /**
   * GET /businesses
   * Get all businesses for a user
   */
  @Get()
  async findAll(@Query('userId') userId: string) {
    return await this.businessService.findAll(userId);
  }

  /**
   * GET /businesses/:id
   * Get a specific business
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Query('userId') userId: string) {
    return await this.businessService.findById(id, userId);
  }

  /**
   * PUT /businesses/:id
   * Update a business
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    return await this.businessService.update(id, userId, updateBusinessDto);
  }

  /**
   * DELETE /businesses/:id
   * Delete a business
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Query('userId') userId: string) {
    await this.businessService.delete(id, userId);
    return { message: 'Business deleted successfully' };
  }

  /**
   * PATCH /businesses/:id/deactivate
   * Deactivate a business
   */
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string, @Query('userId') userId: string) {
    return await this.businessService.deactivate(id, userId);
  }

  /**
   * PATCH /businesses/:id/activate
   * Activate a business
   */
  @Patch(':id/activate')
  async activate(@Param('id') id: string, @Query('userId') userId: string) {
    return await this.businessService.activate(id, userId);
  }
}
