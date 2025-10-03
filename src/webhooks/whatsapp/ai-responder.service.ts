import { Injectable, Logger } from '@nestjs/common';
import { NormalizedInboundMessage } from './types';
import { MessagesRepository } from '../../database/repositories/message.repository';
import { ChatsRepository } from '../../database/repositories/chat.repository';
import { TwilioSenderService } from './twilio.sender';

@Injectable()
export class AiResponderService {
  private readonly logger = new Logger(AiResponderService.name);

  constructor(
    private readonly messagesRepo: MessagesRepository,
    private readonly chatsRepo: ChatsRepository,
    private readonly twilioSender: TwilioSenderService,
  ) {}

  scheduleAutoReply(
    n: NormalizedInboundMessage,
    chatId: string,
    fromNumber: string,
  ): void {
    // Run after response is sent to Twilio webhook (non-blocking)
    setImmediate(() => {
      this.generateAndSendReply(n, chatId, fromNumber).catch((e) =>
        this.logger.error(`Auto-reply failed: ${(e as Error).message}`),
      );
    });
  }

  private async generateAndSendReply(
    n: NormalizedInboundMessage,
    chatId: string,
    fromNumber: string,
  ): Promise<void> {
    const baseUrl =
      process.env.ML_SERVICE_URL || process.env.CAMPAIGN_ML_SERVICE_URL;
    if (!baseUrl) {
      this.logger.warn('ML service URL not set; skipping auto-reply');
      return;
    }

    let answer = '';
    let model: string | undefined;
    let confidence: number | undefined;
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: n.body || '',
          provider: n.provider,
          channel: n.channel,
          from: n.from,
          to: n.to,
          context: { chat_id: chatId },
        }),
      });
      if (!res.ok) throw new Error(`ML responded ${res.status}`);
      const data: any = await res.json();
      answer = String(data?.answer ?? '');
      model = data?.model ? String(data.model) : undefined;
      const conf = Number(data?.confidence);
      confidence = Number.isFinite(conf) ? conf : undefined;
    } catch (e) {
      this.logger.warn(`ML service call failed: ${(e as Error).message}`);
      return; // Do not send anything if ML fails; could fallback later
    }

    if (!answer) {
      this.logger.warn('ML returned empty answer; skipping send');
      return;
    }

    // Persist outbound AI message
    const msg = await this.messagesRepo.create({
      chat_id: chatId,
      direction: 'outbound',
      msg_type: 'text',
      text: answer,
      payload: { ai: true, model },
      provider_message_id: undefined,
      ai_reply: true,
      ai_model: model,
      ai_confidence: confidence,
    } as any);
    await this.chatsRepo.incrementMessageCount(chatId, false);

    // Send via Twilio (from our WhatsApp number to the user)
    const from = fromNumber; // should be E.164 like +1415...
    const to = n.from.phone; // E.164 lead phone
    await this.twilioSender.sendWhatsAppMessage(from, to, answer);

    this.logger.log(
      `AI reply sent: msg_id=${(msg as any)._id} chat_id=${chatId}`,
    );
  }
}
