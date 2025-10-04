import { randomUUID } from 'crypto';
import { HydratedDocument, Schema, model } from 'mongoose';

export interface MessageTemplate {
  _id: string; // UUID
  business_id: string; // FK to business
  name: string;
  content: string;
  category: string; // 'onboarding' | 'transactional' | 'follow-up' | 'promotional' | 'general'
  language: string; // default 'EN'
  variables: string[]; // extracted from {{variable}} syntax
  usage_count: number; // default 0
  last_used_at?: Date;
  is_active: boolean; // default true
  created_at?: Date;
  updated_at?: Date;
}

export type MessageTemplateDocument = HydratedDocument<MessageTemplate>;

export const MessageTemplateSchema = new Schema<MessageTemplate>(
  {
    _id: { type: String, default: () => randomUUID() },
    business_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    content: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'onboarding',
        'transactional',
        'follow-up',
        'promotional',
        'general',
      ],
      index: true,
    },
    language: { type: String, default: 'EN', required: true },
    variables: { type: [String], default: [] },
    usage_count: { type: Number, default: 0 },
    last_used_at: { type: Date },
    is_active: { type: Boolean, default: true, index: true },
  },
  {
    collection: 'message_templates',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

export const MessageTemplateModel = model<MessageTemplate>(
  'MessageTemplate',
  MessageTemplateSchema,
);
