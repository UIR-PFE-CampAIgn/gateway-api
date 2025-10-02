export interface TwilioWhatsAppWebhookDto {
  MessageSid: string;
  AccountSid?: string;
  From: string; // e.g., "whatsapp:+2126..."
  To: string; // e.g., "whatsapp:+1415..."
  Body?: string;
  NumMedia?: string | number;
  ProfileName?: string;
  WaId?: string; // WhatsApp ID (digits only)
  SmsStatus?: string;
  [key: string]: any;
}

export interface NormalizedInboundMessage {
  provider: 'twilio';
  channel: 'whatsapp';
  direction: 'inbound';
  messageSid: string;
  accountSid?: string;
  from: {
    phone: string; // E.164 e.g., "+212..."
    waId?: string;
    name?: string;
  };
  to: string; // E.164 e.g., "+1415..."
  body?: string;
  numMedia: number;
  media: Array<{ contentType: string; url: string }>;
  receivedAt: string; // ISO timestamp
  raw: Record<string, any>;
}

