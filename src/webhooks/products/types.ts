export interface CreateProductDto {
  business_id: string;
  name: string;
  price: number;
  currency?: string;
  description?: string;
  sku?: string;
  stock?: number;
  category?: string;
  images?: string[];
}

export interface UpdateProductDto {
  name?: string;
  price?: number;
  currency?: string;
  description?: string;
  sku?: string;
  stock?: number;
  category?: string;
  is_active?: boolean;
}

export interface ProductResponse {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  sku?: string;
  stock: number;
  category?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}


