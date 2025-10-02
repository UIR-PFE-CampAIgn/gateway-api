import { NormalizedInboundMessage, TwilioWhatsAppWebhookDto } from './types';

const stripWhatsAppPrefix = (v?: string): string =>
  (v ? v.replace(/^whatsapp:/i, '') : '') as string;

const toInt = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function normalizeTwilioWhatsAppPayload(
  payload: TwilioWhatsAppWebhookDto,
): NormalizedInboundMessage | null {
  if (!payload || !payload.MessageSid || !payload.From) return null;

  const numMedia = toInt(payload.NumMedia ?? '0');

  const media: Array<{ contentType: string; url: string }> = [];
  for (let i = 0; i < numMedia; i += 1) {
    const contentType = (payload as any)[`MediaContentType${i}`];
    const url = (payload as any)[`MediaUrl${i}`];
    if (url) media.push({ contentType: String(contentType ?? ''), url: String(url) });
  }

  const message: NormalizedInboundMessage = {
    provider: 'twilio',
    channel: 'whatsapp',
    direction: 'inbound',
    messageSid: payload.MessageSid,
    accountSid: payload.AccountSid,
    from: {
      phone: stripWhatsAppPrefix(payload.From),
      waId: payload.WaId,
      name: payload.ProfileName,
    },
    to: stripWhatsAppPrefix(payload.To),
    body: payload.Body,
    numMedia,
    media,
    receivedAt: new Date().toISOString(),
    raw: payload as any,
  };

  return message;
}

