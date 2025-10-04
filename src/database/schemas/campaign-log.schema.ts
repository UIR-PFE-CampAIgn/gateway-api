import { randomUUID } from 'crypto';
import { HydratedDocument, Schema, model } from 'mongoose';

export interface CampaignLog {
  _id: string;
  campaign_id: string;
  lead_id: string;
  chat_id: string; // ✅ ADD THIS
  message_id?: string;
  message_content: string; // ✅ ADD THIS - rendered template
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  created_at?: Date;
  updated_at?: Date;
}

export type CampaignLogDocument = HydratedDocument<CampaignLog>;

export const CampaignLogSchema = new Schema<CampaignLog>(
  {
    _id: { type: String, default: () => randomUUID() },
    campaign_id: { type: String, required: true, index: true },
    lead_id: { type: String, required: true, index: true },
    chat_id: { type: String, required: false, index: true }, // ✅ ADD THIS
    message_id: { type: String },
    message_content: { type: String, required: true }, // ✅ ADD THIS
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    error_message: { type: String },
  },
  {
    collection: 'campaign_logs',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

export const CampaignLogModel = model<CampaignLog>(
  'CampaignLog',
  CampaignLogSchema,
);
