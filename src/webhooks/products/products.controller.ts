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
  async create(@Body() body: any) {
    const business_id = body.business_id;
    if (!business_id) {
      throw new BadRequestException('business_id is required');
    }

    const dto: CreateProductDto = {
      business_id,
      name: body.name,
      price: Number(body.price),
      currency: body.currency,
      description: body.description,
      sku: body.sku,
      stock: body.stock !== undefined ? Number(body.stock) : undefined,
      category: body.category,
    };

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
