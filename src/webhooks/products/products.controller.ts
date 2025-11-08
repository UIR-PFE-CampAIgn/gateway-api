import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './types';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }
  @Get()
  async findAll(
    @Query('businessId') businessId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }
    return this.productsService.findAll(businessId, category, search);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('businessId') businessId?: string,
  ) {
    return this.productsService.findOne(id, businessId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
