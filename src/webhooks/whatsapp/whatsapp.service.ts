import { HttpException, Injectable, Logger } from '@nestjs/common';
import { normalizeTwilioWhatsAppPayload } from './whatsapp.helper';
import { NormalizedInboundMessage, TwilioWhatsAppWebhookDto } from './types';
import { LeadsRepository } from '../../database/repositories/lead.repository';
import { BusinessSocialMediaRepository } from '../../database/repositories/business-social-media.repository';
import { ChatsRepository } from '../../database/repositories/chat.repository';
import { MessagesRepository } from '../../database/repositories/message.repository';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { badRequest, internal, notFound } from '../../common/http-errors';
import { AiResponderService } from './ai-responder.service';
import { Twilio } from 'twilio';
@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);
  private transactionsSupported: boolean | null = null;
  private isStrict(): boolean {
    return (
      (process.env.WEBHOOK_STRICT_ERRORS || 'false').toLowerCase() === 'true'
    );
  }
  private readonly twilioClient: Twilio;

  constructor(
    private readonly leadsRepo: LeadsRepository,
    private readonly bsmRepo: BusinessSocialMediaRepository,
    private readonly chatsRepo: ChatsRepository,
    private readonly messagesRepo: MessagesRepository,
    @InjectConnection() private readonly connection: Connection,
    private readonly aiResponder: AiResponderService,
  ) {
    this.twilioClient = new Twilio(
      process.env.TWILIO_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async processIncoming(
    body: TwilioWhatsAppWebhookDto,
  ): Promise<NormalizedInboundMessage | null> {
    let normalized: NormalizedInboundMessage | null = null;
    try {
      normalized = normalizeTwilioWhatsAppPayload(body);
      if (!normalized) {
        this.logger.warn('Received unsupported or empty WhatsApp payload');
        if (this.isStrict())
          throw badRequest('Unsupported or empty WhatsApp payload');
        return null;
      }

      this.logger.log(
        `Inbound WhatsApp from=${normalized.from.phone} name=${normalized.from.name ?? ''} text=${normalized.body ?? ''} media=${normalized.numMedia}`,
      );

      const canTx = await this.isTransactionSupported();
      if (canTx) {
        const session = await this.connection.startSession();
        try {
          await session.withTransaction(async () => {
            await this.persistInbound(normalized, body, session);
          });
        } finally {
          await session.endSession();
        }
      } else {
        await this.persistInbound(normalized, body);
      }

      return normalized;
    } catch (e) {
      if (e instanceof HttpException) {
        if (this.isStrict()) throw e;
        this.logger.warn(
          `Non-strict mode: ${e.getStatus?.() ?? 'error'} - ${e.message}`,
        );
        return normalized;
      }
      this.logger.error(
        `Failed to process Twilio webhook: ${(e as Error).message}`,
      );
      if (this.isStrict())
        throw internal('Failed to process Twilio webhook', {
          reason: (e as Error).message,
        });
      return normalized;
    }
  }

  private async isTransactionSupported(): Promise<boolean> {
    if (this.transactionsSupported !== null) return this.transactionsSupported;
    try {
      const info = await this.connection.db
        .admin()
        .command({ hello: 1 } as any);
      const supported = Boolean(
        (info as any).setName || (info as any).msg === 'isdbgrid',
      );
      this.transactionsSupported = supported;
      return supported;
    } catch {
      this.transactionsSupported = false;
      return false;
    }
  }

  private async persistInbound(
    normalized: NormalizedInboundMessage,
    body: TwilioWhatsAppWebhookDto,
    session?: any,
  ): Promise<void> {
    const provider = this.resolveProvider(body);
    const providerUserId = normalized.from.waId || normalized.from.phone;

    // 1) Upsert Lead
    const lead = await this.leadsRepo.upsert(
      { provider, provider_user_id: providerUserId } as any,
      {
        provider,
        provider_user_id: providerUserId,
        display_name: normalized.from.name,
      } as any,
      session,
    );

    // 2) Resolve BusinessSocialMedia by platform + page_id mapped to receiving number
    const toPhone = normalized.to; // E.164
    let bsm = await this.bsmRepo.findByPlatformAndPageId(
      'WHATSAPP',
      toPhone,
      session,
    );
    console.log('1- bsm', bsm);
    if (!bsm) {
      const altId = `whatsapp:${toPhone}`;
      bsm = await this.bsmRepo.findByPlatformAndPageId(
        'WHATSAPP',
        altId,
        session,
      );
      console.log('2- bsm', bsm);
    }
    if (!bsm) {
      const noPlus = toPhone?.startsWith('+') ? toPhone.slice(1) : toPhone;
      if (noPlus) {
        bsm = await this.bsmRepo.findByPlatformAndPageId(
          'WHATSAPP',
          noPlus,
          session,
        );
        console.log('3- bsm', bsm);

        if (!bsm) {
          const altNoPlus = `whatsapp:${noPlus}`;
          bsm = await this.bsmRepo.findByPlatformAndPageId(
            'WHATSAPP',
            altNoPlus,
            session,
          );
          console.log('4- bsm', bsm);
        }
      }
    }
    if (!bsm) {
      this.logger.warn(
        `No active BusinessSocialMedia found for platform=WHATSAPP and page_id=${toPhone}. Cannot persist chat/message.`,
      );
      if (this.isStrict()) {
        throw notFound('Active BusinessSocialMedia mapping not found', {
          platform: 'WHATSAPP',
          page_id: toPhone,
        });
      }
      return;
    }
    this.logger.log(
      `Resolved BusinessSocialMedia: id=${(bsm as any)._id} platform=WHATSAPP page_id=${(bsm as any).page_id}`,
    );

    // 3) Find or create open chat for (lead, bsm)
    let chat = await this.chatsRepo.findOne(
      {
        lead_id: (lead as any)._id,
        business_social_media_id: (bsm as any)._id,
        status: 'open',
      } as any,
      session,
    );
    if (!chat) {
      chat = await this.chatsRepo.create(
        {
          lead_id: (lead as any)._id,
          business_social_media_id: (bsm as any)._id,
          status: 'open',
          message_count: 0,
          last_inbound_at: new Date(),
        } as any,
        session,
      );
      this.logger.log(
        `Created chat: id=${(chat as any)._id} lead_id=${(lead as any)._id} bsm_id=${(bsm as any)._id}`,
      );
    } else {
      this.logger.log(
        `Found chat: id=${(chat as any)._id} lead_id=${(lead as any)._id} bsm_id=${(bsm as any)._id}`,
      );
    }

    // 4) Persist message
    const msgType = this.detectMessageType(normalized);
    const createdMsg = await this.messagesRepo.create(
      {
        chat_id: (chat as any)._id,
        direction: 'inbound',
        msg_type: msgType,
        text: normalized.body,
        payload: normalized as any,
        provider_message_id: normalized.messageSid,
        ai_reply: false,
      } as any,
      session,
    );
    this.logger.log(
      `Created message: id=${(createdMsg as any)._id} chat_id=${(chat as any)._id} type=${msgType}`,
    );

    // 5) Update chat counters and timestamps
    await this.chatsRepo.incrementMessageCount(
      (chat as any)._id,
      true,
      session,
    );

    // Non-blocking AI auto-reply
    try {
      const fromNumber = (bsm as any).page_id || normalized.to;
      this.aiResponder.scheduleAutoReply(
        normalized,
        (chat as any)._id,
        this.stripWhatsAppPrefix(fromNumber),
      );
    } catch (e) {
      this.logger.warn(`Failed to schedule AI reply: ${(e as Error).message}`);
    }
  }

  private stripWhatsAppPrefix(v?: string): string {
    if (!v) return '';
    return v.replace(/^whatsapp:/i, '');
  }

  private resolveProvider(body: TwilioWhatsAppWebhookDto): string {
    const meta = (body as any).ChannelMetadata || (body as any).channelMetadata;
    if (meta) {
      try {
        const obj = typeof meta === 'string' ? JSON.parse(meta) : meta;
        const t = obj?.type || obj?.Type;
        if (t) return String(t).toLowerCase();
      } catch {}
    }
    if (
      typeof body.From === 'string' &&
      body.From.toLowerCase().startsWith('whatsapp:')
    )
      return 'whatsapp';
    if ((body as any).WaId) return 'whatsapp';
    return 'unknown';
  }

  private detectMessageType(
    n: NormalizedInboundMessage,
  ):
    | 'text'
    | 'image'
    | 'document'
    | 'audio'
    | 'video'
    | 'sticker'
    | 'location'
    | 'contacts'
    | 'button' {
    if (n.numMedia > 0) {
      const ct = (n.media[0]?.contentType || '').toLowerCase();
      if (ct.startsWith('image/')) return 'image';
      if (ct.startsWith('video/')) return 'video';
      if (ct.startsWith('audio/')) return 'audio';
      return 'document';
    }
    return 'text';
  }
  async sendMessage(payload: { to: string; message: string }) {
    try {
      const { to, message } = payload;
      await this.twilioClient.messages.create({
        from: `whatsapp:${process.env.WHATSAPP_NUMBER}`, // @TODO should be replaced by Buisness's phone_number
        to: `whatsapp:+212773823618`, // @TODO should be replaced by lead's phone_number
        body: message,
      });

      // If you don't have Twilio yet, just log for now
      this.logger.log(`Sending WhatsApp message to ${to}: ${message}`);
      return { sid: 'mock-sid', to, message }; // mock response for testing
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message to ${payload.to}`,
        error,
      );
      throw error;
    }
  }
}
