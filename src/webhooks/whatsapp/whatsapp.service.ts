import { HttpException, Injectable, Logger } from '@nestjs/common';
import { normalizeTwilioWhatsAppPayload } from './whatsapp.helper';
import {
  ChatData,
  NormalizedInboundMessage,
  TwilioWhatsAppWebhookDto,
} from './types';
import { LeadsRepository } from '../../database/repositories/lead.repository';
import { BusinessSocialMediaRepository } from '../../database/repositories/business-social-media.repository';
import { ChatsRepository } from '../../database/repositories/chat.repository';
import { MessagesRepository } from '../../database/repositories/message.repository';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import { badRequest, internal, notFound } from '../../common/http-errors';
import { AiResponderService } from './ai-responder.service';
import { Twilio } from 'twilio';
import { Chat } from '../../database/schemas/chat.schema';
@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);
  private transactionsSupported: boolean | null = null;
  private static readonly SESSION_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day
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
      const info = await this.connection.db.admin().command({ hello: 1 });
      const supported = Boolean(info.setName || info.msg === 'isdbgrid');
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
    session?: ClientSession,
  ): Promise<void> {
    const provider = this.resolveProvider(body);
    const providerUserId = normalized.from.waId || normalized.from.phone;

    // 1) Upsert Lead
    const lead = await this.leadsRepo.upsert(
      { provider, provider_user_id: providerUserId },
      {
        provider,
        provider_user_id: providerUserId,
        display_name: normalized.from.name,
      },
      session,
    );

    // 2) Resolve BusinessSocialMedia by platform + page_id mapped to receiving number
    const toPhone = normalized.to; // E.164
    const bsm = await this.bsmRepo.findByPlatformAndPageId(
      'WHATSAPP',
      toPhone,
      session,
    );
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
      `Resolved BusinessSocialMedia: id=${bsm._id} platform=WHATSAPP page_id=${bsm.page_id}`,
    );

    // 3) Find or create open chat for (lead, bsm)
    let chat = await this.chatsRepo.findOne(
      {
        lead_id: lead._id,
        business_social_media_id: bsm._id,
        status: 'open',
      },
      session,
    );
    if (!chat) {
      chat = await this.chatsRepo.create(
        {
          lead_id: lead._id,
          business_social_media_id: bsm._id,
          status: 'open',
          message_count: 0,
          last_inbound_at: new Date(),
        },
        session,
      );
      this.logger.log(
        `Created chat: id=${chat._id} lead_id=${lead._id} bsm_id=${bsm._id}`,
      );
    } else {
      this.logger.log(
        `Found chat: id=${chat._id} lead_id=${lead._id} bsm_id=${bsm._id}`,
      );
    }

    // 4) Persist message
    const msgType = this.detectMessageType(normalized);
    const createdMsg = await this.messagesRepo.create(
      {
        chat_id: chat._id,
        direction: 'inbound',
        msg_type: msgType,
        text: normalized.body,
        payload: normalized,
        provider_message_id: normalized.messageSid,
        ai_reply: false,
      },
      session,
    );
    this.logger.log(
      `Created message: id=${createdMsg._id} chat_id=${chat._id} type=${msgType}`,
    );

    // 5) Update chat counters and timestamps
    await this.chatsRepo.incrementMessageCount(chat._id, true, session);
    const chatData = this.buildChatData(chat, normalized);

    // Non-blocking AI auto-reply
    try {
      const fromNumber = bsm.page_id || normalized.to;
      this.aiResponder.scheduleAutoReply(
        normalized,
        chat._id,
        this.stripWhatsAppPrefix(fromNumber),
        bsm.business_id,
        chatData,
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

  private buildChatData(
    chat: Chat,
    normalized: NormalizedInboundMessage,
  ): ChatData {
    const data: ChatData = {
      messages_in_session: this.calculateMessagesInSession(chat),
      conversation_duration_minutes:
        this.calculateConversationDurationMinutes(chat),
      user_response_time_avg_seconds: this.calculateResponseTimeSeconds(
        chat,
        normalized,
      ),
      user_initiated_conversation: this.isUserInitiatedConversation(chat),
      time_of_day: this.determineTimeOfDay(normalized),
    };

    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as ChatData;
  }

  private calculateMessagesInSession(chat: Chat): number | undefined {
    if (typeof chat?.message_count !== 'number') return undefined;
    const lastActivity = this.getLastActivityTimestamp(chat);
    if (!lastActivity) return 1;
    if (!this.isWithinSessionWindow(lastActivity)) return 1;
    return chat.message_count + 1;
  }

  private calculateConversationDurationMinutes(chat: Chat): number | undefined {
    const sessionStart = this.getSessionStartTimestamp(chat);
    if (!sessionStart) return 0;
    const diffMs = Date.now() - sessionStart.getTime();
    if (diffMs <= 0) return 0;
    return Math.round(diffMs / 60000);
  }

  private calculateResponseTimeSeconds(
    chat: Chat,
    normalized: NormalizedInboundMessage,
  ): number | undefined {
    if (!chat?.last_outbound_at) return undefined;
    const lastOutbound = new Date(chat.last_outbound_at);
    if (
      Number.isNaN(lastOutbound.getTime()) ||
      !this.isWithinSessionWindow(lastOutbound)
    )
      return undefined;
    const receivedAt = normalized.receivedAt
      ? new Date(normalized.receivedAt)
      : new Date();
    if (Number.isNaN(receivedAt.getTime())) return undefined;
    const diffMs = receivedAt.getTime() - lastOutbound.getTime();
    if (diffMs < 0) return undefined;
    return Math.round(diffMs / 1000);
  }

  private isUserInitiatedConversation(chat: Chat): boolean | undefined {
    const lastInbound = chat?.last_inbound_at
      ? new Date(chat.last_inbound_at)
      : undefined;
    const lastOutbound = chat?.last_outbound_at
      ? new Date(chat.last_outbound_at)
      : undefined;

    if (!lastInbound || Number.isNaN(lastInbound.getTime())) return undefined;
    const inboundRecent = this.isWithinSessionWindow(lastInbound);

    if (!lastOutbound || Number.isNaN(lastOutbound.getTime())) {
      return inboundRecent ? true : undefined;
    }

    const outboundRecent = this.isWithinSessionWindow(lastOutbound);
    if (!inboundRecent && !outboundRecent) return undefined;
    if (!outboundRecent) return inboundRecent ? true : undefined;
    if (!inboundRecent) return undefined;
    return lastInbound.getTime() >= lastOutbound.getTime();
  }

  private determineTimeOfDay(
    normalized: NormalizedInboundMessage,
  ): ChatData['time_of_day'] | undefined {
    const receivedAt = normalized.receivedAt
      ? new Date(normalized.receivedAt)
      : new Date();
    if (Number.isNaN(receivedAt.getTime())) return undefined;
    const hour = receivedAt.getHours();
    return hour >= 9 && hour < 18 ? 'business_hours' : 'off_hours';
  }

  private getLastActivityTimestamp(chat: Chat): Date | undefined {
    const timestamps = [chat?.last_inbound_at, chat?.last_outbound_at]
      .filter((ts): ts is Date => Boolean(ts))
      .map((ts) => new Date(ts));
    const valid = timestamps.filter((date) => !Number.isNaN(date.getTime()));
    if (!valid.length) return undefined;
    const latest = Math.max(...valid.map((date) => date.getTime()));
    return new Date(latest);
  }

  private getSessionStartTimestamp(chat: Chat): Date | undefined {
    const timestamps = [chat?.last_inbound_at, chat?.last_outbound_at]
      .filter((ts): ts is Date => Boolean(ts))
      .map((ts) => new Date(ts))
      .filter(
        (date) =>
          !Number.isNaN(date.getTime()) && this.isWithinSessionWindow(date),
      );
    if (!timestamps.length) return undefined;
    const earliest = Math.min(...timestamps.map((date) => date.getTime()));
    return new Date(earliest);
  }

  private isWithinSessionWindow(date: Date): boolean {
    return (
      Date.now() - date.getTime() <= WhatsappWebhookService.SESSION_WINDOW_MS
    );
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
        to: `whatsapp:212773823618`, // @TODO should be replaced by lead's phone_number
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
