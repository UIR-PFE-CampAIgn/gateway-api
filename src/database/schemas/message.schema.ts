import { randomUUID } from 'crypto';
import { HydratedDocument, Schema, model, SchemaTypes } from 'mongoose';

export type MessageDirection = 'inbound' | 'outbound';
export type MessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'button';

export interface Message {
  _id: string;
  chat_id: string;
  direction: MessageDirection;
  msg_type: MessageType;
  text?: string;
  payload?: Record<string, any>;
  provider_message_id?: string;
  ai_reply: boolean;
  ai_model?: string;
  ai_confidence?: number;
  created_at?: Date;
  campaign_id?: string;
}

export type MessageDocument = HydratedDocument<Message>;

export const MessageSchema = new Schema<Message>(
  {
    _id: { type: String, default: () => randomUUID() },
    chat_id: { type: String, required: true, index: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    msg_type: {
      type: String,
      enum: [
        'text',
        'image',
        'document',
        'audio',
        'video',
        'sticker',
        'location',
        'contacts',
        'button',
      ],
      default: 'text',
      required: true,
    },
    text: { type: String },
    payload: { type: SchemaTypes.Mixed },
    provider_message_id: { type: String },
    ai_reply: { type: Boolean, default: false },
    ai_model: { type: String },
    ai_confidence: { type: Number },
    campaign_id: { type: String, index: true }, // ✅ ADD THIS LINE
  },
  {
    collection: 'messages',
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  },
);

export const MessageModel = model<Message>('Message', MessageSchema);
