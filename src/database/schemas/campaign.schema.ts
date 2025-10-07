import { randomUUID } from 'crypto';
import { HydratedDocument, Schema, model } from 'mongoose';

export interface Campaign {
  _id: string;
  business_id: string;
  template_id: string;
  name: string;
  schedule_type: 'immediate' | 'scheduled' | 'recurring';
  scheduled_at?: Date;
  cron_expression?: string; // For recurring campaigns
  target_leads: string[]; // Array of lead IDs
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at?: Date;
  updated_at?: Date;
}

export type CampaignDocument = HydratedDocument<Campaign>;

export const CampaignSchema = new Schema<Campaign>(
  {
    _id: { type: String, default: () => randomUUID() },
    business_id: { type: String, required: true, index: true },
    template_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    schedule_type: {
      type: String,
      enum: ['immediate', 'scheduled', 'recurring'],
      required: true,
    },
    scheduled_at: { type: Date },
    cron_expression: { type: String },
    target_leads: { type: [String], required: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'completed', 'failed'],
      default: 'draft',
      index: true,
    },
    total_recipients: { type: Number, default: 0 },
    sent_count: { type: Number, default: 0 },
    failed_count: { type: Number, default: 0 },
  },
  {
    collection: 'campaigns',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

export const CampaignModel = model<Campaign>('Campaign', CampaignSchema);
