import { randomUUID } from 'crypto';
import { HydratedDocument, Schema, model } from 'mongoose';

export interface Product {
  _id: string;
  business_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  sku?: string;
  stock: number;
  category?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type ProductDocument = HydratedDocument<Product>;

export const ProductSchema = new Schema<Product>(
  {
    _id: { type: String, default: () => randomUUID() },
    business_id: { type: String, required: true, index: true },
    name: { type: String, required: true, index: true },
    description: { type: String },
    price: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    sku: { type: String, index: true },
    stock: { type: Number, default: 0 },
    category: { type: String, index: true },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    collection: 'products',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

export const ProductModel = model<Product>('Product', ProductSchema);


