import { Injectable } from '@nestjs/common';
import { MlClientService } from './ml-client.service';

@Injectable()
export class VectorSyncService {
  constructor(private readonly mlClientService: MlClientService) {}

  async syncBusiness(business: any): Promise<void> {
    const records = this.buildBusinessRecords(business);
    
    if (records.length === 0) return;

    try {
      await this.mlClientService.feedVector({
        business_id: business._id,
        records,
        metadata: { entity_type: 'business' },
      });
      console.log(`✅ Business ${business._id} synced to ML service`);
    } catch (error) {
      console.error(`❌ Failed to sync business ${business._id}:`, error);
      throw error;
    }
  }

  async syncProduct(product: any): Promise<void> {
    try {
      await this.mlClientService.feedVector({
        business_id: product.business_id,
        records: [this.buildProductRecord(product)],
        metadata: { entity_type: 'product' },
      });
      console.log(`✅ Product ${product._id} synced to ML service`);
    } catch (error) {
      console.error(`❌ Failed to sync product ${product._id}:`, error);
      throw error;
    }
  }

  async deleteProduct(productId: string, businessId: string): Promise<void> {
    try {
      await this.mlClientService.feedVector({
        business_id: businessId,
        records: [
          {
            field: `product_${productId}`,
            content: '',
            metadata: { deleted: true, deleted_at: new Date().toISOString() },
            id: productId,
          },
        ],
        metadata: { entity_type: 'product', action: 'delete' },
      });
      console.log(`✅ Product ${productId} deletion synced to ML service`);
    } catch (error) {
      console.error(`❌ Failed to sync product deletion ${productId}:`, error);
      throw error;
    }
  }

  private buildBusinessRecords(business: any): any[] {
    const records = [];
    const fieldMappings = {
      name: business.name,
      description: business.description,
      phoneNumber: business.phone_number,
      email: business.email,
      address: business.address,
      website: business.website,
      industry: business.industry,
    };

    for (const [field, value] of Object.entries(fieldMappings)) {
      if (value) {
        records.push({
          field,
          content: String(value),
          metadata: {},
          id: `${business._id}_${field}`,
        });
      }
    }

    return records;
  }

  private buildProductRecord(product: any): any {
    const contentParts = [
      `Product: ${product.name}`,
      product.description && `Description: ${product.description}`,
      `Price: ${product.price} ${product.currency}`,
      product.sku && `SKU: ${product.sku}`,
      product.category && `Category: ${product.category}`,
      `Stock: ${product.stock}`,
    ].filter(Boolean);

    return {
      field: `product_${product._id}`,
      content: contentParts.join('. '),
      metadata: {
        product_id: product._id,
        category: product.category,
        price: product.price,
        currency: product.currency,
        is_active: product.is_active,
      },
      id: product._id,
    };
  }
}