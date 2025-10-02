import { randomUUID } from 'crypto';
import { HydratedDocument, Schema, model } from 'mongoose';

export type SocialMediaPlatform = 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM';

export interface BusinessSocialMedia {
  _id: string; // UUID
  business_id: string; // FK to businesses
  platform: SocialMediaPlatform; // default 'WHATSAPP'
  page_id: string;
  page_name: string;
  page_username?: string;
  page_url?: string;
  access_token?: string;
  webhook_url?: string;
  is_verified: boolean; // default false
  is_active: boolean; // default true
  last_sync_at?: Date;
  sync_frequency_minutes?: number; // default 60
  created_at?: Date;
  updated_at?: Date;
}

export type BusinessSocialMediaDocument = HydratedDocument<BusinessSocialMedia>;

export const BusinessSocialMediaSchema = new Schema<BusinessSocialMedia>(
  {
    _id: { type: String, default: () => randomUUID() },
    business_id: { type: String, required: true, index: true },
    platform: {
      type: String,
      enum: ['WHATSAPP', 'FACEBOOK', 'INSTAGRAM'],
      default: 'WHATSAPP',
      required: true,
      index: true,
    },
    page_id: { type: String, required: true },
    page_name: { type: String, required: true },
    page_username: { type: String },
    page_url: { type: String },
    access_token: { type: String },
    webhook_url: { type: String },
    is_verified: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    last_sync_at: { type: Date },
    sync_frequency_minutes: { type: Number, default: 60 },
  },
  {
    collection: 'business_social_media',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

BusinessSocialMediaSchema.index(
  { business_id: 1, platform: 1 },
  { unique: false },
);

export const BusinessSocialMediaModel = model<BusinessSocialMedia>(
  'BusinessSocialMedia',
  BusinessSocialMediaSchema,
);
