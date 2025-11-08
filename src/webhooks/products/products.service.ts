import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../database/repositories/product.repository';
import { VectorSyncService } from '../../clients/ml/vector-sync.service';
import { CreateProductDto, UpdateProductDto, ProductResponse } from './types';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly vectorSyncService: VectorSyncService,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductResponse> {
    const product = await this.productRepository.create({
      business_id: dto.business_id,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      currency: dto.currency || 'USD',
      sku: dto.sku,
      stock: dto.stock ?? 0,
      category: dto.category,
      is_active: true,
    });

    // Sync to ML service
    await this.vectorSyncService.syncProduct(product).catch((error) => {
      console.warn(`⚠️ Vector sync failed for product ${product._id}`, error);
    });

    return this.format(product);
  }

  async findAll(
    businessId: string,
    category?: string,
    search?: string,
  ): Promise<ProductResponse[]> {
    let products;

    if (search) {
      products = await this.productRepository.searchProducts(
        businessId,
        search,
      );
    } else if (category && category !== 'all') {
      products = await this.productRepository.findByCategory(
        businessId,
        category,
      );
    } else {
      products = await this.productRepository.findByBusiness(businessId);
    }

    return products.map((p) => this.format(p));
  }

  async findOne(id: string, businessId?: string): Promise<ProductResponse> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (businessId && product.business_id !== businessId) {
      throw new NotFoundException('Product not found');
    }
    return this.format(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponse> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const updated = await this.productRepository.updateById(id, dto as any);

    // Sync to ML service
    await this.vectorSyncService.syncProduct(updated).catch((error) => {
      console.warn(`⚠️ Vector sync failed for product ${updated._id}`, error);
    });

    return this.format(updated);
  }

  async delete(id: string): Promise<{ message: string }> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Notify ML service about deletion
    await this.vectorSyncService
      .deleteProduct(product._id, product.business_id)
      .catch((error) => {
        console.warn(
          `⚠️ Vector sync deletion failed for product ${product._id}`,
          error,
        );
      });

    await this.productRepository.delete(id);
    return { message: 'Product deleted successfully' };
  }

  private format(product: any): ProductResponse {
    return {
      id: product._id,
      business_id: product.business_id,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      sku: product.sku,
      stock: product.stock,
      category: product.category,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }
}
