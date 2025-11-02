import { Injectable, NotFoundException } from '@nestjs/common';
import { ChatsRepository } from '../../database/repositories/chat.repository';
import { MessagesRepository } from '../../database/repositories/message.repository';
import { LeadsRepository } from '../../database/repositories/lead.repository';
import { WhatsappWebhookService } from '../whatsapp/whatsapp.service';
import { ChatWithDetails, MessageWithDetails, SendMessageDto } from './types';
import { MessageType } from 'src/database/schemas/message.schema';
import { BusinessSocialMediaRepository } from 'src/database/repositories/business-social-media.repository';
@Injectable()
export class ChatsService {
  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly leadsRepository: LeadsRepository,
    private readonly whatsappService: WhatsappWebhookService,
    private readonly BusinessSocialMediaRepository: BusinessSocialMediaRepository,

  ) {}

  async getAllChats(
    businessId: string,
    query: { status?: string; page?: number; limit?: number; search?: string },
  ): Promise<{
    chats: ChatWithDetails[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status = 'open', page = 1, limit = 20, search } = query;

    // First, find all business_social_media_ids for this business
    const businessSocialMedias =
      await this.BusinessSocialMediaRepository.findMany({
        business_id: businessId,
        is_active: true, // Optional: only get active social media accounts
      });

    if (businessSocialMedias.length === 0) {
      return {
        chats: [],
        total: 0,
        page,
        limit,
      };
    }

    const businessSocialMediaIds = businessSocialMedias.map(
      (bsm) => (bsm as any)._id,
    );

    // Build filter
    const filter: any = {
      status,
      business_social_media_id: { $in: businessSocialMediaIds },
    };

    // If search provided, find leads first
    if (search) {
      const leads = await this.leadsRepository.findMany({
        $or: [
          { display_name: { $regex: search, $options: 'i' } },
          { provider_user_id: { $regex: search, $options: 'i' } },
        ],
      });
      const leadIds = leads.map((lead) => (lead as any)._id);
      filter.lead_id = { $in: leadIds };
    }

    // Get chats with pagination
    const skip = (page - 1) * limit;
    const chats = await this.chatsRepository.findMany(filter, {
      sort: { last_inbound_at: -1, created_at: -1 },
      limit,
      skip,
    });

    const total = await this.chatsRepository.count(filter);

    // Enrich chats with lead info and last message
    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        const lead = await this.leadsRepository.findById((chat as any).lead_id);
        const messages = await this.messagesRepository.findByChat(
          (chat as any)._id,
          1,
        );
        const lastMessage = messages[0];

        const chatResponse: any = {
          _id: (chat as any)._id,
          lead_id: (chat as any).lead_id,
          lead_name: lead?.display_name,
          lead_phone: lead?.provider_user_id,
          business_social_media_id: (chat as any).business_social_media_id,
          status: (chat as any).status,
          running_summary: (chat as any).running_summary,
          last_inbound_at: (chat as any).last_inbound_at,
          last_outbound_at: (chat as any).last_outbound_at,
          message_count: (chat as any).message_count,
          last_message: lastMessage
            ? {
                text: (lastMessage as any).text,
                direction: (lastMessage as any).direction,
                msg_type: (lastMessage as any).msg_type,
                created_at: (lastMessage as any).created_at,
              }
            : undefined,
          created_at: (chat as any).created_at,
          updated_at: (chat as any).updated_at,
        };

        // Only include lead_score if it exists
        if (lead?.score) {
          chatResponse.lead_score = lead.score;
        }

        return chatResponse as ChatWithDetails;
      }),
    );

    return {
      chats: enrichedChats,
      total,
      page,
      limit,
    };
  }

  async getChatById(chatId: string): Promise<ChatWithDetails> {
    const chat = await this.chatsRepository.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const lead = await this.leadsRepository.findById((chat as any).lead_id);
    const messages = await this.messagesRepository.findByChat(
      (chat as any)._id,
      1,
    );
    const lastMessage = messages[0];

    const chatResponse: any = {
      _id: (chat as any)._id,
      lead_id: (chat as any).lead_id,
      lead_name: lead?.display_name,
      lead_phone: lead?.provider_user_id,
      business_social_media_id: (chat as any).business_social_media_id,
      status: (chat as any).status,
      running_summary: (chat as any).running_summary,
      last_inbound_at: (chat as any).last_inbound_at,
      last_outbound_at: (chat as any).last_outbound_at,
      message_count: (chat as any).message_count,
      last_message: lastMessage
        ? {
            text: (lastMessage as any).text,
            direction: (lastMessage as any).direction,
            msg_type: (lastMessage as any).msg_type,
            created_at: (lastMessage as any).created_at,
          }
        : undefined,
      created_at: (chat as any).created_at,
      updated_at: (chat as any).updated_at,
    };

    // Only include lead_score if it exists
    if (lead?.score) {
      chatResponse.lead_score = lead.score;
    }

    return chatResponse as ChatWithDetails;
  }

  async getMessagesByChatId(
    chatId: string,
    limit = 50,
  ): Promise<MessageWithDetails[]> {
    const chat = await this.chatsRepository.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const messages = await this.messagesRepository.findByChat(chatId, limit);

    return messages.map((msg) => ({
      _id: (msg as any)._id,
      chat_id: (msg as any).chat_id,
      direction: (msg as any).direction,
      msg_type: (msg as any).msg_type,
      text: (msg as any).text,
      payload: (msg as any).payload,
      provider_message_id: (msg as any).provider_message_id,
      ai_reply: (msg as any).ai_reply,
      ai_model: (msg as any).ai_model,
      ai_confidence: (msg as any).ai_confidence,
      campaign_id: (msg as any).campaign_id,
      created_at: (msg as any).created_at,
    }));
  }

  async sendMessage(dto: SendMessageDto): Promise<MessageWithDetails> {
    const chat = await this.chatsRepository.findById(dto.chat_id);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Get lead info
    const lead = await this.leadsRepository.findById((chat as any).lead_id);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Send via WhatsApp
    await this.whatsappService.sendMessage({
      to: (lead as any).provider_user_id,
      message: dto.text,
    });

    // Store message
    const message = await this.messagesRepository.create({
      chat_id: dto.chat_id,
      direction: 'outbound',
      msg_type: (dto.msg_type || 'text') as MessageType, // ✅ Fix here
      text: dto.text,
      ai_reply: false,
    });

    // Update chat
    await this.chatsRepository.incrementMessageCount(dto.chat_id, false);

    return {
      _id: (message as any)._id,
      chat_id: (message as any).chat_id,
      direction: (message as any).direction,
      msg_type: (message as any).msg_type,
      text: (message as any).text,
      payload: (message as any).payload,
      provider_message_id: (message as any).provider_message_id,
      ai_reply: (message as any).ai_reply,
      created_at: (message as any).created_at,
    };
  }

  async updateChatStatus(chatId: string, status: string): Promise<void> {
    await this.chatsRepository.updateById(chatId, { status });
  }
}
