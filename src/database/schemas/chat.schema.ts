import { randomUUID } from 'crypto';
import { HydratedDocument, Schema, model } from 'mongoose';

export interface Chat {
  _id: string; // UUID
  lead_id: string; // FK to leads
  business_social_media_id: string; // FK to business_social_media
  status: string; // default 'open'
  running_summary?: string;
  last_inbound_at?: Date;
  last_outbound_at?: Date;
  message_count: number; // default 0
  created_at?: Date;
  updated_at?: Date;
}

export type ChatDocument = HydratedDocument<Chat>;

export const ChatSchema = new Schema<Chat>(
  {
    _id: { type: String, default: () => randomUUID() },
    lead_id: { type: String, required: true, index: true },
    business_social_media_id: { type: String, required: true, index: true },
    status: { type: String, default: 'open', required: true, index: true },
    running_summary: { type: String },
    last_inbound_at: { type: Date },
    last_outbound_at: { type: Date },
    message_count: { type: Number, default: 0 },
  },
  {
    collection: 'chats',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

export const ChatModel = model<Chat>('Chat', ChatSchema);
