import { Injectable, Logger } from '@nestjs/common';
import { NormalizedInboundMessage } from './types';
import { MessagesRepository } from '../../database/repositories/message.repository';
import { ChatsRepository } from '../../database/repositories/chat.repository';
import { TwilioSenderService } from './twilio.sender';
import { ConfigService } from '@nestjs/config';
import { MlClientService } from '../../clients/ml/ml-client.service';

@Injectable()
export class AiResponderService {
  private readonly logger = new Logger(AiResponderService.name);
  private readonly isMLServiceMocked: boolean;

  constructor(
    private readonly messagesRepo: MessagesRepository,
    private readonly chatsRepo: ChatsRepository,
    private readonly twilioSender: TwilioSenderService,
    private readonly config: ConfigService,
    private readonly mlClient: MlClientService,
  ) {
    this.isMLServiceMocked = !(
      this.config.get<string>('MOCK_ML_SERVICE') === 'false'
    );
    if (this.isMLServiceMocked) this.logger.log('ML service mocked');
  }

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
    if (this.isMLServiceMocked) {
      this.logger.log('ML service mocked; skipping auto-reply');
      return;
    }

    try {
      if (!this.mlClient.isEnabled()) {
        throw new Error('ML client disabled');
      }
      const resp = await this.mlClient.answerChat({
        message: n.body || '',
        provider: n.provider,
        channel: n.channel,
        from: n.from,
        to: n.to,
        context: { chat_id: chatId },
      });
      if (!resp.answer) {
        throw new Error('Empty ML answer');
      }

      // Persist outbound AI message
      const msg = await this.messagesRepo.create({
        chat_id: chatId,
        direction: 'outbound',
        msg_type: 'text',
        text: resp.answer,
        payload: { ai: true, model: resp.model },
        provider_message_id: undefined,
        ai_reply: true,
        ai_model: resp.model,
        ai_confidence: resp.confidence,
      } as any);

      this.logger.log('Msg saved', msg);
      await this.chatsRepo.incrementMessageCount(chatId, false);
      this.logger.log('Chat incremented');

      // Send via Twilio (from our WhatsApp number to the user)
      const from = fromNumber; // should be E.164 like +1415...
      const to = n.from.phone; // E.164 lead phone
      await this.twilioSender.sendWhatsAppMessage(from, to, resp.answer);
      this.logger.log('TWilio message sent');
      this.logger.log(
        `AI reply sent: msg_id=${(msg as any)._id} chat_id=${chatId}`,
      );
    } catch (e) {
      this.logger.warn(`Auto-reply skipped: ${(e as Error).message}`);
    }
  }
}
