import { randomUUID } from 'crypto';
import { HydratedDocument, Schema, model } from 'mongoose';

export interface Lead {
  _id: string; // UUID
  provider: string; // e.g., 'twilio'
  provider_user_id: string; // origin platform user id
  display_name?: string;
  created_at?: Date;
}

export type LeadDocument = HydratedDocument<Lead>;

export const LeadSchema = new Schema<Lead>(
  {
    _id: { type: String, default: () => randomUUID() },
    provider: { type: String, required: true },
    provider_user_id: { type: String, required: true },
    display_name: { type: String },
  },
  {
    collection: 'leads',
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  },
);

LeadSchema.index({ provider: 1, provider_user_id: 1 }, { unique: true });

export const LeadModel = model<Lead>('Lead', LeadSchema);
