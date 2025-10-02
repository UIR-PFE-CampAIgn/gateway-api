import { randomUUID } from 'crypto';
import { HydratedDocument, Schema, model } from 'mongoose';

export interface Business {
  _id: string; // UUID
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string; // default 'UTC'
  logo_url?: string;
  is_active?: boolean; // default true
  user_id: string; // FK to users.user_id (Supabase)
  created_at?: Date;
  updated_at?: Date;
}

export type BusinessDocument = HydratedDocument<Business>;

export const BusinessSchema = new Schema<Business>(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true },
    description: { type: String },
    industry: { type: String },
    website: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    timezone: { type: String, default: 'UTC' },
    logo_url: { type: String },
    is_active: { type: Boolean, default: true },
    user_id: { type: String, required: true, index: true },
  },
  {
    collection: 'businesses',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

export const BusinessModel = model<Business>('Business', BusinessSchema);
