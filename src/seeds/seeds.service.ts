import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../database/repositories/user.repository';
import { BusinessesRepository } from '../database/repositories/business.repository';
import { BusinessSocialMediaRepository } from '../database/repositories/business-social-media.repository';
import { LeadsRepository } from '../database/repositories/lead.repository';
import { ChatsRepository } from '../database/repositories/chat.repository';
import { MessagesRepository } from '../database/repositories/message.repository';

@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersRepo: UsersRepository,
    private readonly businessesRepo: BusinessesRepository,
    private readonly bsmRepo: BusinessSocialMediaRepository,
    private readonly leadsRepo: LeadsRepository,
    private readonly chatsRepo: ChatsRepository,
    private readonly messagesRepo: MessagesRepository,
  ) {}

  async run(): Promise<void> {
    const userId =
      this.config.get<string>('SEED_USER_ID') ||
      '00000000-0000-4000-8000-000000000001';
    const userEmail =
      this.config.get<string>('SEED_USER_EMAIL') || 'owner@example.com';
    const userName =
      this.config.get<string>('SEED_USER_FULLNAME') || 'Owner User';

    const businessName =
      this.config.get<string>('SEED_BUSINESS_NAME') || 'My Test Business';

    // Twilio WhatsApp receiving number in E.164, e.g. +14155238886
    const whatsappNumber =
      this.config.get<string>('SEED_WHATSAPP_PAGE_ID') || '+14155238886';
    const webhookUrl =
      this.config.get<string>('SEED_WEBHOOK_URL') ||
      'http://localhost:3000/webhooks/whatsapp';

    this.logger.log('Seeding user...');
    const user = await this.usersRepo.upsert(
      { user_id: userId } as any,
      { user_id: userId, email: userEmail, fullname: userName } as any,
    );
    this.logger.log(`User ready: _id=${user._id} user_id=${user.user_id}`);

    this.logger.log('Seeding business...');
    const business = await this.businessesRepo.upsert(
      { name: businessName, user_id: user.user_id } as any,
      { name: businessName, user_id: user.user_id, is_active: true } as any,
    );
    this.logger.log(
      `Business ready: _id=${business._id} name=${business.name}`,
    );

    this.logger.log('Seeding BusinessSocialMedia mapping (WHATSAPP)...');
    const bsm = await this.bsmRepo.upsert(
      {
        business_id: business._id,
        platform: 'WHATSAPP',
        page_id: whatsappNumber,
      } as any,
      {
        business_id: business._id,
        platform: 'WHATSAPP',
        page_id: whatsappNumber,
        page_name: `${business.name} WhatsApp`,
        page_username: undefined,
        page_url: undefined,
        webhook_url: webhookUrl,
        is_verified: false,
        is_active: true,
        sync_frequency_minutes: 60,
      } as any,
    );
    this.logger.log(
      `BSM ready: _id=${bsm._id} platform=${bsm.platform} page_id=${bsm.page_id}`,
    );

    // Optional: seed a demo lead, chat and first message
    const seedLeadProvider =
      this.config.get<string>('SEED_LEAD_PROVIDER') || 'whatsapp';
    const seedLeadProviderUserId =
      this.config.get<string>('SEED_LEAD_PROVIDER_USER_ID') || '212600000000';
    const seedLeadName =
      this.config.get<string>('SEED_LEAD_NAME') || 'Demo Lead';
    const seedMessageText =
      this.config.get<string>('SEED_MESSAGE_TEXT') || 'Hello from seeder';

    this.logger.log('Seeding lead...');
    const lead = await this.leadsRepo.upsert(
      {
        provider: seedLeadProvider,
        provider_user_id: seedLeadProviderUserId,
      } as any,
      {
        provider: seedLeadProvider,
        provider_user_id: seedLeadProviderUserId,
        display_name: seedLeadName,
      } as any,
    );
    this.logger.log(
      `Lead ready: _id=${(lead as any)._id} provider_user_id=${seedLeadProviderUserId}`,
    );

    this.logger.log('Seeding chat...');
    let chat = await this.chatsRepo.findOne({
      lead_id: (lead as any)._id,
      business_social_media_id: (bsm as any)._id,
      status: 'open',
    } as any);
    if (!chat) {
      chat = await this.chatsRepo.create({
        lead_id: (lead as any)._id,
        business_social_media_id: (bsm as any)._id,
        status: 'open',
        message_count: 0,
        last_inbound_at: new Date(),
      } as any);
      this.logger.log(`Chat created: _id=${(chat as any)._id}`);
    } else {
      this.logger.log(`Chat exists: _id=${(chat as any)._id}`);
    }

    this.logger.log('Seeding message...');
    const message = await this.messagesRepo.create({
      chat_id: (chat as any)._id,
      direction: 'inbound',
      msg_type: 'text',
      text: seedMessageText,
      payload: { seeded: true },
      provider_message_id: 'SEED-' + Date.now().toString(36),
      ai_reply: false,
    } as any);
    await this.chatsRepo.incrementMessageCount((chat as any)._id, true);
    this.logger.log(`Message created: _id=${(message as any)._id}`);

    this.logger.log('Seeding done.');
  }
}
